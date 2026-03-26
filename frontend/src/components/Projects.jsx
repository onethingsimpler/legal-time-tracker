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
  if (entry.duration_seconds) return Math.round(entry.duration_seconds / 60)
  if (entry.duration_minutes) return entry.duration_minutes
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
      <div style={{ flex: 1 }} />
      <div className="projects-bar-right">
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
