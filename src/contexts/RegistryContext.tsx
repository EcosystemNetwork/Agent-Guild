import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AgentRegistryEntry, ConnectionStatus } from '../types'
import { agentRegistry as initialRegistry } from '../data/registry'

interface RegistryContextValue {
  registry: AgentRegistryEntry[]
  getEntry: (guildAgentId: string) => AgentRegistryEntry | undefined
  rebind: (guildAgentId: string, newOpenclawAgentId: string) => void
  updateConnectionStatus: (guildAgentId: string, status: ConnectionStatus) => void
}

const RegistryContext = createContext<RegistryContextValue | null>(null)

export function RegistryProvider({ children }: { children: ReactNode }) {
  const [registry, setRegistry] = useState<AgentRegistryEntry[]>(initialRegistry)

  const getEntry = useCallback(
    (guildAgentId: string) => registry.find(e => e.guildAgentId === guildAgentId),
    [registry],
  )

  const rebind = useCallback((guildAgentId: string, newOpenclawAgentId: string) => {
    setRegistry(prev =>
      prev.map(entry =>
        entry.guildAgentId === guildAgentId
          ? { ...entry, openclawAgentId: newOpenclawAgentId, lastActivity: 'just now' }
          : entry,
      ),
    )
  }, [])

  const updateConnectionStatus = useCallback((guildAgentId: string, status: ConnectionStatus) => {
    setRegistry(prev =>
      prev.map(entry =>
        entry.guildAgentId === guildAgentId
          ? { ...entry, connectionStatus: status, lastActivity: 'just now' }
          : entry,
      ),
    )
  }, [])

  return (
    <RegistryContext.Provider value={{ registry, getEntry, rebind, updateConnectionStatus }}>
      {children}
    </RegistryContext.Provider>
  )
}

export function useRegistry() {
  const ctx = useContext(RegistryContext)
  if (!ctx) throw new Error('useRegistry must be used within RegistryProvider')
  return ctx
}
