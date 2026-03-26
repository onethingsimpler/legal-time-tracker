import React, { useMemo } from 'react'
import { Plus, Download } from 'lucide-react'

const DEFAULT_COLORS = [
  '#22c55e', '#f97316', '#ec4899', '#8b5cf6',
  '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444',
]

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '0m'
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
}

function computeEntryDuration(entry) {
  if (entry.duration_minutes) return entry.duration_minutes
  if (entry.start_time && entry.end_time) {
    const start = new Date(entry.start_time)
    const end = new Date(entry.end_time)
    return Math.round((end - start) / 60000)
  }
  return 0
}

export default function Projects({ clients, entries, onAddClient, onEditClient, onExport }) {
  const clientTimes = useMemo(() => {
    const map = {}
    if (entries) {
      entries.forEach((entry) => {
        const cid = entry.client_id
        if (cid) {
          map[cid] = (map[cid] || 0) + computeEntryDuration(entry)
        }
      })
    }
    return map
  }, [entries])

  const totalMinutes = useMemo(() => {
    return Object.values(clientTimes).reduce((sum, m) => sum + m, 0)
  }, [clientTimes])

  const sortedClients = useMemo(() => {
    if (!clients) return []
    return [...clients].sort((a, b) => {
      const timeA = clientTimes[a.id] || 0
      const timeB = clientTimes[b.id] || 0
      return timeB - timeA
    })
  }, [clients, clientTimes])

  return (
    <div className="column projects">
      <div className="column-header">
        <div className="column-title">Projects</div>
        <div className="column-subtitle">Clients &amp; matters</div>
      </div>

      <div className="column-body">
        {sortedClients.length === 0 ? (
          <div className="no-projects">
            No clients yet. Add one to get started.
          </div>
        ) : (
          <ul className="project-list">
            {sortedClients.map((client, idx) => {
              const color = client.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]
              const time = clientTimes[client.id] || 0
              return (
                <li
                  key={client.id}
                  className="project-item"
                  onClick={() => onEditClient(client)}
                >
                  <span
                    className="project-color-dot"
                    style={{ backgroundColor: color }}
                  />
                  <span className="project-name">{client.name}</span>
                  <span className="project-time">{formatDuration(time)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {totalMinutes > 0 && (
        <div className="project-total">
          <span className="project-total-label">Total</span>
          <span className="project-total-time">{formatDuration(totalMinutes)}</span>
        </div>
      )}

      <div className="project-actions">
        <button className="btn btn-secondary" onClick={onAddClient}>
          <Plus size={14} />
          Add Client
        </button>
        <button className="btn btn-primary" onClick={onExport}>
          <Download size={14} />
          Export
        </button>
      </div>
    </div>
  )
}
