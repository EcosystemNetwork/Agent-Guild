import type {
  MissionExecution,
  MissionLaunchRequest,
  MissionTranscriptEntry,
  ToolAction,
  OperatorAction,
} from '../types'
import {
  streamAgentRun,
  invokeToolAction,
  fetchAgentRecord,
  persistMission,
  persistTranscript,
} from './gateway'
import { launchVoiceCall } from './bland'
import type { ChatCompletionMessage, AgentRecord, AgentRunEvent } from './gateway'

type MissionListener = (mission: MissionExecution) => void

const activeMissions = new Map<string, MissionExecution>()
const listeners = new Map<string, Set<MissionListener>>()
const abortControllers = new Map<string, AbortController>()

// Cache agent records so we don't fetch on every operation
const agentCache = new Map<string, AgentRecord>()

let missionCounter = 2848

function notify(missionId: string) {
  const mission = activeMissions.get(missionId)
  if (!mission) return
  const subs = listeners.get(missionId)
  subs?.forEach(fn => fn({ ...mission }))
  const global = listeners.get('*')
  global?.forEach(fn => fn({ ...mission }))
}

function addTranscript(missionId: string, entry: Omit<MissionTranscriptEntry, 'id' | 'timestamp'>) {
  const mission = activeMissions.get(missionId)
  if (!mission) return
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  mission.transcript.push({
    ...entry,
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
  })
  notify(missionId)
  // Persist transcript entry to backend (fire-and-forget)
  persistTranscript(missionId, entry)
}

async function resolveAgent(agentId: string): Promise<AgentRecord | null> {
  const cached = agentCache.get(agentId)
  if (cached) return cached
  const record = await fetchAgentRecord(agentId)
  if (record) agentCache.set(agentId, record)
  return record
}

export function subscribe(missionId: string, listener: MissionListener): () => void {
  if (!listeners.has(missionId)) listeners.set(missionId, new Set())
  listeners.get(missionId)!.add(listener)
  return () => { listeners.get(missionId)?.delete(listener) }
}

export function getMission(missionId: string): MissionExecution | undefined {
  const m = activeMissions.get(missionId)
  return m ? { ...m } : undefined
}

export function getAllExecutions(): MissionExecution[] {
  return Array.from(activeMissions.values()).map(m => ({ ...m }))
}

export function launchMission(request: MissionLaunchRequest): MissionExecution {
  const id = `MSN-${missionCounter++}`
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  const sessionKey = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const mission: MissionExecution = {
    id,
    name: request.name,
    type: request.type,
    status: request.requiresApproval ? 'awaiting-approval' : 'approved',
    assignedAgentId: request.agentId,
    agentRecordId: request.agentId,
    sessionKey,
    prompt: request.prompt,
    context: request.context,
    priority: request.priority,
    requiresApproval: request.requiresApproval,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    progress: 0,
    transcript: [],
    toolActions: [],
    error: null,
  }

  activeMissions.set(id, mission)

  // Persist mission to backend
  persistMission({
    id: mission.id,
    name: mission.name,
    type: mission.type,
    status: mission.status,
    assignedAgentId: mission.assignedAgentId,
    sessionKey: mission.sessionKey,
    prompt: mission.prompt,
    context: mission.context,
    priority: mission.priority,
  })

  addTranscript(id, {
    role: 'system',
    agentName: 'SYSTEM',
    content: `Mission ${id} created — type: ${request.type}, agent: ${request.agentId}, priority: ${request.priority}`,
  })

  if (!request.requiresApproval) {
    startExecution(id)
  }

  return { ...mission }
}

export function approveMission(missionId: string) {
  const mission = activeMissions.get(missionId)
  if (!mission || mission.status !== 'awaiting-approval') return
  mission.status = 'approved'
  addTranscript(missionId, {
    role: 'operator',
    agentName: 'Commander Kai',
    content: 'Mission approved. Initiating execution sequence.',
  })
  startExecution(missionId)
}

export function handleOperatorAction(missionId: string, action: OperatorAction) {
  const mission = activeMissions.get(missionId)
  if (!mission) return

  switch (action) {
    case 'stop': {
      const controller = abortControllers.get(missionId)
      controller?.abort()
      mission.status = 'cancelled'
      mission.completedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      addTranscript(missionId, {
        role: 'operator',
        agentName: 'Commander Kai',
        content: 'Mission stopped by operator.',
      })
      persistMission({ ...mission })
      break
    }
    case 'retry': {
      if (mission.status === 'failed' || mission.status === 'cancelled') {
        mission.status = 'approved'
        mission.progress = 0
        mission.error = null
        mission.completedAt = null
        addTranscript(missionId, {
          role: 'operator',
          agentName: 'Commander Kai',
          content: 'Mission retry initiated by operator.',
        })
        startExecution(missionId)
      }
      break
    }
    case 'fork': {
      const forked = launchMission({
        name: `${mission.name} (Fork)`,
        type: mission.type,
        agentId: mission.assignedAgentId,
        prompt: mission.prompt,
        context: mission.context + '\n\n[Forked from ' + missionId + ']',
        priority: mission.priority,
        requiresApproval: false,
      })
      addTranscript(missionId, {
        role: 'system',
        agentName: 'SYSTEM',
        content: `Mission forked → new mission ${forked.id}`,
      })
      break
    }
    case 'escalate': {
      mission.status = 'paused'
      addTranscript(missionId, {
        role: 'operator',
        agentName: 'Commander Kai',
        content: 'Mission escalated to human review. Execution paused.',
      })
      persistMission({ ...mission })
      notify(missionId)
      break
    }
    case 'call': {
      addTranscript(missionId, {
        role: 'operator',
        agentName: 'Commander Kai',
        content: `Voice escalation initiated for mission ${missionId}. Launching outbound call...`,
      })
      launchVoiceCall({
        phoneNumber: '+15550001234',
        missionId,
        channelId: `exec-${missionId}`,
        requestData: {
          mission_name: mission.name,
          objective: mission.prompt,
          status: mission.status,
          context: mission.context,
        },
      }).then(call => {
        addTranscript(missionId, {
          role: 'system',
          agentName: 'BLAND',
          content: `Call ${call.id} queued → ${call.phoneNumber}. Status: ${call.status}`,
        })
      })
      break
    }
  }
}

export async function executeToolAction(
  missionId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<ToolAction> {
  const mission = activeMissions.get(missionId)
  if (!mission) throw new Error(`Mission ${missionId} not found`)

  const pendingAction: ToolAction = {
    id: `tool-${Date.now()}`,
    toolName,
    input,
    output: null,
    status: 'running',
    startedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    completedAt: null,
    error: null,
  }
  mission.toolActions.push(pendingAction)

  addTranscript(missionId, {
    role: 'tool',
    agentName: toolName,
    content: `Invoking tool: ${toolName} with input: ${JSON.stringify(input)}`,
  })

  // Call the real backend tool execution endpoint
  const result = await invokeToolAction(mission.assignedAgentId, toolName, input, missionId)

  const idx = mission.toolActions.findIndex(a => a.id === pendingAction.id)
  if (idx >= 0) mission.toolActions[idx] = result

  addTranscript(missionId, {
    role: 'tool',
    agentName: toolName,
    content: result.status === 'success'
      ? `Tool completed: ${result.output}`
      : `Tool failed: ${result.error}`,
  })

  return result
}

async function startExecution(missionId: string) {
  const mission = activeMissions.get(missionId)
  if (!mission) return

  const controller = new AbortController()
  abortControllers.set(missionId, controller)

  // Resolve real agent record from backend
  const agentRecord = await resolveAgent(mission.assignedAgentId)

  mission.status = 'running'
  mission.startedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  mission.progress = 5

  // Persist running state
  persistMission({
    id: mission.id,
    name: mission.name,
    type: mission.type,
    status: mission.status,
    assignedAgentId: mission.assignedAgentId,
    sessionKey: mission.sessionKey,
    prompt: mission.prompt,
    context: mission.context,
    priority: mission.priority,
    startedAt: mission.startedAt,
  })

  const agentDisplayName = agentRecord?.displayName ?? mission.assignedAgentId

  addTranscript(missionId, {
    role: 'system',
    agentName: 'SYSTEM',
    content: `Execution started. Session: ${mission.sessionKey}. Agent: ${agentDisplayName} (model: ${agentRecord?.modelId ?? 'default'})`,
  })

  try {
    // Build system prompt from agent record (real) or fallback (generic)
    const systemPrompt = agentRecord?.systemPrompt
      ?? `You are ${mission.assignedAgentId}, an AI agent in the Agent Guild. Mission type: ${mission.type}. Context: ${mission.context}`

    const toolInstruction = mission.type === 'execute-tool'
      ? '\n\nYou have tools available. Use them to gather real data before answering. Always call at least one tool to support your analysis.'
      : ''

    const messages: ChatCompletionMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nMission: ${mission.name}\nType: ${mission.type}\nPriority: ${mission.priority}\nContext: ${mission.context}${toolInstruction}`,
      },
      { role: 'user', content: mission.prompt },
    ]

    let accumulated = ''
    let toolCallCount = 0
    mission.progress = 15

    addTranscript(missionId, {
      role: 'agent',
      agentName: agentDisplayName,
      content: '[Processing...]',
    })

    // Stream through TrueFoundry with function-calling support
    // The server handles the tool-calling loop — we receive content + tool events
    for await (const event of streamAgentRun(mission.assignedAgentId, mission.sessionKey, messages, missionId) as AsyncGenerator<AgentRunEvent>) {
      if (controller.signal.aborted) return

      switch (event.type) {
        case 'content': {
          accumulated += event.content
          const lastEntry = mission.transcript[mission.transcript.length - 1]
          if (lastEntry && lastEntry.role === 'agent') {
            lastEntry.content = accumulated
            lastEntry.tokenCount = accumulated.split(' ').length
          }
          mission.progress = Math.min(85, 15 + Math.floor((accumulated.length / 500) * 70))
          notify(missionId)
          break
        }
        case 'tool_start': {
          toolCallCount++
          addTranscript(missionId, {
            role: 'tool',
            agentName: event.toolName,
            content: `Invoking tool: ${event.toolName} with input: ${JSON.stringify(event.input)}`,
          })
          mission.progress = Math.min(92, 85 + toolCallCount * 3)
          notify(missionId)
          break
        }
        case 'tool_result': {
          const toolAction: ToolAction = {
            id: `tool-${Date.now()}`,
            toolName: event.toolName,
            input: {},
            output: event.output,
            status: event.status === 'success' ? 'success' : 'failure',
            startedAt: new Date(Date.now() - event.durationMs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            completedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            error: event.error,
          }
          mission.toolActions.push(toolAction)

          addTranscript(missionId, {
            role: 'tool',
            agentName: event.toolName,
            content: event.status === 'success'
              ? `Tool completed (${event.durationMs}ms): ${event.output?.slice(0, 200)}${(event.output?.length ?? 0) > 200 ? '...' : ''}`
              : `Tool failed: ${event.error}`,
          })
          notify(missionId)
          break
        }
      }
    }

    if (controller.signal.aborted) return

    // Persist the final agent response transcript
    persistTranscript(missionId, {
      role: 'agent',
      agentName: agentDisplayName,
      content: accumulated,
      tokenCount: accumulated.split(' ').length,
    })

    mission.status = 'completed'
    mission.progress = 100
    mission.completedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    addTranscript(missionId, {
      role: 'system',
      agentName: 'SYSTEM',
      content: `Mission ${missionId} completed successfully. Tools invoked: ${toolCallCount}.`,
    })

    // Persist final state
    persistMission({
      id: mission.id,
      name: mission.name,
      type: mission.type,
      status: mission.status,
      assignedAgentId: mission.assignedAgentId,
      sessionKey: mission.sessionKey,
      prompt: mission.prompt,
      context: mission.context,
      priority: mission.priority,
      startedAt: mission.startedAt,
      completedAt: mission.completedAt,
      progress: mission.progress,
    })
  } catch (err) {
    if (controller.signal.aborted) return
    mission.status = 'failed'
    mission.error = err instanceof Error ? err.message : 'Unknown error'
    mission.completedAt = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    addTranscript(missionId, {
      role: 'system',
      agentName: 'SYSTEM',
      content: `Mission ${missionId} failed: ${mission.error}`,
    })

    persistMission({
      id: mission.id,
      name: mission.name,
      type: mission.type,
      status: mission.status,
      assignedAgentId: mission.assignedAgentId,
      sessionKey: mission.sessionKey,
      prompt: mission.prompt,
      context: mission.context,
      priority: mission.priority,
      startedAt: mission.startedAt,
      completedAt: mission.completedAt,
      error: mission.error,
    })
  } finally {
    abortControllers.delete(missionId)
  }
}
