import React, { useEffect, useRef, useState } from 'react'
import { clientColor } from '../clientColor'

const ICONS = {
  document: '\u{1F4C4}', email: '\u{1F4E7}', call: '\u{1F4DE}',
  calendar: '\u{1F4C5}', browser: '\u{1F310}', default: '\u{1F4CB}',
}

function getIcon(a) {
  const n = (a.app_name || '').toLowerCase()
  if (n.includes('mail') || n.includes('outlook')) return ICONS.email
  if (n.includes('calendar')) return ICONS.calendar
  if (n.includes('zoom') || n.includes('phone') || n.includes('facetime')) return ICONS.call
  if (n.includes('chrome') || n.includes('safari') || n.includes('firefox')) return ICONS.browser
  if (n.includes('word') || n.includes('acrobat') || n.includes('excel') || n.includes('powerpoint')) return ICONS.document
  return ICONS.default
}

function toTimeInput(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function calcDuration(start, end) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
}

export default function ActivityDetail({ activity, position, clients, onClose, onAssign, onUpdateTime }) {
  const ref = useRef(null)
  const [changing, setChanging] = useState(false)
  const [search, setSearch] = useState('')
  const [entryDate, setEntryDate] = useState(() => {
    if (!activity.start_time) return ''
    const d = new Date(activity.start_time)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const [startTime, setStartTime] = useState(toTimeInput(activity.start_time))
  const [endTime, setEndTime] = useState(toTimeInput(activity.end_time))

  const dur = calcDuration(startTime, endTime)

  useEffect(() => {
    const click = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const esc = (e) => { if (e.key === 'Escape') { if (changing) setChanging(false); else onClose() } }
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', esc) }
  }, [onClose, changing])

  useEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      if (r.right > window.innerWidth) ref.current.style.left = `${position.left - r.width - 16}px`
      if (r.bottom > window.innerHeight) ref.current.style.top = `${window.innerHeight - r.height - 16}px`
    }
  }, [position, changing])

  const cid = activity.client_links?.[0]?.client_id
  const matched = cid && clients ? clients.find(c => c.id === cid) : null
  const filtered = clients ? clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase())) : []

  function handlePick(clientId) {
    if (onAssign) onAssign(activity.id, clientId)
    onClose()
  }

  function handleTimeChange(newStart, newEnd) {
    if (onUpdateTime && calcDuration(newStart, newEnd) > 0) {
      onUpdateTime(activity.id, newStart, newEnd)
    }
  }

  return (
    <div className="activity-popup-overlay" onClick={onClose}>
      <div ref={ref} className="activity-popup" style={{ top: position.top, left: position.left }} onClick={e => e.stopPropagation()}>
        <div className="activity-popup-header">
          <span className="activity-popup-icon">{getIcon(activity)}</span>
          <span className="activity-popup-title">{activity.window_title || 'Unknown'}</span>
        </div>

        <div className="activity-popup-body">
          <div className="activity-popup-date-row">
            <input
              type="date"
              className="activity-popup-date-input"
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
            />
          </div>
          <div className="activity-popup-time-row">
            <input
              type="time"
              className="activity-popup-time-input"
              value={startTime}
              onChange={e => { setStartTime(e.target.value); handleTimeChange(e.target.value, endTime) }}
            />
            <span className="activity-popup-time-sep">–</span>
            <input
              type="time"
              className="activity-popup-time-input"
              value={endTime}
              onChange={e => { setEndTime(e.target.value); handleTimeChange(startTime, e.target.value) }}
            />
            <span className="activity-popup-time-dur">{dur}m</span>
          </div>

          <div className="activity-popup-assign">
            {!changing && matched ? (
              <div className="activity-popup-assigned">
                <span className="activity-popup-assign-dot" style={{ backgroundColor: clientColor(matched.id) }} />
                <span className="activity-popup-match-name">{matched.name}</span>
                <button className="activity-popup-change-btn" onClick={() => setChanging(true)}>Change</button>
              </div>
            ) : (
              <>
                <input
                  className="activity-popup-search"
                  type="text"
                  placeholder="Search clients..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <div className="activity-popup-client-list">
                  {filtered.map(c => (
                    <div key={c.id} className="activity-popup-assign-option" onClick={() => handlePick(c.id)}>
                      <span className="activity-popup-assign-dot" style={{ backgroundColor: clientColor(c.id) }} />
                      <span>{c.name}</span>
                    </div>
                  ))}
                  {filtered.length === 0 && <div className="activity-popup-no-results">No clients found</div>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
