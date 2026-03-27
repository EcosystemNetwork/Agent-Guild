import { useState, useRef, useCallback } from 'react'
import { streamMessage } from '../lib/api'
import type { ChatCompletionMessage } from '../lib/api'
import {
  deriveSessionKey,
  resetSessionKey,
  resolveAgentId,
  saveSessionMeta,
  clearSessionMeta,
  loadSessionMeta,
} from '../api/openclaw'
import type { SessionMeta } from '../api/openclaw'
import type { ChatMessage, ChatChannel } from '../data/chat'
import { missionContext } from '../data/chat'
import { useAirbyte } from '../contexts/AirbyteContext'

interface UseChatOptions {
  channel: ChatChannel
  initialMessages: ChatMessage[]
}

interface UseChatReturn {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string
  sessionKey: string
  sendMessage: (content: string) => void
  resetSession: () => void
}

export function useChat({ channel, initialMessages }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sessionKey, setSessionKey] = useState(() => {
    const stored = loadSessionMeta()[channel.id]
    return stored?.sessionKey || deriveSessionKey(channel)
  })
  const abortRef = useRef<AbortController | null>(null)
  const streamContentRef = useRef('')
  const { getMissionContext } = useAirbyte()

  const buildHistory = useCallback((msgs: ChatMessage[]): ChatCompletionMessage[] => {
    const history: ChatCompletionMessage[] = []

    // Prepend mission context as system message — prefer live Airbyte-synced
    // context, fall back to static fixture for unmapped missions
    if (channel.missionId) {
      const airbyteContexts = getMissionContext(channel.missionId)

      if (airbyteContexts.length > 0) {
        // Build rich context from synced sources
        const lines: string[] = [`Mission: ${channel.missionId}`]
        for (const src of airbyteContexts) {
          lines.push(`\n[Source: ${src.sourceName} — synced ${src.lastSyncAt ? new Date(src.lastSyncAt).toLocaleTimeString() : 'never'}]`)
          for (const rec of src.records) {
            lines.push(`  ${rec.stream}: ${JSON.stringify(rec.data)}`)
          }
        }
        history.push({ role: 'system', content: lines.join('\n') })
      } else {
        // Fallback to static fixture
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

    // Map chat messages to OpenClaw format
    for (const m of msgs) {
      if (m.type !== 'message') continue
      history.push({
        role: m.from === 'Commander Kai' ? 'user' : 'assistant',
        content: m.content,
      })
    }

    return history
  }, [channel.missionId, getMissionContext])

  // Determine the responding agent for this channel
  const getRespondingAgent = useCallback(() => {
    if (channel.missionId) {
      const ctx = missionContext[channel.missionId]
      const name = ctx?.agents[0] || 'AGENT'
      return { name, avatar: name.slice(0, 2) }
    }
    return { name: 'ORACLE-1', avatar: 'O1' }
  }, [channel.missionId])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || isStreaming) return

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      from: 'Commander Kai',
      fromAvatar: 'CK',
      to: channel.id,
      content: content.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      channel: channel.id,
      type: 'message',
    }

    setMessages(prev => {
      const updated = [...prev, userMsg]

      // Start streaming
      setIsStreaming(true)
      setStreamingContent('')
      streamContentRef.current = ''

      const agentId = resolveAgentId(channel)
      const history = buildHistory(updated)
      const responder = getRespondingAgent()

      streamMessage(
        { agentId, sessionKey, messages: history },
        (chunk) => {
          streamContentRef.current += chunk
          setStreamingContent(streamContentRef.current)
        },
        () => {
          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now()}-resp`,
            from: responder.name,
            fromAvatar: responder.avatar,
            to: channel.id,
            content: streamContentRef.current,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            channel: channel.id,
            type: 'message',
          }
          setMessages(prev => [...prev, assistantMsg])
          setIsStreaming(false)
          setStreamingContent('')
          streamContentRef.current = ''
          abortRef.current = null
        },
        (error) => {
          const errorMsg: ChatMessage = {
            id: `msg-${Date.now()}-err`,
            from: 'SYSTEM',
            fromAvatar: 'SY',
            to: channel.id,
            content: `Comms error: ${error.message}`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            channel: channel.id,
            type: 'alert',
          }
          setMessages(prev => [...prev, errorMsg])
          setIsStreaming(false)
          setStreamingContent('')
          streamContentRef.current = ''
          abortRef.current = null
        },
      ).then(controller => {
        abortRef.current = controller
      })

      return updated
    })

    // Persist session metadata
    const meta: SessionMeta = {
      guildMissionId: channel.missionId,
      agentId: resolveAgentId(channel),
      sessionKey,
      createdAt: new Date().toISOString(),
    }
    saveSessionMeta(channel.id, meta)
  }, [channel, sessionKey, isStreaming, buildHistory, getRespondingAgent])

  const resetSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null

    const newKey = resetSessionKey(channel.id)
    setSessionKey(newKey)
    clearSessionMeta(channel.id)

    const resetMsg: ChatMessage = {
      id: `msg-${Date.now()}-reset`,
      from: 'SYSTEM',
      fromAvatar: 'SY',
      to: channel.id,
      content: 'Session memory reset — new conversation context started.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      channel: channel.id,
      type: 'system',
    }
    setMessages(prev => [...prev, resetMsg])
    setIsStreaming(false)
    setStreamingContent('')
    streamContentRef.current = ''
  }, [channel.id])

  return {
    messages,
    isStreaming,
    streamingContent,
    sessionKey,
    sendMessage,
    resetSession,
  }
}
