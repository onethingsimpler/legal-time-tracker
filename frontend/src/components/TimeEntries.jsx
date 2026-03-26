import React, { useMemo } from 'react'

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

export default function TimeEntries({ entries, clients, onEditEntry }) {
  const clientMap = useMemo(() => {
    const map = {}
    if (clients) clients.forEach(c => { map[c.id] = c })
    return map
  }, [clients])

  const enriched = useMemo(() => {
    if (!entries) return []
    return entries.map(e => {
      const client = clientMap[e.client_id]
      return {
        ...e,
        clientName: client?.name || 'Unassigned',
        clientColor: client?.color || '#94a3b8',
      }
    })
  }, [entries, clientMap])

  return (
    <div className="column ai-column">
      <div className="column-header ai-header">
        <div className="column-title">
          <span className="ai-header-icon">{'\u2728'}</span>
          AI Time Entries
          <span className="ai-live-badge">LIVE</span>
        </div>
        <div className="column-subtitle">Continuously generated from your activity</div>
      </div>

      <div className="column-body ai-entries-body">
        {enriched.length === 0 ? (
          <div className="ai-empty">
            <span className="ai-empty-icon">{'\u2728'}</span>
            <span>No entries yet</span>
          </div>
        ) : (
          <div className="ai-entries-list">
            {enriched.map((entry) => {
              const isAi = entry.source === 'ai_suggested'
              const isDraft = entry.status === 'draft'
              const confidence = entry.confidence || 0.95

              return (
                <div
                  key={entry.id}
                  className={`ai-entry-card ${isDraft ? 'draft' : 'confirmed'}`}
                  style={{ '--entry-color': entry.clientColor }}
                  onClick={() => onEditEntry(entry)}
                >
                  {isAi && <div className="ai-shimmer" />}
                  <div className="ai-entry-top">
                    <div className="ai-entry-client">
                      {isAi && <span className="ai-sparkle-badge">{'\u2728'}</span>}
                      {entry.clientName}
                      {!isDraft && <span className="confirmed-check">{'\u2713'}</span>}
                    </div>
                    <div className="ai-entry-time">
                      <span className="ai-entry-duration">{formatDuration(entry.duration_seconds)}</span>
                      {isAi && <span className="ai-confidence">{Math.round(confidence * 100)}%</span>}
                    </div>
                  </div>
                  <div className="ai-entry-desc">{entry.description}</div>
                  {isDraft && (
                    <div className="ai-entry-status">
                      <span className="pulse-dot" />
                      Awaiting review
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
