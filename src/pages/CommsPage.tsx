import { useState } from 'react'
import { agents } from '../data/agents'
import { useAsyncData } from '../hooks/useAsyncData'
import GlassPanel from '../components/ui/GlassPanel'
import PageHeader from '../components/ui/PageHeader'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import Icon from '../components/ui/Icon'
import { cn, agentStatusColor } from '../lib/utils'

interface Message {
  id: string
  sender: string
  content: string
  timestamp: string
  isOperator: boolean
}

const mockMessages: Message[] = [
  { id: 'm1', sender: 'CIPHER-7', content: 'Sector 7-G sweep at 72%. Detected anomalous packet signatures on subnet 4. Requesting extended scan authorization.', timestamp: '2 min ago', isOperator: false },
  { id: 'm2', sender: 'Commander Kai', content: 'Authorization granted. Extend sweep to include subnet 5. Report any zero-day signatures immediately.', timestamp: '1 min ago', isOperator: true },
  { id: 'm3', sender: 'NOVA-3', content: 'Threat vector analysis complete. 3 new indicators of compromise identified. Uploading to shared intelligence feed.', timestamp: '5 min ago', isOperator: false },
  { id: 'm4', sender: 'SENTINEL-12', content: 'Perimeter lockdown at 60%. Unauthorized access attempt originated from external IP range 198.51.x.x. Firewall rules updated.', timestamp: '8 min ago', isOperator: false },
  { id: 'm5', sender: 'Commander Kai', content: 'Good work SENTINEL-12. Escalate to WRAITH-5 for origin trace.', timestamp: '7 min ago', isOperator: true },
  { id: 'm6', sender: 'ORACLE-1', content: 'Predictive model update: Q2 threat probability increased by 12% in the financial sector vertical. Recommend pre-positioning defense assets.', timestamp: '15 min ago', isOperator: false },
]

export default function CommsPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const { data, isLoading, error } = useAsyncData(() => ({
    agents: agents.filter((a) => a.status !== 'offline'),
    messages: mockMessages,
  }))

  if (isLoading) return <LoadingState message="Connecting to comms channel..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const displayMessages = selectedAgent
    ? data.messages.filter((m) => m.sender === selectedAgent || m.isOperator)
    : data.messages

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader title="Comms Channel" description="Secure agent-operator communication" />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
        {/* Agent List */}
        <GlassPanel className="p-4 lg:col-span-1 overflow-y-auto custom-scrollbar">
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60 mb-3 px-2">
            Online Agents
          </p>
          <div className="space-y-1">
            {data.agents.map((agent) => {
              const color = agentStatusColor[agent.status] ?? '#ccc3d8'
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(selectedAgent === agent.name ? null : agent.name)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left',
                    selectedAgent === agent.name
                      ? 'bg-primary-container/20 text-white'
                      : 'text-on-surface-variant/70 hover:bg-white/5',
                  )}
                >
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-headline font-bold"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {agent.avatar}
                    </div>
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-container-low"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-headline font-bold truncate">{agent.name}</p>
                    <p className="text-[10px] text-on-surface-variant/50 truncate">{agent.role}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </GlassPanel>

        {/* Message Feed */}
        <GlassPanel className="lg:col-span-3 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="lock" size="sm" className="text-status-online" />
              <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
                {selectedAgent ? `Direct — ${selectedAgent}` : 'Guild Channel'}
              </span>
            </div>
            <span className="text-[10px] font-label text-on-surface-variant/40 uppercase tracking-wider">
              Encrypted E2E
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {displayMessages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 max-w-[85%]',
                  msg.isOperator ? 'ml-auto flex-row-reverse' : '',
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-headline font-bold shrink-0',
                    msg.isOperator
                      ? 'bg-primary-container/20 text-primary'
                      : 'bg-secondary/10 text-secondary',
                  )}
                >
                  {msg.isOperator ? 'CK' : msg.sender.slice(0, 2)}
                </div>
                <div
                  className={cn(
                    'rounded-xl px-4 py-3',
                    msg.isOperator
                      ? 'bg-primary-container/15 border border-primary-container/20'
                      : 'bg-surface-container-high/60 border border-white/5',
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-label font-bold uppercase tracking-wider text-on-surface-variant">
                      {msg.sender}
                    </span>
                    <span className="text-[9px] text-on-surface-variant/40">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm text-on-surface leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-surface-container-lowest border border-white/5 rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary-container/30 transition-colors"
              />
              <button className="px-4 py-2.5 bg-primary-container text-white rounded-lg font-label text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet">
                <Icon name="send" size="sm" />
              </button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
