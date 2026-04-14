import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  get,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { database, firebaseReady } from './firebase'

const normalizeRoomId = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)

const toSortedList = (snapshotValue) => {
  if (!snapshotValue) {
    return []
  }

  return Object.entries(snapshotValue)
    .map(([id, item]) => ({ id, ...item }))
    .sort((left, right) => (left.sentAt ?? 0) - (right.sentAt ?? 0))
}

export const useEphemeralChat = ({ roomCode, displayName, active }) => {
  const clientIdRef = useRef(globalThis.crypto?.randomUUID?.() ?? `guest-${Math.random().toString(36).slice(2, 10)}`)
  const [sessionKey, setSessionKey] = useState(null)
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const roomId = useMemo(() => normalizeRoomId(roomCode), [roomCode])
  const canConnect = active && firebaseReady && roomId && displayName.trim()

  useEffect(() => {
    if (!active) {
      setSessionKey(null)
      setParticipants([])
      setMessages([])
      setStatus('idle')
      setError('')
      return undefined
    }

    if (!firebaseReady) {
      setStatus('error')
      setError('Firebase config is missing. Add the Vite env values before connecting.')
      return undefined
    }

    if (!roomId || !displayName.trim()) {
      setStatus('idle')
      return undefined
    }

    let cancelled = false
    const stateRef = ref(database, `rooms/${roomId}/state`)

    const joinRoom = async () => {
      setStatus('connecting')
      setError('')

      try {
        const transaction = await runTransaction(stateRef, (current) => {
          const nextSessionKey = (current?.currentSessionKey ?? 0) + 1

          return {
            currentSessionKey: nextSessionKey,
            updatedAt: Date.now(),
          }
        })

        if (!transaction.committed || cancelled) {
          return
        }

        const nextSessionKey = transaction.snapshot.val()?.currentSessionKey

        if (typeof nextSessionKey !== 'number') {
          throw new Error('Unable to start a chat session.')
        }

        if (nextSessionKey > 1) {
          await remove(ref(database, `rooms/${roomId}/sessions/${nextSessionKey - 1}`))
        }

        setSessionKey(nextSessionKey)
        setStatus('connected')
      } catch (joinError) {
        if (!cancelled) {
          setStatus('error')
          setError(joinError instanceof Error ? joinError.message : 'Unable to connect to the room.')
        }
      }
    }

    joinRoom()

    const unsubscribe = onValue(stateRef, (snapshot) => {
      const nextSessionKey = snapshot.val()?.currentSessionKey

      if (typeof nextSessionKey === 'number') {
        setSessionKey(nextSessionKey)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [active, displayName, roomId])

  useEffect(() => {
    if (!canConnect || sessionKey === null) {
      return undefined
    }

    const sessionRoot = `rooms/${roomId}/sessions/${sessionKey}`
    const participantRef = ref(database, `${sessionRoot}/participants/${clientIdRef.current}`)
    const participantsRef = ref(database, `${sessionRoot}/participants`)
    const messagesRef = ref(database, `${sessionRoot}/messages`)
    const stateRef = ref(database, `rooms/${roomId}/state`)

    setMessages([])

    set(participantRef, {
      displayName: displayName.trim(),
      joinedAt: Date.now(),
    }).catch((participantError) => {
      setStatus('error')
      setError(participantError instanceof Error ? participantError.message : 'Unable to register this participant.')
    })

    onDisconnect(participantRef).remove().catch(() => {})

    const unsubscribeParticipants = onValue(participantsRef, (snapshot) => {
      const nextParticipants = snapshot.val()
        ? Object.entries(snapshot.val())
            .map(([id, participant]) => ({ id, ...participant }))
            .sort((left, right) => (left.joinedAt ?? 0) - (right.joinedAt ?? 0))
        : []

      setParticipants(nextParticipants)
    })

    const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
      setMessages(toSortedList(snapshot.val()))
    })

    const cleanupIfEmpty = async () => {
      try {
        const remainingParticipants = await get(participantsRef)

        if (!remainingParticipants.exists()) {
          await remove(ref(database, sessionRoot))
          await update(stateRef, { updatedAt: Date.now() })
        }
      } catch {
        // Best-effort cleanup for demo sessions.
      }
    }

    return () => {
      unsubscribeParticipants()
      unsubscribeMessages()
      remove(participantRef)
        .catch(() => {})
        .finally(() => {
          cleanupIfEmpty()
        })
    }
  }, [canConnect, displayName, roomId, sessionKey])

  const sendMessage = useCallback(
    async (draft) => {
      const message = draft.trim()

      if (!message || !canConnect || sessionKey === null) {
        return
      }

      const messagesRef = ref(database, `rooms/${roomId}/sessions/${sessionKey}/messages`)
      const stateRef = ref(database, `rooms/${roomId}/state`)

      try {
        await push(messagesRef, {
          displayName: displayName.trim(),
          senderId: clientIdRef.current,
          text: message,
          sentAt: serverTimestamp(),
        })

        await update(stateRef, { updatedAt: Date.now() })
      } catch (sendError) {
        setStatus('error')
        setError(sendError instanceof Error ? sendError.message : 'Unable to send this message.')
      }
    },
    [canConnect, displayName, roomId, sessionKey],
  )

  const resetRoom = useCallback(async () => {
    if (!canConnect) {
      return
    }

    const stateRef = ref(database, `rooms/${roomId}/state`)

    try {
      const transaction = await runTransaction(stateRef, (current) => ({
        currentSessionKey: (current?.currentSessionKey ?? 0) + 1,
        updatedAt: Date.now(),
      }))

      const nextSessionKey = transaction.snapshot.val()?.currentSessionKey

      if (typeof nextSessionKey === 'number' && nextSessionKey > 1) {
        await remove(ref(database, `rooms/${roomId}/sessions/${nextSessionKey - 1}`))
      }
    } catch (resetError) {
      setStatus('error')
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset the room.')
    }
  }, [canConnect, roomId])

  return {
    clientId: clientIdRef.current,
    error,
    firebaseReady,
    messages,
    participants,
    roomId,
    sendMessage,
    sessionKey,
    status,
    resetRoom,
  }
}