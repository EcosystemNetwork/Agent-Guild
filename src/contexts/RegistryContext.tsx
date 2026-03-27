import { createContext, useContext, useCallback, type ReactNode } from 'react'
import type { AgentRegistryEntry, ConnectionStatus } from '../types'
import { useData } from './DataContext'

interface RegistryContextValue {
  registry: AgentRegistryEntry[]
  getEntry: (guildAgentId: string) => AgentRegistryEntry | undefined
  rebind: (guildAgentId: string, newAgentRecordId: string) => void
  updateConnectionStatus: (guildAgentId: string, status: ConnectionStatus) => void
}

const RegistryContext = createContext<RegistryContextValue | null>(null)

export function RegistryProvider({ children }: { children: ReactNode }) {
  const { registry, updateRegistryEntry } = useData()

  const getEntry = useCallback(
    (guildAgentId: string) => registry.find(e => e.guildAgentId === guildAgentId),
    [registry],
  )

  const rebind = useCallback((guildAgentId: string, newAgentRecordId: string) => {
    updateRegistryEntry(guildAgentId, { agentRecordId: newAgentRecordId, lastActivity: 'just now' })
  }, [updateRegistryEntry])

  const updateConnectionStatus = useCallback((guildAgentId: string, status: ConnectionStatus) => {
    updateRegistryEntry(guildAgentId, { connectionStatus: status, lastActivity: 'just now' })
  }, [updateRegistryEntry])

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
