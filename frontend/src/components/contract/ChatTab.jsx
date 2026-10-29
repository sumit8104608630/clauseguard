import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Bot, MessageSquare, Quote, Send, User } from 'lucide-react'
import { api, streamChat } from '../../lib/api'
import { formatRelative } from '../../lib/format'
import ChatMessage from './ChatMessage'
import Spinner from '../Spinner'
import EmptyState from '../EmptyState'

const SUGGESTIONS = [
  'What are the biggest risks in this contract?',
  'How long do the confidentiality obligations last?',
  'What notice is required to terminate?',
]

/** Normalise a stored message (snake_case from the API) for the transcript. */
function fromHistory(message) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citedClauseIds: message.cited_clause_ids ?? [],
    createdAt: message.created_at,
  }
}

export default function ChatTab({ contractId, clauses, canAsk }) {
  const scrollRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)

  // Resolve citation ids against the clauses we already fetched.
  const clausesById = new Map((clauses ?? []).map((clause) => [clause.id, clause]))

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getChatHistory(contractId)
      setMessages((data ?? []).map(fromHistory))
    } catch (err) {
      // A contract that was never chatted with simply has no history.
      if (err.status !== 404) {
        setError(err.message || 'Could not load the conversation')
      }
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages])

  async function handleSend(event) {
    event.preventDefault()

    const question = draft.trim()
    if (!question || sending) return

    const userMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: question,
      citedClauseIds: [],
      createdAt: new Date().toISOString(),
    }
    const answerId = `local-assistant-${Date.now()}`

    setMessages((previous) => [
      ...previous,
      userMessage,
      {
        id: answerId,
        role: 'assistant',
        content: '',
        citedClauseIds: [],
        createdAt: new Date().toISOString(),
        streaming: true,
      },
    ])

    setDraft('')
    setSending(true)
    setError(null)

    try {
      await streamChat(contractId, question, {
        onCitations: (clauseIds) => {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === answerId
                ? { ...message, citedClauseIds: clauseIds }
                : message,
            ),
          )
        },
        onToken: (token) => {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === answerId
                ? { ...message, content: message.content + token }
                : message,
            ),
          )
        },
      })
    } catch (err) {
      setError(err.message || 'The answer could not be completed')
      // Drop an empty placeholder so the transcript does not keep a blank bubble.
      setMessages((previous) =>
        previous.filter(
          (message) => !(message.id === answerId && !message.content),
        ),
      )
    } finally {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === answerId ? { ...message, streaming: false } : message,
        ),
      )
      setSending(false)
    }
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant' && !message.streaming)

  return (
    <div className="space-y-4">
      <div className="card flex h-[68dvh] max-h-[720px] min-h-[420px] flex-col overflow-hidden lg:h-[600px]">
        {/* Transcript */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Ask about this contract"
              description="Answers are generated from this contract's own clauses, and every reply cites the clauses it used."
            />
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user'

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isUser
                        ? 'bg-slate-200 text-slate-600'
                        : 'bg-brand-100 text-brand-700'
                    }`}
                  >
                    {isUser ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </span>

                  <div
                    className={`max-w-[88%] rounded-lg px-3.5 py-2.5 sm:max-w-[78%] ${
                      isUser
                        ? 'bg-slate-800 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {message.content ? (
                      isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      ) : (
                        <ChatMessage content={message.content} />
                      )
                    ) : message.streaming ? (
                      <p className="flex items-center gap-2 text-sm text-slate-500">
                        <Spinner size="sm" />
                        Thinking…
                      </p>
                    ) : null}

                    {message.citedClauseIds?.length ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2">
                        <Quote className="h-3 w-3 text-slate-400" />
                        {message.citedClauseIds.map((clauseId) => {
                          const clause = clausesById.get(clauseId)
                          const label =
                            clause?.section_label ??
                            (clause
                              ? `Clause #${clause.chunk_index}`
                              : 'Clause not loaded')

                          return (
                            <span
                              key={clauseId}
                              className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200 ring-inset"
                              title={
                                clause?.text?.slice(0, 200) ?? 'Clause not loaded'
                              }
                            >
                              {label}
                            </span>
                          )
                        })}
                      </div>
                    ) : null}

                    <p className="mt-1.5 text-[10px] text-slate-400">
                      {message.streaming ? 'Streaming…' : formatRelative(message.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 bg-slate-50 p-2.5 sm:p-3">
          {error ? (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
              <p className="text-xs text-rose-800">{error}</p>
            </div>
          ) : null}

          {messages.length === 0 && !loading ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={!canAsk || sending}
                  onClick={() => setDraft(suggestion)}
                  className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!canAsk || sending}
              placeholder={
                canAsk
                  ? 'Ask a question about this contract…'
                  : 'Process the contract first to extract its clauses'
              }
              className="input flex-1"
            />

            <button
              type="submit"
              aria-label="Send message"
              disabled={!canAsk || sending || !draft.trim()}
              className="btn btn-primary btn-sm shrink-0"
            >
              {sending ? (
                <Spinner size="sm" className="h-3.5! w-3.5!" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          <p className="mt-2 text-[11px] text-slate-500">
            {lastAssistant?.citedClauseIds?.length
              ? `Last answer was grounded in ${lastAssistant.citedClauseIds.length} clause${lastAssistant.citedClauseIds.length === 1 ? '' : 's'}.`
              : 'Answers are limited to the clauses extracted from this contract.'}
          </p>
        </div>
      </div>
    </div>
  )
}
