import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { MissionExecution, MissionLaunchRequest, OperatorAction, ToolAction } from '../types'
import {
  launchMission as runnerLaunch,
  approveMission as runnerApprove,
  handleOperatorAction as runnerOperatorAction,
  executeToolAction as runnerToolAction,
  getAllExecutions,
  subscribe,
} from '../services/missionRunner'

interface MissionContextValue {
  executions: MissionExecution[]
  launchMission: (request: MissionLaunchRequest) => MissionExecution
  approveMission: (missionId: string) => void
  operatorAction: (missionId: string, action: OperatorAction) => void
  executeToolAction: (missionId: string, toolName: string, input: Record<string, unknown>) => Promise<ToolAction>
  getExecution: (missionId: string) => MissionExecution | undefined
}

const MissionCtx = createContext<MissionContextValue | null>(null)

export function MissionProvider({ children }: { children: ReactNode }) {
  const [executions, setExecutions] = useState<MissionExecution[]>([])

  // Subscribe to all mission updates
  useEffect(() => {
    const unsub = subscribe('*', () => {
      setExecutions(getAllExecutions())
    })
    return unsub
  }, [])

  const launch = useCallback((request: MissionLaunchRequest) => {
    const mission = runnerLaunch(request)
    setExecutions(getAllExecutions())
    return mission
  }, [])

  const approve = useCallback((missionId: string) => {
    runnerApprove(missionId)
    setExecutions(getAllExecutions())
  }, [])

  const opAction = useCallback((missionId: string, action: OperatorAction) => {
    runnerOperatorAction(missionId, action)
    setExecutions(getAllExecutions())
  }, [])

  const toolAction = useCallback(async (missionId: string, toolName: string, input: Record<string, unknown>) => {
    const result = await runnerToolAction(missionId, toolName, input)
    setExecutions(getAllExecutions())
    return result
  }, [])

  const getExecution = useCallback((missionId: string) => {
    return executions.find(e => e.id === missionId)
  }, [executions])

  return (
    <MissionCtx.Provider value={{
      executions,
      launchMission: launch,
      approveMission: approve,
      operatorAction: opAction,
      executeToolAction: toolAction,
      getExecution,
    }}>
      {children}
    </MissionCtx.Provider>
  )
}

export function useMissions() {
  const ctx = useContext(MissionCtx)
  if (!ctx) throw new Error('useMissions must be used within MissionProvider')
  return ctx
}
