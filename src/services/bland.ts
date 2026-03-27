import type { VoiceCall, VoiceCallLaunchRequest, CallStatus } from '../types'

type CallListener = (call: VoiceCall) => void

const activeCalls = new Map<string, VoiceCall>()
const listeners = new Set<CallListener>()
const pollingTimers = new Map<string, ReturnType<typeof setInterval>>()

let callCounter = 1

function notify(call: VoiceCall) {
  listeners.forEach(fn => fn({ ...call }))
}

export function subscribeToVoiceCalls(listener: CallListener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getAllVoiceCalls(): VoiceCall[] {
  return Array.from(activeCalls.values()).map(c => ({ ...c }))
}

export function getVoiceCall(id: string): VoiceCall | undefined {
  const c = activeCalls.get(id)
  return c ? { ...c } : undefined
}

export function getCallsForChannel(channelId: string): VoiceCall[] {
  return Array.from(activeCalls.values())
    .filter(c => c.channelId === channelId)
    .map(c => ({ ...c }))
}

export async function launchVoiceCall(request: VoiceCallLaunchRequest): Promise<VoiceCall> {
  const id = `CALL-${Date.now()}-${callCounter++}`
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const call: VoiceCall = {
    id,
    callId: null,
    phoneNumber: request.phoneNumber,
    status: 'queued',
    missionId: request.missionId ?? null,
    channelId: request.channelId,
    launchedBy: 'Commander Kai',
    launchedAt: now,
    completedAt: null,
    duration: null,
    summary: null,
    transcript: null,
    recordingUrl: null,
    pathwayId: request.pathwayId ?? null,
    requestData: request.requestData ?? {},
    error: null,
  }

  activeCalls.set(id, call)
  notify(call)

  // Try real API first, fall back to simulation
  try {
    const resp = await fetch('/api/voice/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: request.phoneNumber,
        pathway_id: request.pathwayId,
        request_data: {
          ...request.requestData,
          mission_id: request.missionId,
          channel_id: request.channelId,
          guild_call_id: id,
        },
      }),
    })

    if (resp.ok) {
      const data = await resp.json()
      call.callId = data.call_id ?? null
      call.status = 'ringing'
      notify(call)
      // Start polling for real call completion details
      startCallPolling(id)
      return { ...call }
    }

    // API not available — run simulation
    simulateCall(id)
  } catch {
    simulateCall(id)
  }

  return { ...call }
}

export function handleWebhookEvent(event: {
  call_id?: string
  guild_call_id?: string
  status?: string
  completed?: boolean
  call_length?: number
  summary?: string
  concatenated_transcript?: string
  recording_url?: string
  error_message?: string
}) {
  let call: VoiceCall | undefined
  for (const c of activeCalls.values()) {
    if ((event.call_id && c.callId === event.call_id) ||
        (event.guild_call_id && c.id === event.guild_call_id)) {
      call = c
      break
    }
  }
  if (!call) return

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (event.status) {
    const statusMap: Record<string, CallStatus> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'failed': 'failed',
      'no-answer': 'no-answer',
    }
    call.status = statusMap[event.status] ?? call.status
  }

  if (event.completed) {
    call.status = event.error_message ? 'failed' : 'completed'
    call.completedAt = now
  }

  if (event.call_length != null) call.duration = event.call_length
  if (event.summary) call.summary = event.summary
  if (event.concatenated_transcript) call.transcript = event.concatenated_transcript
  if (event.recording_url) call.recordingUrl = event.recording_url
  if (event.error_message) call.error = event.error_message

  notify(call)
}

// ── Real Bland call polling — fetches post-call details until terminal state ──

function startCallPolling(callId: string) {
  // Poll every 3 seconds for call status updates
  const timer = setInterval(async () => {
    const call = activeCalls.get(callId)
    if (!call) {
      stopCallPolling(callId)
      return
    }

    try {
      const resp = await fetch(`/api/voice/call/${encodeURIComponent(call.callId || callId)}`)
      if (!resp.ok) return

      const data = await resp.json()
      const details = data.call || data.bland

      if (!details) return

      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

      // Map Bland status to our CallStatus
      if (details.status) {
        const statusMap: Record<string, CallStatus> = {
          'queued': 'queued',
          'ringing': 'ringing',
          'in-progress': 'in-progress',
          'completed': 'completed',
          'failed': 'failed',
          'no-answer': 'no-answer',
        }
        const mapped = statusMap[details.status]
        if (mapped && mapped !== call.status) {
          call.status = mapped
        }
      }

      if (details.completed || details.status === 'completed') {
        call.status = details.error_message ? 'failed' : 'completed'
        call.completedAt = call.completedAt || now
      }

      if (details.call_length != null || details.duration != null) {
        call.duration = details.call_length ?? details.duration
      }
      if (details.summary) call.summary = details.summary
      if (details.concatenated_transcript || details.transcript) {
        call.transcript = details.concatenated_transcript || details.transcript
      }
      if (details.recording_url || details.recordingUrl) {
        call.recordingUrl = details.recording_url || details.recordingUrl
      }
      if (details.error_message || details.error) {
        call.error = details.error_message || details.error
      }

      notify(call)

      // Stop polling once call reaches terminal state
      if (call.status === 'completed' || call.status === 'failed' || call.status === 'no-answer') {
        stopCallPolling(callId)
      }
    } catch {
      // Silently retry on next interval
    }
  }, 3000)

  pollingTimers.set(callId, timer)

  // Safety: stop polling after 10 minutes max
  setTimeout(() => stopCallPolling(callId), 10 * 60 * 1000)
}

function stopCallPolling(callId: string) {
  const timer = pollingTimers.get(callId)
  if (timer) {
    clearInterval(timer)
    pollingTimers.delete(callId)
  }
}

// ── Fetch post-call details on demand ──

export async function fetchCallDetails(callId: string): Promise<VoiceCall | null> {
  const call = activeCalls.get(callId)
  if (!call) return null

  try {
    const resp = await fetch(`/api/voice/call/${encodeURIComponent(call.callId || callId)}`)
    if (!resp.ok) return { ...call }

    const data = await resp.json()
    const details = data.call || data.bland

    if (details) {
      if (details.summary) call.summary = details.summary
      if (details.concatenated_transcript || details.transcript) {
        call.transcript = details.concatenated_transcript || details.transcript
      }
      if (details.recording_url || details.recordingUrl) {
        call.recordingUrl = details.recording_url || details.recordingUrl
      }
      if (details.call_length != null || details.duration != null) {
        call.duration = details.call_length ?? details.duration
      }
      notify(call)
    }

    return { ...call }
  } catch {
    return { ...call }
  }
}

// ── Simulation for demo without live Bland API ──

async function simulateCall(callId: string) {
  const call = activeCalls.get(callId)
  if (!call) return

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  await sleep(800)
  call.status = 'ringing'
  call.callId = `sim-${Date.now()}`
  notify(call)

  await sleep(2000)
  call.status = 'in-progress'
  notify(call)

  await sleep(4000 + Math.random() * 3000)

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  call.status = 'completed'
  call.completedAt = now
  call.duration = Math.floor(45 + Math.random() * 120)
  call.summary = buildSimulatedSummary(call)
  call.transcript = buildSimulatedTranscript(call)
  notify(call)
}

function buildSimulatedSummary(call: VoiceCall): string {
  if (call.missionId) {
    return `[SIMULATED] Outbound escalation call for ${call.missionId}. Contact confirmed receipt of mission briefing. Key actions agreed: (1) Escalation acknowledged and logged, (2) Response team notified and en route, (3) Follow-up scheduled in 30 minutes. Contact requested written summary via secure channel.`
  }
  return `[SIMULATED] Outbound call completed to ${call.phoneNumber}. Contact reached and briefed on current guild operational status. No immediate action items identified. Contact confirmed availability for follow-up if situation escalates.`
}

function buildSimulatedTranscript(call: VoiceCall): string {
  const mission = call.missionId ? ` regarding mission ${call.missionId}` : ''
  return [
    `[SIMULATED TRANSCRIPT]`,
    `[Agent]: Hello, this is an automated call from Agent Guild${mission}. Am I speaking with the designated escalation contact?`,
    `[Contact]: Yes, this is the right number. What's the situation?`,
    `[Agent]: We've detected elevated threat activity requiring immediate attention. Our agents have identified anomalous patterns that warrant human coordination.`,
    `[Contact]: Understood. What do you need from me?`,
    `[Agent]: We need confirmation that your response team has been notified and can be on standby for the next 2-hour window.`,
    `[Contact]: Confirmed. I'll notify the team now and have them on standby. Send me a written summary to the secure channel.`,
    `[Agent]: Copy that. Summary will be dispatched immediately. We'll follow up in 30 minutes with an updated assessment.`,
    `[Contact]: Acknowledged. Anything else?`,
    `[Agent]: That's all for now. Thank you for the quick response. Ending call.`,
  ].join('\n')
}