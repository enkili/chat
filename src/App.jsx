import { useEffect, useMemo, useRef, useState } from 'react'
import { useEphemeralChat } from './lib/useEphemeralChat'
import { firebaseMode } from './lib/firebase'

const statusConfig = {
  idle: { label: 'Ready', color: 'bg-amber-400' },
  connecting: { label: 'Connecting', color: 'bg-blue-400 animate-pulse' },
  connected: { label: 'Live', color: 'bg-emerald-500' },
  error: { label: 'Error', color: 'bg-red-500' },
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'sending...'
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(timestamp)
}

function StatusBadge({ status }) {
  const { label, color } = statusConfig[status]
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-text-secondary">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </div>
  )
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="max-w-xs text-sm text-text-muted">{subtitle}</p>
    </div>
  )
}

function MessageBubble({ message, isMine }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md ${
          isMine
            ? 'rounded-br-md bg-brand-600 text-white'
            : 'rounded-bl-md bg-white text-text-primary border border-border'
        }`}
      >
        <div className={`mb-1 flex items-center justify-between gap-4 text-xs ${
          isMine ? 'text-blue-100' : 'text-text-muted'
        }`}>
          <span className="font-medium">{message.displayName}</span>
          <time>{formatTime(message.sentAt)}</time>
        </div>
        <p className="m-0 text-sm leading-relaxed">{message.text}</p>
        <button
          onClick={handleCopy}
          className={`mt-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-all ${
            isMine
              ? 'text-blue-100 hover:text-white hover:bg-white/10'
              : 'text-text-muted hover:text-text-primary hover:bg-slate-100'
          }`}
          title="Copy message"
        >
          {copied ? (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied</span>
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function App() {
  const [displayName, setDisplayName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [draft, setDraft] = useState('')
  const [joined, setJoined] = useState(false)
  const [copied, setCopied] = useState(false)
  const messagesEndRef = useRef(null)

  const chat = useEphemeralChat({ roomCode, displayName, active: joined })

  const shareLink = useMemo(() => {
    if (!chat.roomId) return ''
    const url = new URL(window.location.href)
    url.searchParams.set('room', chat.roomId)
    return url.toString()
  }, [chat.roomId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const incomingRoom = params.get('room')
    if (incomingRoom) setRoomCode(incomingRoom)
  }, [])

  useEffect(() => { setDraft('') }, [chat.sessionKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages])

  const joinChat = (e) => {
    e.preventDefault()
    if (!displayName.trim() || !roomCode.trim()) return
    setJoined(true)
  }

  const leaveChat = () => { setJoined(false); setDraft('') }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    await chat.sendMessage(draft)
    setDraft('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const copyInvite = async () => {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-md shadow-brand-600/25">
            m
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">messageSync</h1>
            <p className="text-xs text-text-muted">C&C</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={chat.status} />
          <span className="text-xs text-text-muted">
            {chat.firebaseReady
              ? firebaseMode === 'emulator' ? 'Emulator' : 'Cloud'
              : 'Not configured'}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 flex-col gap-5 lg:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
            <form className="flex flex-col gap-3.5" onSubmit={joinChat}>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
                  Display name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={24}
                  className="w-full rounded-xl border border-border bg-surface-dim px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-border-focus focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
                  Room code
                </label>
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="e.g. product-sync"
                  maxLength={32}
                  className="w-full rounded-xl border border-border bg-surface-dim px-3.5 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-border-focus focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <button
                type="submit"
                disabled={!displayName.trim() || !roomCode.trim()}
                className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm"
              >
                {joined ? 'Reconnect' : 'Join room'}
              </button>
            </form>
          </div>

          {/* Info card */}
          <div className="rounded-2xl border border-border bg-white/70 p-4 shadow-sm">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">How it works</h3>
            <ul className="space-y-1.5 text-xs leading-relaxed text-text-secondary">
              <li className="flex gap-2"><span className="text-text-muted">&#x2022;</span>Same room code = same conversation</li>
              <li className="flex gap-2"><span className="text-text-muted">&#x2022;</span>Rejoining starts a fresh session</li>
              <li className="flex gap-2"><span className="text-text-muted">&#x2022;</span>Messages don't survive refreshes</li>
            </ul>
          </div>

          {chat.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {chat.error}
            </div>
          )}
        </aside>

        {/* Chat panel */}
        <section className="flex min-h-[500px] flex-1 flex-col rounded-2xl border border-border bg-white shadow-sm">
          {/* Chat header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-sm">
                #
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  {chat.roomId || 'No room'}
                </h2>
                <p className="text-xs text-text-muted">
                  Session {chat.sessionKey ?? '—'} &middot; {chat.participants.length} online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyInvite}
                disabled={!shareLink}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied ? '✓ Copied' : 'Invite'}
              </button>
              <button
                type="button"
                onClick={chat.resetRoom}
                disabled={!joined || chat.status !== 'connected'}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary transition-all hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={leaveChat}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50"
              >
                Leave
              </button>
            </div>
          </div>

          {/* Participants */}
          {joined && chat.participants.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-2.5">
              {chat.participants.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {p.displayName}
                </span>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="messages-scroll flex flex-1 flex-col gap-3 overflow-y-auto p-5">
            {!joined ? (
              <EmptyState
                icon="💬"
                title="Join a room to start"
                subtitle="Enter your name and a room code, then share the invite link with someone."
              />
            ) : chat.messages.length === 0 ? (
              <EmptyState
                icon="✨"
                title="Fresh session"
                subtitle="Send the first message. Refreshing or reconnecting starts a new thread."
              />
            ) : (
              <>
                {chat.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isMine={message.senderId === chat.clientId}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Composer */}
          <form
            className="flex items-end gap-3 border-t border-border px-5 py-3.5"
            onSubmit={handleSend}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={joined ? 'Type a message... (Enter to send)' : 'Join a room first'}
              rows={1}
              disabled={!joined || chat.status !== 'connected'}
              className="min-h-[40px] max-h-32 flex-1 resize-none rounded-xl border border-border bg-surface-dim px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all focus:border-border-focus focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!draft.trim() || !joined || chat.status !== 'connected'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default App