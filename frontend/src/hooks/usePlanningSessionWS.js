import { useEffect, useMemo, useRef, useState } from 'react'
import { connectPlanningWS } from '../api/planningWs'

function getToken() {
  try {
    return localStorage.getItem('token') || null
  } catch {
    return null
  }
}

// usePlanningSessionWS manages a planning session's live state via WS
// State exposed:
// - participants: Map of user_id -> { username }
// - voteCount: number (live)
// - revealed: { votes: Array, average, median } | null
// - connected: boolean
export default function usePlanningSessionWS(sessionId) {
  const [connected, setConnected] = useState(false)
  const [voteCount, setVoteCount] = useState(0)
  const [participants, setParticipants] = useState(() => new Map())
  const [revealed, setRevealed] = useState(null)
  const connRef = useRef(null)

  useEffect(() => {
    if (!sessionId) return
    const token = getToken()
    if (!token) return

    const handle = ({ type, ...payload }) => {
      if (type === 'joined') {
        setParticipants((prev) => {
          const next = new Map(prev)
          if (payload.user_id) next.set(payload.user_id, { username: payload.username })
          return next
        })
      } else if (type === 'left') {
        setParticipants((prev) => {
          const next = new Map(prev)
          if (payload.user_id) next.delete(payload.user_id)
          return next
        })
      } else if (type === 'vote_submitted') {
        if (typeof payload.vote_count === 'number') setVoteCount(payload.vote_count)
      } else if (type === 'votes_revealed') {
        setRevealed({ votes: payload.votes || [], average: payload.average, median: payload.median })
      } else if (type === 'session_completed') {
        // Keep revealed, but could also mark completed
      } else if (type === 'session_created') {
        // noop for now
      }
    }

    const { socket, disconnect } = connectPlanningWS({ sessionId, token, onMessage: handle })
    connRef.current = { socket, disconnect }
    setConnected(true)

    return () => {
      setConnected(false)
      try { disconnect() } catch {}
      connRef.current = null
    }
  }, [sessionId])

  return { connected, voteCount, participants, revealed }
}
