import { useState, useRef, useEffect } from 'react'
import { agents } from '../data/agents'
import { channels, chatMessages, missionContext } from '../data/chat'
import type { ChatMessage } from '../data/chat'
import { cn, agentStatusColor } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import GlassPanel from '../components/ui/GlassPanel'
import ProgressBar from '../components/ui/ProgressBar'
import Icon from '../components/ui/Icon'

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
}

export default function CommsPage() {
  const [activeChannel, setActiveChannel] = useState('general')
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<Record<string, ChatMessage[]>>(chatMessages)
  const [showPinned, setShowPinned] = useState(false)
  const [showContext, setShowContext] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const channel = channels.find(c => c.id === activeChannel)!
  const messages = localMessages[activeChannel] || []
  const pinnedMessages = messages.filter(m => m.pinned)
  const context = channel.missionId ? missionContext[channel.missionId] : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeChannel])

  const sendMessage = () => {
    if (!input.trim()) return
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      from: 'Commander Kai',
      fromAvatar: 'CK',
      to: activeChannel,
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      channel: activeChannel,
      type: 'message',
    }
    setLocalMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMsg],
    }))
    setInput('')
    inputRef.current?.focus()
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
              <Icon name={channel.icon} size="sm" className="text-primary-container" />
              <div>
                <h3 className="font-headline font-bold text-white text-sm">{channel.name}</h3>
                <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-wider">
                  {messages.length} messages {channel.missionId && `· ${channel.missionId}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
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
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                placeholder={`Message #${channel.name}...`}
                className="flex-1 bg-surface-container-lowest border border-white/5 rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary-container/30 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="px-4 py-2.5 bg-primary-container text-white rounded-lg hover:brightness-110 transition-all glow-violet disabled:opacity-30 disabled:glow-none"
              >
                <Icon name="send" size="sm" />
              </button>
            </div>
          </div>
        </GlassPanel>

        {/* Context Panel */}
        {context && showContext ? (
          <GlassPanel className="p-5 flex flex-col gap-5 overflow-y-auto custom-scrollbar hidden lg:flex">
            <div>
              <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">Mission Context</p>
              <h3 className="font-headline font-bold text-white text-sm">{channel.missionId}</h3>
            </div>

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

            {context.threats.length > 0 && (
              <div>
                <p className="text-[10px] font-label uppercase tracking-widest text-status-offline/80 mb-2">Active Threats</p>
                <div className="space-y-1.5">
                  {context.threats.map((threat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-status-offline/80">
                      <Icon name="warning" size="sm" className="text-status-offline/50 mt-0.5 shrink-0" />
                      <span>{threat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassPanel>
        ) : !context && (
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
