import React, { useState, useMemo } from 'react'
import { clientColor } from '../clientColor'
import ActivityDetail from './ActivityDetail'

function formatDuration(minutes) {
  if (!minutes) return ''
  const m = Math.round(minutes)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

const HOUR_HEIGHT = 80

function minuteOfDay(dateStr) {
  const d = new Date(dateStr)
  return d.getHours() * 60 + d.getMinutes()
}

// Compute the visible time range from activities
export function useTimeRange(activities) {
  return useMemo(() => {
    if (!activities || activities.length === 0) return { startHour: 9, endHour: 19 }
    let earliest = 24 * 60
    let latest = 0
    activities.forEach(a => {
      if (a.start_time) earliest = Math.min(earliest, minuteOfDay(a.start_time))
      if (a.end_time) latest = Math.max(latest, minuteOfDay(a.end_time))
    })
    const startHour = Math.max(0, Math.floor(earliest / 60) - 1)
    const endHour = Math.min(24, Math.ceil(latest / 60) + 1)
    return { startHour, endHour }
  }, [activities])
}

// Shared time gutter
export function TimeGutter({ startHour = 9, endHour = 19 }) {
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT
  const hours = []
  for (let h = startHour; h < endHour; h++) {
    const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
    hours.push(
      <div key={h} className="tg-hour" style={{ top: (h - startHour) * HOUR_HEIGHT }}>
        <span className="tg-label">{label}</span>
      </div>
    )
  }
  return (
    <div className="lane tg">
      <div className="lane-header">
        <div className="lane-title">&nbsp;</div>
        <div className="lane-subtitle">&nbsp;</div>
      </div>
      <div className="lane-body" style={{ height: totalHeight }}>{hours}</div>
    </div>
  )
}

export default function ActivityColumn({
  title, subtitle, icon, filterTypes, emptyIcon, emptyMessage,
  activities, zoom, clients, onCreateEntry, onAssign, onUpdateTime,
  startHour = 9, endHour = 19,
}) {
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

  const totalHeight = (endHour - startHour) * HOUR_HEIGHT

  function topPx(min) {
    return ((min - startHour * 60) / 60) * HOUR_HEIGHT
  }

  function heightPx(durMin) {
    if (!durMin || isNaN(durMin) || durMin <= 0) return 18
    return Math.max((durMin / 60) * HOUR_HEIGHT, 18)
  }

  const filtered = useMemo(() => {
    if (!activities) return []
    if (!filterTypes?.length) return activities
    return activities.filter(a => filterTypes.includes(a.activity_type))
  }, [activities, filterTypes])

  const clientMap = useMemo(() => {
    const map = {}
    if (clients) clients.forEach(c => { map[c.id] = c })
    return map
  }, [clients])

  function getMatchedColor(act) {
    const link = act.client_links?.[0]
    return link ? clientColor(link.client_id) : null
  }

  function handleClick(e, act) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPopupPosition({ top: rect.top, left: rect.right + 8 })
    setSelectedActivity(act)
  }

  return (
    <div className="lane">
      <div className="lane-header">
        <div className="lane-title">
          <span className="lane-icon">{icon}</span>{title}
          {filtered.length > 0 && <span className="lane-count">{filtered.length}</span>}
        </div>
        <div className="lane-subtitle">{subtitle}</div>
      </div>

      <div className="lane-body" style={{ height: totalHeight }}>
        {/* Half-hour gridlines */}
        {Array.from({ length: (endHour - startHour) * 2 }, (_, i) => (
          <div
            key={i}
            className={`lane-grid ${i % 2 === 0 ? 'hour' : 'half'}`}
            style={{ top: (i * HOUR_HEIGHT) / 2 }}
          />
        ))}

        {/* Events */}
        {filtered.map((act, idx) => {
          if (!act.start_time || !act.end_time) return null
          const startMin = minuteOfDay(act.start_time)
          const endMin = minuteOfDay(act.end_time)
          const dur = endMin - startMin
          if (startMin < startHour * 60 || startMin >= endHour * 60) return null

          const matched = getMatchedColor(act)
          const isAi = act.client_links?.[0]?.matched_by && act.client_links[0].matched_by !== 'manual'
          const isEmail = act.activity_type === 'email'
          const emailDir = isEmail ? (act.window_title?.startsWith('Re:') || act.window_title?.startsWith('FW:') ? 'in' : 'out') : null

          return (
            <div
              key={act.id || idx}
              className={`ev ${matched ? '' : 'unmatched'}`}
              data-type={act.activity_type}
              style={{ top: topPx(startMin), height: heightPx(dur) }}
              onClick={e => handleClick(e, act)}
            >
              <div className="ev-title">
                {isAi && <span className="ev-ai">{'\u2728'}</span>}
                {isEmail && <span className={`email-dir ${emailDir}`}>{emailDir === 'in' ? '\u2B07' : '\u2B06'}</span>}
                {act.window_title || 'Unknown'}
              </div>
              {!isEmail && <div className="ev-dur">{formatDuration(dur)}</div>}
            </div>
          )
        })}
      </div>

      {selectedActivity && (
        <ActivityDetail
          activity={selectedActivity}
          position={popupPosition}
          clients={clients}
          onClose={() => setSelectedActivity(null)}
          onAssign={onAssign}
          onUpdateTime={onUpdateTime}
        />
      )}
    </div>
  )
}
