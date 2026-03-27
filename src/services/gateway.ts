import type { ToolAction } from '../types'

export interface GatewayConfig {
  baseUrl: string
  token: string
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamChunk {
  id: string
  choices: { delta: { content?: string; role?: string }; finish_reason: string | null }[]
}

const DEFAULT_CONFIG: GatewayConfig = {
  baseUrl: '/api/gateway',
  token: '',
}

let config: GatewayConfig = { ...DEFAULT_CONFIG }

export function configureGateway(cfg: Partial<GatewayConfig>) {
  config = { ...config, ...cfg }
}

export async function* streamChatCompletion(
  _agentId: string,
  _sessionKey: string,
  messages: ChatCompletionMessage[],
): AsyncGenerator<string, void, unknown> {
  // In production, this calls OpenClaw POST /v1/chat/completions with stream: true
  // For now, simulate SSE streaming with mock responses
  const response = buildMockResponse(messages)
  const words = response.split(' ')

  for (const word of words) {
    await sleep(40 + Math.random() * 60)
    yield word + ' '
  }
}

export async function invokeToolAction(
  _agentId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<ToolAction> {
  // In production: POST /tools/invoke with gateway auth + tool policy enforcement
  await sleep(800 + Math.random() * 1200)

  const success = Math.random() > 0.15
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return {
    id: `tool-${Date.now()}`,
    toolName,
    input,
    output: success ? buildMockToolOutput(toolName, input) : null,
    status: success ? 'success' : 'failure',
    startedAt: now,
    completedAt: now,
    error: success ? null : `Tool execution failed: ${toolName} returned non-zero exit code`,
  }
}

function buildMockResponse(messages: ChatCompletionMessage[]): string {
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? ''

  if (lastMsg.includes('research') || lastMsg.includes('investigate')) {
    return 'Analysis initiated. Scanning target vectors across three primary zones. Preliminary findings indicate anomalous activity on ports 8443-8447. Cross-referencing with historical threat data reveals a 73% pattern match with known polymorphic tunneling protocols. Recommend deeper analysis of source relay infrastructure before proceeding to active countermeasures. Confidence level: HIGH.'
  }
  if (lastMsg.includes('summarize') || lastMsg.includes('summary')) {
    return 'Executive summary: The current threat landscape shows elevated risk across sectors 4-B and 7-G. Key findings include: (1) Polymorphic tunnel detected on perimeter nodes, (2) Three compromised service accounts identified and rotated, (3) Traffic anomalies correlating with Syndicate Omega communication patterns. Recommended action: maintain heightened posture for the next 6-hour window and increase recon sweep cadence.'
  }
  if (lastMsg.includes('plan') || lastMsg.includes('strategy')) {
    return 'Operational plan generated. Phase 1: Deploy passive probes to compromised nodes (ETA: 15min). Phase 2: Capture and analyze traffic samples while maintaining zero-footprint protocol (ETA: 45min). Phase 3: Cross-reference findings with intel database and generate threat classification report (ETA: 20min). Phase 4: Brief command with actionable recommendations. Total estimated runtime: 1h 20min. Risk assessment: MODERATE.'
  }
  return 'Mission objective acknowledged. Deploying analysis protocols across target infrastructure. Initial telemetry indicates nominal system status with elevated threat indicators in the eastern perimeter zone. Monitoring continues. Will report findings at 15-minute intervals or immediately upon detection of critical anomalies.'
}

function buildMockToolOutput(toolName: string, input: Record<string, unknown>): string {
  const outputs: Record<string, string> = {
    'network-scan': `Scan complete. 47 active hosts detected. 3 flagged for anomalous behavior: ${JSON.stringify(input.targets ?? ['10.0.4.12', '10.0.4.15', '10.0.7.22'])}`,
    'threat-classify': 'Classification: POLYMORPHIC_TUNNEL (confidence: 89%). Signature matches Syndicate Omega TTP database entry #2847.',
    'credential-rotate': 'Credentials rotated successfully. 12 service accounts updated. New keys distributed to authorized nodes.',
    'firewall-update': 'Firewall rules applied. 3 new block rules added. 2 deprecated rules purged.',
    'log-export': 'Exported 2,847 log entries to secure archive. Hash verification: PASSED.',
  }
  return outputs[toolName] ?? `Tool "${toolName}" executed successfully. Output: ${JSON.stringify(input)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
