import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { api } from '../api'

function formatDuration(totalSeconds) {
  if (!totalSeconds) return '0m'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.round((totalSeconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function displayDate(isoStr) {
  if (!isoStr) return ''
  const [y, m, d] = isoStr.split('-')
  return `${m}/${d}/${y}`
}

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function getFriday(d) {
  const monday = getMonday(d)
  monday.setDate(monday.getDate() + 4)
  return monday
}

function getPresetRange(preset) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (preset === 'this-week') {
    return { start: getMonday(today), end: getFriday(today) }
  }
  if (preset === 'last-week') {
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    return { start: getMonday(lastWeek), end: getFriday(lastWeek) }
  }
  if (preset === 'this-month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { start, end }
  }
  if (preset === 'last-30') {
    const start = new Date(today)
    start.setDate(start.getDate() - 29)
    return { start, end: today }
  }
  return { start: getMonday(today), end: getFriday(today) }
}

export default function ReportView({ onClose, clients }) {
  const defaultRange = getPresetRange('this-week')
  const [startDate, setStartDate] = useState(formatDateStr(defaultRange.start))
  const [endDate, setEndDate] = useState(formatDateStr(defaultRange.end))
  const [activePreset, setActivePreset] = useState('this-week')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const clientMap = useMemo(() => {
    const map = {}
    if (clients) {
      clients.forEach(c => { map[c.id] = c })
    }
    return map
  }, [clients])

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T00:00:00')
      const clientTotals = {}
      let totalSeconds = 0
      let totalActivities = 0

      const current = new Date(start)
      while (current <= end) {
        const dow = current.getDay()
        if (dow !== 0 && dow !== 6) {
          const dateStr = formatDateStr(current)
          const res = await api.getActivities(dateStr)
          const activities = res.data?.activities || []

          for (const act of activities) {
            if (act.client_links && act.client_links.length > 0) {
              const clientId = act.client_links[0].client_id
              const dur = act.duration_seconds || 0
              if (!clientTotals[clientId]) {
                clientTotals[clientId] = { seconds: 0, count: 0 }
              }
              clientTotals[clientId].seconds += dur
              clientTotals[clientId].count += 1
              totalSeconds += dur
              totalActivities += 1
            }
          }
        }
        current.setDate(current.getDate() + 1)
      }

      setData({ clientTotals, totalSeconds, totalActivities })
    } catch {
      setData({ clientTotals: {}, totalSeconds: 0, totalActivities: 0 })
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  function handlePreset(preset) {
    setActivePreset(preset)
    const range = getPresetRange(preset)
    setStartDate(formatDateStr(range.start))
    setEndDate(formatDateStr(range.end))
  }

  function handleStartChange(e) {
    setStartDate(e.target.value)
    setActivePreset(null)
  }

  function handleEndChange(e) {
    setEndDate(e.target.value)
    setActivePreset(null)
  }

  const sortedClients = useMemo(() => {
    if (!data) return []
    return Object.entries(data.clientTotals)
      .sort((a, b) => b[1].seconds - a[1].seconds)
      .map(([clientId, totals]) => ({
        clientId: Number(clientId),
        client: clientMap[Number(clientId)],
        ...totals,
      }))
  }, [data, clientMap])

  const presets = [
    { id: 'this-week', label: 'This Week' },
    { id: 'last-week', label: 'Last Week' },
    { id: 'this-month', label: 'This Month' },
    { id: 'last-30', label: 'Last 30 Days' },
  ]

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-card" onClick={e => e.stopPropagation()}>
        <div className="report-header">
          <h2 className="report-title">Billing Summary</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="report-controls">
          <div className="report-presets">
            {presets.map(p => (
              <button
                key={p.id}
                className={`report-preset-btn${activePreset === p.id ? ' active' : ''}`}
                onClick={() => handlePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="report-date-range">
            <div className="report-date-field">
              <label className="report-date-label">From</label>
              <input
                type="date"
                className="report-date-input"
                value={startDate}
                onChange={handleStartChange}
              />
            </div>
            <span className="report-date-sep">&ndash;</span>
            <div className="report-date-field">
              <label className="report-date-label">To</label>
              <input
                type="date"
                className="report-date-input"
                value={endDate}
                onChange={handleEndChange}
              />
            </div>
          </div>
        </div>

        <div className="report-body">
          {loading ? (
            <div className="report-loading">Loading report data...</div>
          ) : data && sortedClients.length > 0 ? (
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-th report-th-client">Client</th>
                  <th className="report-th report-th-hours">Hours</th>
                  <th className="report-th report-th-count">Activities</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map(row => (
                  <tr key={row.clientId} className="report-row">
                    <td className="report-td report-td-client">
                      <span
                        className="report-client-dot"
                        style={{ background: row.client?.color || '#94a3b8' }}
                      />
                      {row.client?.name || `Client #${row.clientId}`}
                    </td>
                    <td className="report-td report-td-hours">{formatDuration(row.seconds)}</td>
                    <td className="report-td report-td-count">{row.count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="report-total-row">
                  <td className="report-td report-td-client report-total-label">Total</td>
                  <td className="report-td report-td-hours report-total-value">
                    {formatDuration(data.totalSeconds)}
                  </td>
                  <td className="report-td report-td-count report-total-value">
                    {data.totalActivities}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : data ? (
            <div className="report-empty">No billable activities found in this date range.</div>
          ) : null}
        </div>

        <div className="report-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
