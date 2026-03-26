import React, { useMemo, useState } from 'react'

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function TimeEntries({ entries, clients, activities, onEditEntry, onAssign }) {
  const [showUnassigned, setShowUnassigned] = useState(false)
  const [assigningId, setAssigningId] = useState(null)
  const [search, setSearch] = useState('')
  const clientMap = useMemo(() => {
    const map = {}
    if (clients) clients.forEach(c => { map[c.id] = c })
    return map
  }, [clients])

  // Compute totals from activities (always in sync)
  const { enriched, unassigned, totalSeconds } = useMemo(() => {
    if (!activities) return { enriched: [], unassigned: [], totalSeconds: 0 }

    const unassigned = []
    const byClient = {}

    activities.forEach(a => {
      if (!a.client_links || a.client_links.length === 0) {
        unassigned.push(a)
        return
      }
      const cid = a.client_links[0].client_id
      if (!byClient[cid]) byClient[cid] = { duration_seconds: 0, activities: [] }
      byClient[cid].duration_seconds += (a.duration_seconds || 0)
      byClient[cid].activities.push(a)
    })

    // Match with AI-generated descriptions from entries
    const entryByClient = {}
    if (entries) entries.forEach(e => { entryByClient[e.client_id] = e })

    const enriched = Object.entries(byClient).map(([cidStr, data]) => {
      const cid = Number(cidStr)
      const client = clientMap[cid]
      const aiEntry = entryByClient[cid]
      return {
        client_id: cid,
        clientName: client?.name || 'Unknown',
        clientColor: client?.color || '#94a3b8',
        duration_seconds: data.duration_seconds,
        description: aiEntry?.description || '',
        source: aiEntry?.source || 'manual',
        activities: data.activities,
      }
    }).sort((a, b) => b.duration_seconds - a.duration_seconds)

    const totalSeconds = enriched.reduce((sum, e) => sum + e.duration_seconds, 0)

    return { enriched, unassigned, totalSeconds }
  }, [activities, entries, clientMap])

  return (
    <div className="column ai-column">
      <div className="column-header ai-header">
        <div className="ai-header-top">
          <div>
            <div className="column-title">Totals</div>
          </div>
          <div className="ai-total">
            <div className="ai-total-time">{formatDuration(totalSeconds)}</div>
          </div>
        </div>
      </div>

      <div className="column-body ai-entries-body">
        {enriched.length === 0 && unassigned.length === 0 ? (
          <div className="ai-empty">
            <span className="ai-empty-icon">{'\u2728'}</span>
            <span>No entries yet</span>
          </div>
        ) : (
          <>
            <div className="ai-entries-list">
              {enriched.map((entry) => {
                const isAi = entry.source === 'ai_suggested'

                return (
                  <div
                    key={entry.client_id}
                    className="ai-entry-card"
                    onClick={() => onEditEntry(entry)}
                  >
                    <div className="ai-entry-top">
                      <div className="ai-entry-client">
                        {entry.clientName}
                      </div>
                      <div className="ai-entry-time">
                        <span className="ai-entry-duration">{formatDuration(entry.duration_seconds)}</span>
                      </div>
                    </div>
                    <div className="ai-entry-desc">{entry.description}</div>
                  </div>
                )
              })}
            </div>

            {unassigned.length > 0 && (
              <div className="unassigned-box">
                <div className="unassigned-box-header" onClick={() => { setShowUnassigned(!showUnassigned); setAssigningId(null); setSearch('') }}>
                  <span className="unassigned-box-dot" />
                  <span className="unassigned-box-text">{unassigned.length} unassigned {unassigned.length === 1 ? 'activity' : 'activities'}</span>
                  <span className="unassigned-box-arrow">{showUnassigned ? '\u25B2' : '\u25BC'}</span>
                </div>
                {showUnassigned && (
                  <div className="unassigned-box-list">
                    {unassigned.map(act => {
                      const dur = Math.round((act.duration_seconds || 0) / 60)
                      const isAssigning = assigningId === act.id
                      const filtered = clients ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : []

                      return (
                        <div key={act.id} className="unassigned-item">
                          <div className="unassigned-item-info">
                            <div className="unassigned-item-title">{act.window_title}</div>
                            <div className="unassigned-item-meta">{act.app_name} &middot; {formatTime(act.start_time)} &middot; {dur}m</div>
                          </div>
                          {isAssigning ? (
                            <div className="unassigned-assign-panel">
                              <input
                                className="unassigned-search"
                                placeholder="Search..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                              />
                              <div className="unassigned-client-list">
                                {filtered.map(c => (
                                  <div key={c.id} className="unassigned-client-option" onClick={() => { onAssign(act.id, c.id); setAssigningId(null); setSearch('') }}>
                                    <span className="unassigned-client-dot" style={{ backgroundColor: c.color }} />
                                    {c.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button className="unassigned-assign-btn" onClick={() => { setAssigningId(act.id); setSearch('') }}>
                              Assign
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
