import { useEffect, useMemo, useState } from 'react'
import { useEphemeralChat } from './lib/useEphemeralChat'
import { firebaseMode } from './lib/firebase'

const statusLabel = {
  idle: 'Ready',
  connecting: 'Connecting',
  connected: 'Live',
  error: 'Needs attention',
}

const formatTime = (timestamp) => {
  if (!timestamp) {
    return 'sending...'
  }

  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

function App() {
  const [displayName, setDisplayName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [draft, setDraft] = useState('')
  const [joined, setJoined] = useState(false)
  const [copied, setCopied] = useState(false)

  const chat = useEphemeralChat({
    roomCode,
    displayName,
    active: joined,
  })

  const shareLink = useMemo(() => {
    if (!chat.roomId) {
      return ''
    }

    const url = new URL(window.location.href)
    url.searchParams.set('room', chat.roomId)
    return url.toString()
  }, [chat.roomId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const incomingRoom = params.get('room')

    if (incomingRoom) {
      setRoomCode(incomingRoom)
    }
  }, [])

  useEffect(() => {
    setDraft('')
  }, [chat.sessionKey])

  const joinChat = (event) => {
    event.preventDefault()

    if (!displayName.trim() || !roomCode.trim()) {
      return
    }

    setJoined(true)
  }

  const leaveChat = () => {
    setJoined(false)
    setDraft('')
  }

  const handleSend = async (event) => {
    event.preventDefault()
    await chat.sendMessage(draft)
    setDraft('')
  }

  const copyInvite = async () => {
    if (!shareLink) {
      return
    }

    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Ignore clipboard failures in unsupported contexts.
    }
  }

  return (
    <main className="shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Firebase realtime demo</p>
          <h1>messageSync</h1>
          <p className="lede">
            A transient chat room for two people. Opening the same room in a new session clears the thread and starts fresh.
          </p>
        </div>

        <div className="status-panel">
          <div>
            <span className={`status-dot status-${chat.status}`} />
            <strong>{statusLabel[chat.status]}</strong>
          </div>
          <p>
            {chat.firebaseReady
              ? firebaseMode === 'emulator'
                ? 'Connected for local emulator mode.'
                : 'Firebase is configured.'
              : 'Add your Firebase env values to connect.'}
          </p>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <form className="join-form" onSubmit={joinChat}>
            <label>
              <span>Name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Avery"
                maxLength={24}
              />
            </label>

            <label>
              <span>Room code</span>
              <input
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value)}
                placeholder="product-sync"
                maxLength={32}
              />
            </label>

            <button type="submit" disabled={!displayName.trim() || !roomCode.trim()}>
              {joined ? 'Reconnect to room' : 'Join room'}
            </button>
          </form>

          <div className="hint-card">
            <h2>How it behaves</h2>
            <ul>
              <li>Only people in the same room code see each other.</li>
              <li>Joining or resetting starts a fresh session and hides older messages.</li>
              <li>Messages are not meant to survive refreshes or reconnects.</li>
            </ul>
          </div>

          {chat.error ? <p className="error-banner">{chat.error}</p> : null}
        </aside>

        <section className="chat-panel">
          <header className="chat-header">
            <div>
              <p className="eyebrow">Room</p>
              <h2>{chat.roomId || 'Not connected yet'}</h2>
            </div>

            <div className="header-actions">
              <button type="button" className="secondary" onClick={copyInvite} disabled={!shareLink}>
                {copied ? 'Invite copied' : 'Copy invite'}
              </button>
              <button type="button" className="secondary" onClick={chat.resetRoom} disabled={!joined || chat.status !== 'connected'}>
                Reset chat
              </button>
              <button type="button" className="secondary" onClick={leaveChat}>
                Leave
              </button>
            </div>
          </header>

          <div className="room-meta">
            <span>Session {chat.sessionKey ?? '—'}</span>
            <span>{chat.participants.length} participant{chat.participants.length === 1 ? '' : 's'} live</span>
            <span>Ephemeral thread</span>
          </div>

          <div className="participants-strip">
            {chat.participants.length === 0 ? (
              <span>Waiting for someone else to join this room.</span>
            ) : (
              chat.participants.map((participant) => <span key={participant.id}>{participant.displayName}</span>)
            )}
          </div>

          <div className="messages">
            {!joined ? (
              <div className="empty-state">
                <h3>Join a room to start chatting</h3>
                <p>Share the room code or invite link with one other person.</p>
              </div>
            ) : chat.messages.length === 0 ? (
              <div className="empty-state">
                <h3>Fresh session</h3>
                <p>Send the first message. Refreshing or reconnecting starts over.</p>
              </div>
            ) : (
              chat.messages.map((message) => (
                <article
                  key={message.id}
                  className={`message-card ${message.senderId === chat.clientId ? 'mine' : ''}`}
                >
                  <div className="message-meta">
                    <strong>{message.displayName}</strong>
                    <time>{formatTime(message.sentAt)}</time>
                  </div>
                  <p>{message.text}</p>
                </article>
              ))
            )}
          </div>

          <form className="composer" onSubmit={handleSend}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={joined ? 'Type a quick message' : 'Join a room first'}
              rows={3}
              disabled={!joined || chat.status !== 'connected'}
            />
            <button type="submit" disabled={!draft.trim() || !joined || chat.status !== 'connected'}>
              Send now
            </button>
          </form>
        </section>
      </section>
    </main>
  )
}

export default App