import { useState, useRef, useEffect, useCallback } from 'react'
import { useData } from '../contexts/DataContext'
import type { ChatMessage } from '../types'
import { cn, agentStatusColor, executionStatusColor, missionTypeColor } from '../lib/utils'
import { streamMessage, checkGatewayHealth } from '../lib/api'
import type { ChatCompletionMessage } from '../lib/api'
import {
  deriveSessionKey,
  resetSessionKey,
  resolveAgentId,
  saveSessionMeta,
  clearSessionMeta,
  loadSessionMeta,
} from '../api/session'
import { useMissions } from '../contexts/MissionContext'
import { useAirbyte } from '../contexts/AirbyteContext'
import { launchVoiceCall, subscribeToVoiceCalls, getCallsForChannel, fetchCallDetails } from '../services/bland'
import type { VoiceCall } from '../types'
import PageHeader from '../components/ui/PageHeader'
import GlassPanel from '../components/ui/GlassPanel'
import ProgressBar from '../components/ui/ProgressBar'
import StatusChip from '../components/ui/StatusChip'
import Icon from '../components/ui/Icon'

const callStatusColor: Record<string, string> = {
  'queued': '#94A3B8',
  'ringing': '#F59E0B',
  'in-progress': '#10B981',
  'completed': '#10B981',
  'failed': '#F43F5E',
  'no-answer': '#F59E0B',
}

const callStatusIcon: Record<string, string> = {
  'queued': 'hourglass_top',
  'ringing': 'ring_volume',
  'in-progress': 'call',
  'completed': 'call_end',
  'failed': 'call_missed',
  'no-answer': 'phone_missed',
}

const agentAvatarColor: Record<string, string> = {
  'CIPHER-7': '#10B981',
  'PULSE': '#F59E0B',
  'NOVA-3': '#10B981',
  'SENTINEL-12': '#F59E0B',
  'ECHO-9': '#4cd7f6',
  'WRAITH-5': '#10B981',
  'ORACLE-1': '#10B981',
  'SYSTEM': '#F43F5E',
  'Commander Kai': '#863bff',
  'AGENT': '#4cd7f6',
}

export default function CommsPage() {
  const { agents, channels, chatMessages, missionContext } = useData()
  const { executions } = useMissions()
  const { getMissionContext: getAirbyteContext, triggerMissionSync } = useAirbyte()
  const [activeChannel, setActiveChannel] = useState('general')
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<Record<string, ChatMessage[]>>({})
  const [showPinned, setShowPinned] = useState(false)
  const [showContext, setShowContext] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<'unknown' | 'ok' | 'offline'>('unknown')
  // Per-channel session keys: mission threads, agent DMs, and team channels each get isolated keys
  const [sessionKeys, setSessionKeys] = useState<Record<string, string>>({})

  // Sync local messages and session keys when backend data loads
  useEffect(() => {
    if (Object.keys(chatMessages).length > 0 && Object.keys(localMessages).length === 0) {
      setLocalMessages(chatMessages)
    }
  }, [chatMessages]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (channels.length > 0 && Object.keys(sessionKeys).length === 0) {
      const stored = loadSessionMeta()
      const keys: Record<string, string> = {}
      for (const ch of channels) {
        keys[ch.id] = stored[ch.id]?.sessionKey || deriveSessionKey(ch)
      }
      setSessionKeys(keys)
    }
  }, [channels]) // eslint-disable-line react-hooks/exhaustive-deps
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isExecChannel = activeChannel.startsWith('exec-')
  const execId = isExecChannel ? activeChannel.replace('exec-', '') : null
  const activeExecution = execId ? executions.find(e => e.id === execId) : null
  const channel = channels.find(c => c.id === activeChannel) ?? channels[0]
  const messages = isExecChannel ? [] : (localMessages[activeChannel] || [])
  const pinnedMessages = messages.filter(m => m.pinned)
  const context = !isExecChannel && channel.missionId ? missionContext[channel.missionId] : null
  const airbyteContexts = !isExecChannel && channel.missionId ? getAirbyteContext(channel.missionId) : []
  const hasAirbyteContext = airbyteContexts.length > 0
  const [isSyncing, setIsSyncing] = useState(false)
  const currentSessionKey = !isExecChannel ? (sessionKeys[activeChannel] || deriveSessionKey(channel)) : ''

  // ── Voice Call State ──
  const [showCallModal, setShowCallModal] = useState(false)
  const [callPhone, setCallPhone] = useState('')
  const [callLaunching, setCallLaunching] = useState(false)
  const [channelCalls, setChannelCalls] = useState<VoiceCall[]>([])
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)

  // Subscribe to voice call updates
  useEffect(() => {
    setChannelCalls(getCallsForChannel(activeChannel))
    const unsub = subscribeToVoiceCalls(() => {
      setChannelCalls(getCallsForChannel(activeChannel))
    })
    return unsub
  }, [activeChannel])

  const handleLaunchCall = async () => {
    if (!callPhone.trim() || callLaunching) return
    setCallLaunching(true)
    try {
      const call = await launchVoiceCall({
        phoneNumber: callPhone.trim(),
        missionId: channel.missionId,
        channelId: activeChannel,
        requestData: channel.missionId && context ? {
          mission_name: channel.name,
          objective: context.objective,
          status: context.status,
          threats: context.threats,
        } : undefined,
      })
      // Post system message about the call
      const callMsg: ChatMessage = {
        id: `msg-call-${call.id}`,
        from: 'SYSTEM',
        fromAvatar: 'SY',
        to: activeChannel,
        content: `Voice escalation initiated → ${callPhone.trim()}${channel.missionId ? ` (${channel.missionId})` : ''}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        channel: activeChannel,
        type: 'system',
      }
      appendMessage(activeChannel, callMsg)
      setCallPhone('')
      setShowCallModal(false)
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `msg-callerr-${Date.now()}`,
        from: 'SYSTEM',
        fromAvatar: 'SY',
        to: activeChannel,
        content: `Call failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        channel: activeChannel,
        type: 'alert',
      }
      appendMessage(activeChannel, errMsg)
    } finally {
      setCallLaunching(false)
    }
  }

  // Check gateway health on mount
  useEffect(() => {
    checkGatewayHealth()
      .then(() => setGatewayStatus('ok'))
      .catch(() => setGatewayStatus('offline'))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeChannel])

  // Resolve target agent for the active channel (first assigned agent, or channel name)
  const getTargetAgent = useCallback((): string | null => {
    const ctx = channel.missionId ? missionContext[channel.missionId] : null
    if (ctx && ctx.agents.length > 0) return ctx.agents[0]
    return null
  }, [channel])

  const appendMessage = useCallback((channelId: string, msg: ChatMessage) => {
    setLocalMessages(prev => ({
      ...prev,
      [channelId]: [...(prev[channelId] || []), msg],
    }))
  }, [])

  const updateLastMessage = useCallback((channelId: string, updater: (content: string) => string) => {
    setLocalMessages(prev => {
      const msgs = prev[channelId] || []
      if (msgs.length === 0) return prev
      const last = msgs[msgs.length - 1]
      return {
        ...prev,
        [channelId]: [...msgs.slice(0, -1), { ...last, content: updater(last.content) }],
      }
    })
  }, [])

  // Reset session for the active channel — generates a new session key, isolating future messages
  const handleResetSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null

    const newKey = resetSessionKey(activeChannel)
    setSessionKeys(prev => ({ ...prev, [activeChannel]: newKey }))
    clearSessionMeta(activeChannel)

    const resetMsg: ChatMessage = {
      id: `msg-${Date.now()}-reset`,
      from: 'SYSTEM',
      fromAvatar: 'SY',
      to: activeChannel,
      content: 'Session memory reset — new conversation context started.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      channel: activeChannel,
      type: 'system',
    }
    appendMessage(activeChannel, resetMsg)
    setIsStreaming(false)
  }, [activeChannel, appendMessage])

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return
    const userContent = input.trim()
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

    // Add user message to chat
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      from: 'Commander Kai',
      fromAvatar: 'CK',
      to: activeChannel,
      content: userContent,
      timestamp: ts,
      channel: activeChannel,
      type: 'message',
    }
    appendMessage(activeChannel, userMsg)
    setInput('')
    inputRef.current?.focus()

    // If gateway is online and channel has a target agent, stream through gateway
    const targetAgent = getTargetAgent()
    if (gatewayStatus === 'ok' && targetAgent) {
      setIsStreaming(true)

      // Build conversation history — prepend synced Airbyte context (or static fallback)
      const history: ChatCompletionMessage[] = []
      if (channel.missionId) {
        if (hasAirbyteContext) {
          const lines: string[] = [`Mission: ${channel.missionId}`]
          for (const src of airbyteContexts) {
            lines.push(`\n[Source: ${src.sourceName} — synced ${src.lastSyncAt ? new Date(src.lastSyncAt).toLocaleTimeString() : 'never'}]`)
            for (const rec of src.records) {
              lines.push(`  ${rec.stream}: ${JSON.stringify(rec.data)}`)
            }
          }
          history.push({ role: 'system', content: lines.join('\n') })
        } else {
          const ctx = missionContext[channel.missionId]
          if (ctx) {
            history.push({
              role: 'system',
              content: [
                `Mission: ${channel.missionId}`,
                `Objective: ${ctx.objective}`,
                `Status: ${ctx.status}`,
                `Progress: ${ctx.progress}%`,
                ctx.threats.length > 0 ? `Active Threats: ${ctx.threats.join('; ')}` : '',
                `Assigned Agents: ${ctx.agents.join(', ')}`,
              ].filter(Boolean).join('\n'),
            })
          }
        }
      }

      // Append recent conversation messages
      const recentMsgs = messages
        .filter(m => m.type === 'message')
        .slice(-20)
        .map(m => ({
          role: (m.from === 'Commander Kai' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        }))
      history.push(...recentMsgs)
      history.push({ role: 'user', content: userContent })

      const agentAvatar = agents.find(a => a.name === targetAgent)?.avatar || targetAgent.slice(0, 2)

      // Add placeholder for streaming response
      const placeholderMsg: ChatMessage = {
        id: `msg-stream-${Date.now()}`,
        from: targetAgent,
        fromAvatar: agentAvatar,
        to: activeChannel,
        content: '',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        channel: activeChannel,
        type: 'message',
      }
      appendMessage(activeChannel, placeholderMsg)

      // Persist session metadata
      saveSessionMeta(activeChannel, {
        guildMissionId: channel.missionId,
        agentId: resolveAgentId(channel),
        sessionKey: currentSessionKey,
        createdAt: new Date().toISOString(),
      })

      const currentChannel = activeChannel
      abortRef.current = await streamMessage(
        {
          agentId: resolveAgentId(channel),
          sessionKey: currentSessionKey,
          messages: history,
        },
        (chunk) => updateLastMessage(currentChannel, prev => prev + chunk),
        () => setIsStreaming(false),
        (err) => {
          console.error('[gateway]', err)
          updateLastMessage(currentChannel, prev => prev || `[Connection error: ${err.message}]`)
          setIsStreaming(false)
        },
      )
    }
  }

  return (
    <div className="space-y-6 h-[calc(100vh-160px)] flex flex-col">
      <PageHeader title="Guild Comms" description="Secure agent-to-agent communication" className="!mb-0" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-4 min-h-0">
        {/* Channel List */}
        <GlassPanel className="flex flex-col overflow-hidden hidden lg:flex">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant">Channels</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg text-xs font-headline flex items-center gap-2 transition-all duration-200',
                  activeChannel === ch.id
                    ? 'bg-primary-container/20 text-primary-container font-bold'
                    : 'text-on-surface-variant/60 hover:bg-white/5 hover:text-on-surface-variant',
                )}
              >
                <Icon name={ch.icon} size="sm" />
                <span className="truncate flex-1">{ch.name}</span>
                {ch.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary-container text-white text-[9px] font-bold flex items-center justify-center">{ch.unread}</span>
                )}
              </button>
            ))}

            {/* Live Mission Feeds */}
            {executions.length > 0 && (
              <>
                <div className="pt-3 pb-1 px-2">
                  <p className="font-label text-[8px] uppercase tracking-widest text-secondary/60">Live Missions</p>
                </div>
                {executions.map(exec => (
                  <button
                    key={`exec-${exec.id}`}
                    onClick={() => setActiveChannel(`exec-${exec.id}`)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg text-xs font-headline flex items-center gap-2 transition-all duration-200',
                      activeChannel === `exec-${exec.id}`
                        ? 'bg-primary-container/20 text-primary-container font-bold'
                        : 'text-on-surface-variant/60 hover:bg-white/5 hover:text-on-surface-variant',
                    )}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: executionStatusColor[exec.status] }} />
                    <span className="truncate flex-1">{exec.name}</span>
                    {exec.status === 'running' && (
                      <span className="text-[8px] text-status-online font-bold">{exec.progress}%</span>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Online Agents */}
          <div className="p-3 border-t border-white/5">
            <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/50 mb-2 px-2">
              Online — {agents.filter(a => a.status !== 'offline').length}
            </p>
            <div className="space-y-0.5">
              {agents.filter(a => a.status !== 'offline').map(a => {
                const color = agentStatusColor[a.status] ?? '#ccc3d8'
                return (
                  <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-on-surface-variant/60 hover:bg-white/5 transition-colors cursor-pointer">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <span className="truncate">{a.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassPanel>

        {/* Chat Window */}
        <GlassPanel className="flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name={isExecChannel ? 'rocket_launch' : channel.icon} size="sm" className="text-primary-container" />
              <div>
                <h3 className="font-headline font-bold text-white text-sm">
                  {isExecChannel && activeExecution ? activeExecution.name : channel.name}
                </h3>
                <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-wider">
                  {isExecChannel && activeExecution ? (
                    <>
                      {activeExecution.transcript.length} entries · {activeExecution.id} · {activeExecution.assignedAgentId}
                    </>
                  ) : (
                    <>
                      {messages.length} messages {channel.missionId && `· ${channel.missionId}`}
                      {' · '}
                      <span className="text-on-surface-variant/30" title={currentSessionKey}>session {currentSessionKey.slice(-8)}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isExecChannel && activeExecution && (
                <StatusChip label={activeExecution.status} color={executionStatusColor[activeExecution.status]} pulse={activeExecution.status === 'running'} />
              )}
              {!isExecChannel && (
                <button
                  onClick={handleResetSession}
                  title="Reset session memory"
                  className="p-2 rounded-lg text-on-surface-variant hover:text-status-offline hover:bg-status-offline/10 transition-all"
                >
                  <Icon name="restart_alt" size="sm" />
                </button>
              )}
              {pinnedMessages.length > 0 && (
                <button
                  onClick={() => setShowPinned(!showPinned)}
                  className={cn('p-2 rounded-lg transition-all', showPinned ? 'bg-primary-container/20 text-primary-container' : 'text-on-surface-variant hover:text-white hover:bg-white/5')}
                >
                  <Icon name="push_pin" size="sm" />
                </button>
              )}
              {context && (
                <button
                  onClick={() => setShowContext(!showContext)}
                  className={cn('p-2 rounded-lg transition-all', showContext ? 'bg-primary-container/20 text-primary-container' : 'text-on-surface-variant hover:text-white hover:bg-white/5')}
                >
                  <Icon name="info" size="sm" />
                </button>
              )}
            </div>
          </div>

          {/* Pinned Banner */}
          {showPinned && pinnedMessages.length > 0 && (
            <div className="px-5 py-3 bg-primary-container/10 border-b border-primary-container/20">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="push_pin" size="sm" className="text-primary-container" />
                <span className="text-[10px] font-label uppercase tracking-widest text-primary-container">
                  Pinned Messages ({pinnedMessages.length})
                </span>
                <button onClick={() => setShowPinned(false)} className="ml-auto text-on-surface-variant/40 hover:text-white">
                  <Icon name="close" size="sm" />
                </button>
              </div>
              <div className="space-y-2">
                {pinnedMessages.map(msg => (
                  <div key={msg.id} className="text-xs text-on-surface/80">
                    <span className="font-bold text-primary mr-2">{msg.from}:</span>
                    {msg.content.length > 120 ? msg.content.slice(0, 120) + '...' : msg.content}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages / Mission Transcript */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
            {isExecChannel && activeExecution ? (
              <>
                {/* Mission execution transcript */}
                {activeExecution.transcript.map(entry => {
                  const roleColor = entry.role === 'system' ? '#94A3B8' : entry.role === 'operator' ? '#863bff' : entry.role === 'tool' ? '#F59E0B' : '#10B981'
                  const roleIcon = entry.role === 'system' ? 'info' : entry.role === 'operator' ? 'person' : entry.role === 'tool' ? 'build' : 'smart_toy'
                  const isOp = entry.role === 'operator'

                  return (
                    <div key={entry.id} className={cn('flex gap-3', isOp && 'flex-row-reverse')}>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-headline font-bold shrink-0"
                        style={{ backgroundColor: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30` }}
                      >
                        <Icon name={roleIcon} size="sm" />
                      </div>
                      <div className={cn('max-w-[75%]', isOp && 'text-right')}>
                        <div className={cn('flex items-center gap-2 mb-1', isOp && 'flex-row-reverse')}>
                          <span className="text-[10px] font-label font-bold uppercase tracking-wider" style={{ color: roleColor }}>{entry.agentName}</span>
                          <span className="text-[9px] text-on-surface-variant/40">{entry.timestamp}</span>
                          {entry.tokenCount && <span className="text-[8px] text-on-surface-variant/30">{entry.tokenCount} tokens</span>}
                        </div>
                        <div className={cn(
                          'rounded-xl px-4 py-3 text-sm text-on-surface leading-relaxed',
                          isOp
                            ? 'bg-primary-container/15 border border-primary-container/20 rounded-tr-sm'
                            : entry.role === 'tool'
                              ? 'bg-status-busy/5 border border-status-busy/15 rounded-tl-sm'
                              : 'bg-surface-container-high/60 border border-white/5 rounded-tl-sm',
                        )}>
                          {entry.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {activeExecution.transcript.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/30">
                    <Icon name="hourglass_empty" size="lg" className="mb-2" />
                    <p className="text-[10px] font-label uppercase tracking-widest">Awaiting mission execution...</p>
                  </div>
                )}
                {activeExecution.status === 'running' && (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-[10px] font-label text-status-online/60 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-1 rounded-full bg-status-online animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="inline-block w-1 h-1 rounded-full bg-status-online animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="inline-block w-1 h-1 rounded-full bg-status-online animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="ml-1">Agent executing...</span>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {messages.map(msg => {
                  const isOperator = msg.from === 'Commander Kai'
                  const isSystem = msg.type === 'system' || msg.type === 'alert'
                  const color = agentAvatarColor[msg.from] || '#ccc3d8'

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className={cn(
                          'px-4 py-2 rounded-lg text-[11px] flex items-center gap-2',
                          msg.type === 'alert'
                            ? 'bg-status-offline/10 border border-status-offline/20 text-status-offline'
                            : 'bg-surface-container-high/50 border border-white/5 text-on-surface-variant/60',
                        )}>
                          <Icon name={msg.type === 'alert' ? 'warning' : 'info'} size="sm" />
                          {msg.content}
                          <span className="text-[9px] opacity-50 ml-2">{msg.timestamp}</span>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={msg.id} className={cn('flex gap-3', isOperator && 'flex-row-reverse')}>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-headline font-bold shrink-0"
                        style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
                      >
                        {msg.fromAvatar}
                      </div>
                      <div className={cn('max-w-[75%]', isOperator && 'text-right')}>
                        <div className={cn('flex items-center gap-2 mb-1', isOperator && 'flex-row-reverse')}>
                          <span className="text-[10px] font-label font-bold uppercase tracking-wider" style={{ color }}>{msg.from}</span>
                          <span className="text-[9px] text-on-surface-variant/40">{msg.timestamp}</span>
                          {msg.pinned && <Icon name="push_pin" size="sm" className="text-primary-container/50" />}
                        </div>
                        <div className={cn(
                          'rounded-xl px-4 py-3 text-sm text-on-surface leading-relaxed',
                          isOperator
                            ? 'bg-primary-container/15 border border-primary-container/20 rounded-tr-sm'
                            : 'bg-surface-container-high/60 border border-white/5 rounded-tl-sm',
                        )}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {/* Voice Call Cards */}
                {channelCalls.map(call => {
                  const color = callStatusColor[call.status] || '#94A3B8'
                  const icon = callStatusIcon[call.status] || 'call'
                  const isActive = call.status === 'ringing' || call.status === 'in-progress'
                  const isExpanded = expandedCallId === call.id
                  const isSimulated = call.callId?.startsWith('sim-') ?? false
                  const isTerminal = call.status === 'completed' || call.status === 'failed' || call.status === 'no-answer'

                  return (
                    <div key={call.id} className="flex justify-center">
                      <div
                        className={cn(
                          'w-full max-w-md rounded-xl border px-4 py-3 space-y-2 transition-all cursor-pointer',
                          isActive ? 'border-status-online/20 bg-status-online/5' : 'border-white/5 bg-surface-container-high/40',
                        )}
                        onClick={() => {
                          setExpandedCallId(isExpanded ? null : call.id)
                          // Fetch real details when expanding a completed real call
                          if (!isExpanded && isTerminal && !isSimulated) {
                            fetchCallDetails(call.id)
                          }
                        }}
                      >
                        {/* Call header */}
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                          >
                            <Icon name={icon} size="sm" style={{ color }} className={isActive ? 'animate-pulse' : ''} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-label font-bold uppercase tracking-wider" style={{ color }}>
                                {call.status === 'ringing' ? 'Ringing' : call.status === 'in-progress' ? 'In Progress' : call.status === 'completed' ? 'Call Completed' : call.status === 'failed' ? 'Call Failed' : call.status === 'no-answer' ? 'No Answer' : 'Queued'}
                              </span>
                              {isSimulated && (
                                <span className="text-[8px] font-label uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  Simulated
                                </span>
                              )}
                              {!isSimulated && call.callId && (
                                <span className="text-[8px] font-label uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  Live
                                </span>
                              )}
                              {isActive && (
                                <span className="flex gap-0.5">
                                  <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: color, animationDelay: '0ms' }} />
                                  <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: color, animationDelay: '150ms' }} />
                                  <span className="w-1 h-1 rounded-full animate-bounce" style={{ backgroundColor: color, animationDelay: '300ms' }} />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/50">
                              <span>{call.phoneNumber}</span>
                              <span>·</span>
                              <span>{call.launchedAt}</span>
                              {call.duration != null && (
                                <>
                                  <span>·</span>
                                  <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                                </>
                              )}
                              {call.callId && !isSimulated && (
                                <>
                                  <span>·</span>
                                  <span className="font-mono text-[9px]">{call.callId.slice(0, 12)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size="sm" className="text-on-surface-variant/30" />
                        </div>

                        {/* Expanded: summary + transcript + recording */}
                        {isExpanded && (call.summary || call.error || isActive) && (
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            {call.summary && (
                              <div>
                                <p className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant/50 mb-1">Summary</p>
                                <p className="text-xs text-on-surface/80 leading-relaxed">{call.summary}</p>
                              </div>
                            )}
                            {call.transcript && (
                              <div>
                                <p className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant/50 mb-1">Transcript</p>
                                <pre className="text-[11px] text-on-surface/60 leading-relaxed whitespace-pre-wrap font-mono bg-white/[0.02] rounded p-2 max-h-40 overflow-y-auto custom-scrollbar">{call.transcript}</pre>
                              </div>
                            )}
                            {call.recordingUrl && (
                              <div>
                                <p className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant/50 mb-1">Recording</p>
                                <a
                                  href={call.recordingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <Icon name="play_circle" size="sm" />
                                  Play Recording
                                </a>
                              </div>
                            )}
                            {call.error && (
                              <div className="text-xs text-status-offline flex items-center gap-1.5">
                                <Icon name="error" size="sm" />
                                {call.error}
                              </div>
                            )}
                            {isActive && !call.summary && (
                              <p className="text-[10px] text-on-surface-variant/40 italic">Call in progress... details will appear when completed.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Streaming typing indicator */}
                {isStreaming && messages[messages.length - 1]?.content === '' && (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-[10px] font-label text-on-surface-variant/40 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-1 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="inline-block w-1 h-1 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="inline-block w-1 h-1 rounded-full bg-on-surface-variant/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input — hidden for execution transcript channels */}
          {isExecChannel ? (
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-2 px-1">
                <Icon name="visibility" size="sm" className="text-on-surface-variant/30" />
                <span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant/40">
                  Read-only mission transcript · {activeExecution?.transcript.length ?? 0} entries
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t border-white/5">
              {/* Gateway status indicator */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  gatewayStatus === 'ok' ? 'bg-status-online' : gatewayStatus === 'offline' ? 'bg-status-offline' : 'bg-on-surface-variant/30',
                )} />
                <span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant/40">
                  {gatewayStatus === 'ok' ? 'Gateway connected' : gatewayStatus === 'offline' ? 'Gateway offline — local only' : 'Checking gateway...'}
                </span>
                {isStreaming && (
                  <span className="text-[9px] font-label uppercase tracking-widest text-primary-container animate-pulse ml-auto">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-online animate-pulse mr-1" />
                    Streaming...
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                  placeholder={`Message #${channel.name}...`}
                  disabled={isStreaming}
                  className="flex-1 bg-surface-container-lowest border border-white/5 rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary-container/30 transition-colors disabled:opacity-50"
                />
                {/* Voice Call Button */}
                <button
                  onClick={() => setShowCallModal(!showCallModal)}
                  title="Launch voice escalation call"
                  className={cn(
                    'px-3 py-2.5 rounded-lg transition-all flex items-center gap-1.5',
                    showCallModal
                      ? 'bg-status-online/20 text-status-online'
                      : 'bg-surface-container-high/60 text-on-surface-variant hover:text-status-online hover:bg-status-online/10',
                  )}
                >
                  <Icon name="call" size="sm" />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="px-4 py-2.5 bg-primary-container text-white rounded-lg hover:brightness-110 transition-all glow-violet disabled:opacity-30 disabled:glow-none"
                >
                  <Icon name={isStreaming ? 'more_horiz' : 'send'} size="sm" />
                </button>
              </div>

              {/* Call Launch Modal */}
              {showCallModal && (
                <div className="mt-2 p-4 rounded-lg bg-surface-container-high/80 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon name="call" size="sm" className="text-status-online" />
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Voice Escalation</span>
                    <button onClick={() => setShowCallModal(false)} className="ml-auto text-on-surface-variant/40 hover:text-white">
                      <Icon name="close" size="sm" />
                    </button>
                  </div>
                  {channel.missionId && context && (
                    <div className="text-[10px] text-on-surface-variant/50 bg-white/[0.02] rounded px-3 py-2 border border-white/5">
                      <span className="text-primary-container font-bold">{channel.missionId}</span> context will be injected into the call pathway
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={callPhone}
                      onChange={e => setCallPhone(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleLaunchCall() }}
                      placeholder="+1 (555) 000-0000"
                      className="flex-1 bg-surface-container-lowest border border-white/5 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-status-online/30 transition-colors"
                    />
                    <button
                      onClick={handleLaunchCall}
                      disabled={!callPhone.trim() || callLaunching}
                      className="px-4 py-2 bg-status-online/20 text-status-online rounded-lg hover:bg-status-online/30 transition-all disabled:opacity-30 flex items-center gap-1.5 text-xs font-headline font-bold"
                    >
                      <Icon name={callLaunching ? 'hourglass_top' : 'call'} size="sm" className={callLaunching ? 'animate-spin' : ''} />
                      {callLaunching ? 'Dialing...' : 'Call'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassPanel>

        {/* Context Panel */}
        {isExecChannel && activeExecution ? (
          <GlassPanel className="p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar hidden lg:flex">
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">Execution Context</p>
              <h3 className="font-headline font-bold text-white text-sm">{activeExecution.id}</h3>
            </div>
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Status</p>
              <StatusChip label={activeExecution.status} color={executionStatusColor[activeExecution.status]} pulse={activeExecution.status === 'running'} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">Progress</p>
                <span className="text-xs font-bold text-white">{activeExecution.progress}%</span>
              </div>
              <ProgressBar value={activeExecution.progress} height="md" color={executionStatusColor[activeExecution.status]} />
            </div>
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Mission Type</p>
              <span className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ background: `${missionTypeColor[activeExecution.type] ?? '#d2bbff'}15`, color: missionTypeColor[activeExecution.type] ?? '#d2bbff' }}>
                {activeExecution.type}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Agent</p>
              <span className="text-xs text-white font-headline">{activeExecution.assignedAgentId}</span>
            </div>
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Prompt</p>
              <p className="text-xs text-on-surface/70 leading-relaxed">{activeExecution.prompt}</p>
            </div>
            {activeExecution.toolActions.length > 0 && (
              <div>
                <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Tool Actions</p>
                <div className="space-y-1.5">
                  {activeExecution.toolActions.map(action => (
                    <div key={action.id} className={cn(
                      'flex items-center gap-2 text-[10px] px-2 py-1.5 rounded border',
                      action.status === 'success' ? 'border-status-online/15 text-status-online' :
                      action.status === 'failure' ? 'border-status-offline/15 text-status-offline' :
                      'border-status-busy/15 text-status-busy'
                    )}>
                      <Icon name={action.status === 'success' ? 'check_circle' : action.status === 'failure' ? 'error' : 'hourglass_top'} size="sm" />
                      <span className="font-bold">{action.toolName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-auto pt-4 border-t border-white/5">
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Session</p>
              <p className="text-[10px] text-on-surface-variant/40 font-mono break-all">{activeExecution.sessionKey}</p>
            </div>
          </GlassPanel>
        ) : (context || hasAirbyteContext) && showContext ? (
          <GlassPanel className="p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar hidden lg:flex">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">Mission Context</p>
                <h3 className="font-headline font-bold text-white text-sm">{channel.missionId}</h3>
              </div>
              {hasAirbyteContext && (
                <button
                  onClick={async () => {
                    if (!channel.missionId || isSyncing) return
                    setIsSyncing(true)
                    try { await triggerMissionSync(channel.missionId) }
                    finally { setIsSyncing(false) }
                  }}
                  disabled={isSyncing}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-label uppercase tracking-widest transition-colors',
                    isSyncing
                      ? 'text-on-surface-variant/30 cursor-not-allowed'
                      : 'text-[#4cd7f6]/70 hover:text-[#4cd7f6] hover:bg-[#4cd7f6]/5',
                  )}
                >
                  <Icon name={isSyncing ? 'hourglass_top' : 'sync'} size="sm" className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing' : 'Sync'}
                </button>
              )}
            </div>

            {/* Airbyte Synced Sources */}
            {hasAirbyteContext && airbyteContexts.map(src => {
              const freshnessMin = Math.round(src.freshnessMs / 60_000)
              const isFresh = freshnessMin < 10
              const freshnessColor = isFresh ? 'text-status-online' : freshnessMin < 30 ? 'text-status-busy' : 'text-status-offline'
              const statusColor = src.syncStatus === 'succeeded' ? '#10B981' : src.syncStatus === 'running' ? '#F59E0B' : src.syncStatus === 'failed' ? '#F43F5E' : '#94A3B8'

              return (
                <div key={src.connectionId} className="space-y-3">
                  {/* Source header with freshness */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="cloud_sync" size="sm" style={{ color: statusColor }} />
                      <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/80">{src.sourceName}</span>
                    </div>
                    <div className={cn('flex items-center gap-1 text-[10px]', freshnessColor)}>
                      <Icon name="schedule" size="sm" />
                      <span>{freshnessMin < 1 ? 'Just now' : `${freshnessMin}m ago`}</span>
                    </div>
                  </div>

                  {/* Synced records */}
                  <div className="space-y-2">
                    {src.records.map((rec, i) => {
                      const severity = rec.data.severity as string | undefined
                      const severityColor = severity === 'critical' ? '#F43F5E' : severity === 'high' ? '#F59E0B' : severity === 'medium' ? '#4cd7f6' : '#94A3B8'
                      const isAsset = rec.stream === 'infrastructure_assets'
                      const isGitHub = rec.stream.startsWith('github_')
                      const ghIcon = rec.stream === 'github_issues' ? 'bug_report' : rec.stream === 'github_pull_requests' ? 'merge' : 'commit'

                      return (
                        <div key={i} className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Icon
                              name={isGitHub ? ghIcon : isAsset ? 'dns' : rec.stream === 'threat_indicators' ? 'gpp_bad' : 'monitoring'}
                              size="sm"
                              style={{ color: isGitHub ? '#8b5cf6' : isAsset ? '#d2bbff' : severityColor }}
                            />
                            <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/50">{rec.stream.replace(/_/g, ' ')}</span>
                            {severity && (
                              <span className="ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ color: severityColor, backgroundColor: `${severityColor}15` }}>
                                {severity}
                              </span>
                            )}
                            {!!rec.data.state && isGitHub && (
                              <span className={cn('ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded', rec.data.state === 'open' ? 'text-status-online bg-status-online/10' : 'text-[#8b5cf6] bg-[#8b5cf6]/10')}>
                                {String(rec.data.state)}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-on-surface/70 leading-relaxed">
                            {/* GitHub issues */}
                            {!!rec.data.title && isGitHub && (
                              <p>
                                <span className="text-white/80 font-medium">#{String(rec.data.number)}</span>
                                {' '}
                                {String(rec.data.title)}
                              </p>
                            )}
                            {!!rec.data.labels && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(rec.data.labels as string[]).map(label => (
                                  <span key={label} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant/60">{label}</span>
                                ))}
                              </div>
                            )}
                            {/* GitHub PRs */}
                            {rec.data.additions != null && (
                              <p className="text-on-surface-variant/40 text-[10px] mt-1">
                                <span className="text-status-online">+{String(rec.data.additions)}</span>
                                {' / '}
                                <span className="text-status-offline">-{String(rec.data.deletions)}</span>
                                {!!rec.data.author && ` · by ${String(rec.data.author)}`}
                              </p>
                            )}
                            {/* GitHub commits */}
                            {!!rec.data.sha && (
                              <p>
                                <span className="text-[#8b5cf6] font-mono text-[10px]">{String(rec.data.sha)}</span>
                                {' '}
                                {String(rec.data.message)}
                                {!!rec.data.branch && <span className="text-on-surface-variant/40 text-[10px]"> on {String(rec.data.branch)}</span>}
                              </p>
                            )}
                            {!!rec.data.assignee && (
                              <p className="text-on-surface-variant/40 text-[10px]">
                                assignee: {String(rec.data.assignee)}
                                {rec.data.comments != null && ` · ${Number(rec.data.comments)} comments`}
                              </p>
                            )}
                            {/* Threat intel / CMDB (existing) */}
                            {!!rec.data.indicator && <p>{String(rec.data.indicator)}</p>}
                            {!!rec.data.assetId && (
                              <p>
                                <span className="text-on-surface-variant/50">{String(rec.data.assetId)}</span>
                                {' — '}
                                <span className="text-white/80">{String(rec.data.zone)}</span>
                                {!!rec.data.status && !isGitHub && (
                                  <span className="ml-1 text-[9px] font-bold uppercase" style={{ color: (rec.data.status === 'active' ? '#10B981' : rec.data.status === 'lockdown' ? '#F43F5E' : '#F59E0B') }}>
                                    [{String(rec.data.status)}]
                                  </span>
                                )}
                              </p>
                            )}
                            {!!rec.data.anomalyType && (
                              <p>
                                {String(rec.data.anomalyType).replace(/_/g, ' ')}
                                {!!rec.data.magnitude && ` — ${String(rec.data.magnitude)}`}
                              </p>
                            )}
                            {rec.data.confidence != null && (
                              <p className="text-on-surface-variant/40 text-[10px]">
                                confidence: {Math.round(Number(rec.data.confidence) * 100)}%
                                {!!rec.data.source && ` · ${String(rec.data.source)}`}
                              </p>
                            )}
                            {rec.data.riskScore != null && (
                              <p className="text-on-surface-variant/40 text-[10px]">
                                risk score: {Number(rec.data.riskScore)}/100
                                {!!rec.data.lastPatched && ` · patched: ${String(rec.data.lastPatched)}`}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Divider between Airbyte context and legacy context */}
            {hasAirbyteContext && context && (
              <div className="border-t border-white/5" />
            )}

            {/* Legacy static context (objective, agents, etc.) */}
            {context && (
              <>
                <div>
                  <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Objective</p>
                  <p className="text-xs text-on-surface/70 leading-relaxed">{context.objective}</p>
                </div>

                <div>
                  <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Status</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-online animate-pulse" />
                    <span className="text-xs font-headline font-bold text-white">{context.status}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">Progress</p>
                    <span className="text-xs font-bold text-white">{context.progress}%</span>
                  </div>
                  <ProgressBar value={context.progress} height="md" color="#863bff" />
                </div>

                <div>
                  <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Assigned Agents</p>
                  <div className="space-y-2">
                    {context.agents.map(name => {
                      const agent = agents.find(a => a.name === name)
                      const color = agentAvatarColor[name] || '#ccc3d8'
                      return (
                        <div key={name} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-headline font-bold" style={{ backgroundColor: `${color}15`, color }}>
                            {agent?.avatar || name.slice(0, 2)}
                          </div>
                          <span className="text-xs text-white font-headline">{name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Voice Calls */}
            {channelCalls.length > 0 && (
              <div>
                <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Voice Calls</p>
                <div className="space-y-1.5">
                  {channelCalls.map(call => {
                    const color = callStatusColor[call.status] || '#94A3B8'
                    const icon = callStatusIcon[call.status] || 'call'
                    const isActive = call.status === 'ringing' || call.status === 'in-progress'
                    return (
                      <div key={call.id} className={cn(
                        'flex items-center gap-2 text-[10px] px-2 py-1.5 rounded border',
                        isActive ? 'border-status-online/15' : call.status === 'completed' ? 'border-status-online/10' : 'border-white/5',
                      )}>
                        <Icon name={icon} size="sm" style={{ color }} className={isActive ? 'animate-pulse' : ''} />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold block truncate" style={{ color }}>{call.phoneNumber}</span>
                          <span className="text-[9px] text-on-surface-variant/40">{call.launchedAt}{call.duration != null ? ` · ${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : ''}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Session Info */}
            <div className="mt-auto pt-4 border-t border-white/5">
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Session</p>
              <p className="text-[10px] text-on-surface-variant/40 font-mono break-all">{currentSessionKey}</p>
              <button
                onClick={handleResetSession}
                className="mt-2 text-[10px] font-label uppercase tracking-widest text-status-offline/60 hover:text-status-offline transition-colors flex items-center gap-1"
              >
                <Icon name="restart_alt" size="sm" />
                Reset Session
              </button>
            </div>
          </GlassPanel>
        ) : !context && !hasAirbyteContext && (
          <GlassPanel className="p-5 flex flex-col items-center justify-center gap-3 hidden lg:flex">
            <Icon name="forum" size="lg" className="text-on-surface-variant/20" />
            <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/40 text-center">
              Select a mission channel to view context
            </p>
          </GlassPanel>
        )}
      </div>
    </div>
  )
}
