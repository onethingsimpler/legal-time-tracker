import React, { useState, useMemo } from 'react'
import ActivityDetail from './ActivityDetail'

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return ''
  const m = Math.round(minutes)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

// Timeline constants
const DAY_START = 8 * 60    // 8:00 AM in minutes
const DAY_END = 19 * 60     // 7:00 PM
const SLOT = 30             // 30-min grid
const PX_PER_MIN = 3         // pixels per minute
const ROW_HEIGHT = SLOT * PX_PER_MIN  // 60px per 30-min row

function minuteOfDay(dateStr) {
  const d = new Date(dateStr)
  return d.getHours() * 60 + d.getMinutes()
}

function generateGridSlots() {
  const slots = []
  for (let m = DAY_START; m < DAY_END; m += SLOT) {
    const hour = Math.floor(m / 60)
    const min = m % 60
    const h = hour % 12 || 12
    const ampm = hour < 12 ? 'AM' : 'PM'
    slots.push({ label: `${h}:${String(min).padStart(2, '0')} ${ampm}`, minutes: m })
  }
  return slots
}

const GRID_SLOTS = generateGridSlots()
const TOTAL_HEIGHT = ((DAY_END - DAY_START) * PX_PER_MIN)

export default function ActivityColumn({
  title, subtitle, icon, filterTypes, emptyIcon, emptyMessage,
  activities, zoom, clients, onCreateEntry, onAssign, onUpdateTime,
}) {
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

  const filteredActivities = useMemo(() => {
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
    if (act.client_links?.length > 0) {
      const c = clientMap[act.client_links[0].client_id]
      if (c) return c.color
    }
    return null
  }

  function handleClick(e, act) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPopupPosition({ top: rect.top, left: rect.right + 8 })
    setSelectedActivity(act)
  }

  return (
    <div className="column source-column">
      <div className="column-header">
        <div className="column-title">
          <span className="column-icon">{icon}</span> {title}
          {filteredActivities.length > 0 && <span className="column-count">{filteredActivities.length}</span>}
        </div>
        <div className="column-subtitle">{subtitle}</div>
      </div>

      <div className="column-body">
        {filteredActivities.length === 0 ? (
          <div className="no-activities">
            <div className="no-activities-icon">{emptyIcon || icon}</div>
            <div className="no-activities-text">{emptyMessage || 'No data yet'}</div>
          </div>
        ) : (
          <div className="gcal-timeline" style={{ height: TOTAL_HEIGHT }}>
            {/* 30-min grid lines */}
            {GRID_SLOTS.map(slot => (
              <div
                key={slot.minutes}
                className="gcal-gridline"
                style={{ top: (slot.minutes - DAY_START) * PX_PER_MIN }}
              >
                <span className="gcal-label">{slot.label}</span>
              </div>
            ))}

            {/* Activities */}
            {filteredActivities.map((act, idx) => {
              if (!act.start_time || !act.end_time) return null
              const startMin = minuteOfDay(act.start_time)
              const endMin = minuteOfDay(act.end_time)
              if (startMin < DAY_START || startMin >= DAY_END) return null

              const top = (startMin - DAY_START) * PX_PER_MIN
              const height = Math.max((endMin - startMin) * PX_PER_MIN, 22)
              const dur = endMin - startMin
              const matched = getMatchedColor(act)
              const assignedBy = act.client_links?.[0]?.matched_by
              const isAi = assignedBy && assignedBy !== 'manual'
              const isEmail = act.activity_type === 'email'
              const emailDir = isEmail ? (act.window_title?.startsWith('Re:') || act.window_title?.startsWith('FW:') ? 'in' : 'out') : null
              const isShort = height < 36

              return (
                <div
                  key={act.id || idx}
                  className={`gcal-event ${matched ? '' : 'unmatched'}`}
                  data-type={act.activity_type}
                  style={{ top, height }}
                  onClick={e => handleClick(e, act)}
                >
                  {isAi && <span className="gcal-ai">{'\u2728'}</span>}
                  <div className="gcal-event-text">
                    {isEmail && <span className={`email-dir ${emailDir}`}>{emailDir === 'in' ? '\u2B07' : '\u2B06'}</span>}
                    {act.window_title || 'Unknown'}
                  </div>
                  {!isShort && <div className="gcal-event-dur">{formatDuration(dur)}</div>}
                  {isShort && <span className="gcal-event-dur-inline">{formatDuration(dur)}</span>}
                </div>
              )
            })}
          </div>
        )}
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
