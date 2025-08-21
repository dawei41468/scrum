import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import usePlanningSessionWS from '../hooks/usePlanningSessionWS'
import { getPlanningSession, submitVote, revealVotes, setFinalEstimate } from '../api/planningApi'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Card from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { getRole, getUserId } from '../utils/auth'

const scaleValues = {
  fibonacci: ['0', '0.5', '1', '2', '3', '5', '8', '13', '21', '?', 'coffee'],
  modified_fibonacci: ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', 'coffee'],
  t_shirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', 'coffee']
}

export default function PlanningSessionPage() {
  const { sessionId } = useParams()
  const { add: toast } = useToast()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [finalEstimate, setFinalEstimateInput] = useState('')

  const role = getRole()
  const userId = getUserId()

  const { connected, voteCount, participants, revealed } = usePlanningSessionWS(sessionId)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const data = await getPlanningSession(sessionId)
        if (!mounted) return
        setSession(data)
      } catch (e) {
        if (!mounted) return
        setError('Failed to load session')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    if (sessionId) load()
    return () => { mounted = false }
  }, [sessionId])

  const values = useMemo(() => {
    const scale = session?.scale || 'fibonacci'
    return scaleValues[scale] || scaleValues.fibonacci
  }, [session?.scale])

  async function onVote(val) {
    if (!sessionId) return
    setSubmitting(true)
    try {
      await submitVote(sessionId, val)
      toast({ variant: 'success', title: `Voted ${val}` })
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to submit vote'
      toast({ variant: 'error', title: msg })
    } finally {
      setSubmitting(false)
    }
  }

  async function onReveal() {
    if (!sessionId) return
    setSubmitting(true)
    try {
      await revealVotes(sessionId)
      toast({ variant: 'success', title: 'Votes revealed' })
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to reveal votes'
      toast({ variant: 'error', title: msg })
    } finally {
      setSubmitting(false)
    }
  }

  async function onSetEstimate() {
    if (!sessionId) return
    if (!finalEstimate.trim()) return
    setSubmitting(true)
    try {
      await setFinalEstimate(sessionId, finalEstimate.trim())
      toast({ variant: 'success', title: 'Final estimate set' })
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Failed to set estimate'
      toast({ variant: 'error', title: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-4">Loading session...</div>
  if (error) return <div className="p-4 text-red-600">{error}</div>
  if (!session) return <div className="p-4">Session not found</div>

  const canReveal = (userId && (session.created_by === userId || ['product_owner', 'scrum_master'].includes(role || '')))

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <Card>
        <div className="p-4 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-gray-600">Session</div>
              <div className="flex items-center gap-2">
                <div
                  className="font-medium font-mono text-xs sm:text-sm max-w-[180px] sm:max-w-[360px] truncate"
                  title={sessionId}
                >
                  {sessionId}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(sessionId)
                      toast({ variant: 'success', title: 'Session ID copied' })
                    } catch (_) {
                      /* no-op */
                    }
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-sm text-gray-600">Scale</div>
              <div className="font-medium">{session.scale}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div>Connected: {connected ? 'Yes' : 'No'}</div>
            <div>Votes: {voteCount}</div>
            <div>Participants: {participants.size}</div>
          </div>
        </div>
      </Card>

      {session.status === 'voting' && (
        <Card>
          <div className="p-4 space-y-3">
            <div className="text-sm text-gray-700">Cast your vote</div>
            <div className="flex flex-wrap gap-2">
              {values.map((v) => (
                <Button key={v} size="sm" onClick={() => onVote(v)} disabled={submitting}>
                  {v}
                </Button>
              ))}
            </div>
            <div>
              <Button variant="secondary" onClick={onReveal} disabled={submitting || !canReveal}>
                Reveal votes
              </Button>
            </div>
          </div>
        </Card>
      )}

      {revealed && (
        <Card>
          <div className="p-4 space-y-3">
            <div className="text-sm text-gray-700">Results</div>
            <div className="text-sm text-gray-600">Average: {revealed.average ?? '-'} | Median: {revealed.median ?? '-'}</div>
            <ul className="text-sm list-disc pl-5">
              {revealed.votes.map((v) => (
                <li key={v.id || v.user_id}>
                  {(v.username || `User ${String(v.user_id).slice(-6)}`)}: <span className="font-medium">{v.value}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <Input placeholder="Final estimate" value={finalEstimate} onChange={(e) => setFinalEstimateInput(e.target.value)} />
              <Button onClick={onSetEstimate} disabled={submitting}>Set estimate</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
