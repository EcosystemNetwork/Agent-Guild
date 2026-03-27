import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import type { AgentStatus } from '../types'
import { cn } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import AgentCard from '../components/AgentCard'
import GlassPanel from '../components/ui/GlassPanel'
import Icon from '../components/ui/Icon'

const statusFilters: { label: string; value: AgentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'In Mission', value: 'in-mission' },
  { label: 'Standby', value: 'standby' },
  { label: 'Offline', value: 'offline' },
]

const specialtyOptions = ['Encryption', 'SIGINT', 'Recon', 'ML Analysis', 'Threat Detection', 'Exploit Dev', 'Forensics', 'OSINT', 'Social Engineering', 'Malware Analysis']
const modelOptions = [
  { label: 'GPT-4o Vision Intelligence', short: 'GPT-4o' },
  { label: 'Claude Opus — Deep Analysis', short: 'Claude Opus' },
  { label: 'Gemini Ultra — Multimodal', short: 'Gemini Ultra' },
  { label: 'Custom Fine-Tuned Model', short: 'Custom' },
]

interface FormErrors { name?: string; role?: string; specialties?: string }

export default function AgentsPage() {
  const { agents } = useData()
  const [filter, setFilter] = useState<AgentStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)

  // Create Agent form state
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [model, setModel] = useState(modelOptions[0].label)
  const [autonomy, setAutonomy] = useState(70)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const filtered = filter === 'all' ? agents : agents.filter(a => a.status === filter)

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
    if (errors.specialties) setErrors(e => ({ ...e, specialties: undefined }))
  }

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!name.trim()) e.name = 'Callsign is required'
    else if (name.trim().length < 3) e.name = 'Minimum 3 characters'
    else if (!/^[A-Za-z0-9-]+$/.test(name.trim())) e.name = 'Alphanumeric and hyphens only'
    if (!role.trim()) e.role = 'Role is required'
    if (selectedTags.length === 0) e.specialties = 'Select at least one specialty'
    return e
  }

  const handleBlur = (field: string) => {
    setTouched(t => ({ ...t, [field]: true }))
    setErrors(validate())
  }

  const handleSubmit = () => {
    const e = validate()
    setErrors(e)
    setTouched({ name: true, role: true, specialties: true })
    if (Object.keys(e).length > 0) return
    setIsSubmitting(true)
    setTimeout(() => { setIsSubmitting(false); setSubmitted(true) }, 1800)
  }

  const resetForm = () => {
    setName(''); setRole(''); setModel(modelOptions[0].label); setAutonomy(70)
    setSelectedTags([]); setErrors({}); setTouched({}); setSubmitted(false); setIsSubmitting(false)
  }

  const closeCreate = () => { setShowCreate(false); setTimeout(resetForm, 300) }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Roster"
        description={`${agents.length} agents registered in the guild`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-white rounded-lg font-label text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet"
          >
            <Icon name="add" size="sm" /> New Agent
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(sf => (
          <button
            key={sf.value}
            onClick={() => setFilter(sf.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-label font-bold uppercase tracking-wider transition-all border',
              filter === sf.value
                ? 'bg-primary-container/20 text-primary-container border-primary-container/30'
                : 'bg-surface-container-high border-white/5 text-on-surface-variant/60 hover:text-on-surface-variant hover:border-white/10',
            )}
          >
            {sf.label} ({sf.value === 'all' ? agents.length : agents.filter(a => a.status === sf.value).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState icon="smart_toy" title="No agents found" description="No agents match the selected filter." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(agent => <AgentCard key={agent.id} agent={agent} />)}
        </div>
      )}

      {/* Create Agent Modal */}
      {showCreate && (
        <>
          <div className={cn('fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300')} onClick={closeCreate} />
          <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[680px] sm:max-h-[85vh] z-50 bg-surface-container-low/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-headline font-bold text-white uppercase tracking-wider text-sm">
                  {submitted ? 'Agent Initialized' : 'Initialize New Agent'}
                </h2>
                <p className="text-[10px] text-on-surface-variant/60">
                  {submitted ? 'Deployment successful' : 'Forge a new intelligence agent for the guild'}
                </p>
              </div>
              <button onClick={closeCreate} className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 transition-all">
                <Icon name="close" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {submitted ? (
                /* Success State */
                <div className="flex flex-col items-center py-8">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-2xl bg-primary-container/20 border-2 border-primary-container/50 flex items-center justify-center glow-violet">
                      <span className="text-4xl font-bold font-headline text-primary-container">{name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-status-online flex items-center justify-center glow-emerald">
                      <Icon name="check" size="sm" filled className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold font-headline text-white mb-1">AGENT INITIALIZED</h3>
                  <p className="text-xs text-on-surface-variant mb-6">{name.toUpperCase()} is ready for deployment</p>

                  <GlassPanel className="p-5 w-full max-w-sm mb-6">
                    <div className="space-y-2.5">
                      {[
                        ['Callsign', name.toUpperCase()],
                        ['Role', role],
                        ['Model', modelOptions.find(m => m.label === model)?.short || ''],
                        ['Autonomy', `${autonomy}%`],
                        ['Specialties', `${selectedTags.length} assigned`],
                        ['Trust Score', 'Calibrating...'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-on-surface-variant">{label}</span>
                          <span className={cn('font-headline', label === 'Trust Score' ? 'text-secondary' : 'text-white font-bold')}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </GlassPanel>

                  <div className="flex gap-3">
                    <button onClick={() => { resetForm() }} className="px-5 py-2.5 rounded-lg bg-surface-container-high border border-white/10 text-on-surface-variant hover:text-white text-xs font-bold uppercase tracking-wider transition-all">
                      Create Another
                    </button>
                    <button onClick={closeCreate} className="px-5 py-2.5 rounded-lg bg-primary-container text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet flex items-center gap-2">
                      <Icon name="assignment" size="sm" /> Assign Mission
                    </button>
                  </div>
                </div>
              ) : (
                /* Form */
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
                  <div className="space-y-5">
                    {/* Identity */}
                    <div>
                      <h3 className="font-headline font-bold text-white uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                        <Icon name="badge" size="sm" className="text-primary-container" /> Identity
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1.5">Callsign *</label>
                          <input
                            type="text" value={name}
                            onChange={e => { setName(e.target.value); if (touched.name) setErrors(validate()) }}
                            onBlur={() => handleBlur('name')}
                            placeholder="e.g. PHANTOM-6"
                            className={cn('w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 border focus:outline-none transition-all',
                              touched.name && errors.name ? 'border-status-offline/60' : 'border-white/5 focus:border-primary-container/30'
                            )}
                          />
                          {touched.name && errors.name && <p className="mt-1 text-[10px] text-status-offline flex items-center gap-1"><Icon name="error" size="sm" />{errors.name}</p>}
                        </div>
                        <div>
                          <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1.5">Role *</label>
                          <input
                            type="text" value={role}
                            onChange={e => { setRole(e.target.value); if (touched.role) setErrors(validate()) }}
                            onBlur={() => handleBlur('role')}
                            placeholder="e.g. Threat Intelligence Analyst"
                            className={cn('w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 border focus:outline-none transition-all',
                              touched.role && errors.role ? 'border-status-offline/60' : 'border-white/5 focus:border-primary-container/30'
                            )}
                          />
                          {touched.role && errors.role && <p className="mt-1 text-[10px] text-status-offline flex items-center gap-1"><Icon name="error" size="sm" />{errors.role}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Model */}
                    <div>
                      <h3 className="font-headline font-bold text-white uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                        <Icon name="memory" size="sm" className="text-secondary" /> Configuration
                      </h3>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {modelOptions.map(m => (
                          <button key={m.label} onClick={() => setModel(m.label)}
                            className={cn('text-left p-3 rounded-lg border transition-all',
                              model === m.label ? 'bg-primary-container/15 border-primary-container/40 text-white' : 'bg-surface-container-lowest border-white/5 text-on-surface-variant/60 hover:border-white/15'
                            )}>
                            <p className="text-xs font-bold font-headline">{m.short}</p>
                          </button>
                        ))}
                      </div>
                      <div>
                        <label className="block text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1.5">
                          Autonomy — <span className={cn(autonomy > 85 ? 'text-status-offline' : autonomy > 60 ? 'text-status-busy' : 'text-status-online')}>{autonomy}%</span>
                        </label>
                        <input type="range" min="0" max="100" value={autonomy} onChange={e => setAutonomy(Number(e.target.value))}
                          className="w-full h-1 bg-surface-container-low rounded-full appearance-none cursor-pointer accent-primary-container" />
                        {autonomy > 85 && <p className="mt-1 text-[10px] text-status-busy flex items-center gap-1"><Icon name="warning" size="sm" />High autonomy requires L5 clearance</p>}
                      </div>
                    </div>

                    {/* Specialties */}
                    <div>
                      <h3 className="font-headline font-bold text-white uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                        <Icon name="label" size="sm" className="text-status-online" /> Specialties *
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {specialtyOptions.map(tag => (
                          <button key={tag} onClick={() => toggleTag(tag)}
                            className={cn('px-3 py-1.5 rounded-full text-[10px] font-label uppercase tracking-wider border transition-all',
                              selectedTags.includes(tag)
                                ? 'bg-primary-container/20 border-primary-container/40 text-primary'
                                : 'bg-surface-container border-white/5 text-on-surface-variant/60 hover:border-primary-container/20'
                            )}>
                            {selectedTags.includes(tag) && <Icon name="check" size="sm" className="mr-1 align-middle" />}
                            {tag}
                          </button>
                        ))}
                      </div>
                      {touched.specialties && errors.specialties && <p className="mt-2 text-[10px] text-status-offline flex items-center gap-1"><Icon name="error" size="sm" />{errors.specialties}</p>}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="hidden lg:block">
                    <div className="glass-panel-subtle rounded-xl p-4 sticky top-0">
                      <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-3">Preview</p>
                      <div className="flex flex-col items-center mb-4">
                        <div className={cn('w-16 h-16 rounded-xl bg-surface-container border-2 flex items-center justify-center mb-2 transition-all',
                          name ? 'border-primary-container/40 glow-violet' : 'border-white/10'
                        )}>
                          <span className={cn('text-xl font-bold font-headline transition-colors', name ? 'text-primary-container' : 'text-on-surface-variant/20')}>
                            {name ? name.slice(0, 2).toUpperCase() : '??'}
                          </span>
                        </div>
                        <p className="font-headline font-bold text-white text-sm">{name || 'UNNAMED'}</p>
                        <p className="text-[9px] text-on-surface-variant/50 uppercase tracking-widest">{role || 'No role'}</p>
                      </div>
                      <div className="space-y-2 text-[10px]">
                        <div className="flex justify-between"><span className="text-on-surface-variant/50">Model</span><span className="text-white">{modelOptions.find(m => m.label === model)?.short}</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/50">Autonomy</span><span className="text-white">{autonomy}%</span></div>
                        <div className="flex justify-between"><span className="text-on-surface-variant/50">Tags</span><span className="text-primary">{selectedTags.length || 'None'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!submitted && (
              <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3 shrink-0">
                <button onClick={closeCreate} className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-white/10 text-on-surface-variant hover:text-white text-xs font-bold uppercase tracking-wider transition-all">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-primary-container text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? (
                    <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Initializing...</>
                  ) : (
                    <><Icon name="rocket_launch" size="sm" />Initialize Agent</>
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
