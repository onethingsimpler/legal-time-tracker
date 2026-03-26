import React, { useMemo } from 'react'
import { Plus, Download } from 'lucide-react'

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '0m'
  const m = Math.round(minutes)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
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
    <div className="projects-bar">
      <div className="projects-bar-clients">
        {sortedClients.map((client, idx) => {
          const time = clientTimes[client.id] || 0
          return (
            <div
              key={client.id}
              className="projects-bar-item"
              onClick={() => onEditClient(client)}
            >
              <span className="projects-bar-dot" style={{ backgroundColor: client.color }} />
              <span className="projects-bar-name">{client.name}</span>
              <span className="projects-bar-time">{formatDuration(time)}</span>
            </div>
          )
        })}
      </div>

      <div className="projects-bar-right">
        <div className="projects-bar-total">
          <span className="projects-bar-total-label">Total</span>
          <span className="projects-bar-total-time">{formatDuration(totalMinutes)}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onAddClient}>
          <Plus size={12} />
          Add Client
        </button>
        <button className="btn btn-primary btn-sm" onClick={onExport}>
          <Download size={12} />
          Export
        </button>
      </div>
    </div>
  )
}
