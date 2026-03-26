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

const SLOT = 30 // 30-min grid
const ROW_HEIGHT = 56

function generateTimeSlots() {
  const slots = []
  for (let hour = 6; hour < 22; hour++) {
    for (let min = 0; min < 60; min += SLOT) {
      const h = hour % 12 || 12
      const ampm = hour < 12 ? 'AM' : 'PM'
      const minStr = String(min).padStart(2, '0')
      slots.push({
        label: `${h}:${minStr} ${ampm}`,
        key: `${hour}:${minStr}`,
        minutes: hour * 60 + min,
      })
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

function getSlotKey(activity) {
  if (!activity.start_time) return null
  const d = new Date(activity.start_time)
  const hour = d.getHours()
  const minute = Math.floor(d.getMinutes() / SLOT) * SLOT
  return `${hour}:${String(minute).padStart(2, '0')}`
}

function getDuration(activity) {
  if (activity.start_time && activity.end_time) {
    return Math.round((new Date(activity.end_time) - new Date(activity.start_time)) / 60000)
  }
  return null
}

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

  const bySlot = useMemo(() => {
    const map = {}
    filteredActivities.forEach(act => {
      const key = getSlotKey(act)
      if (key) { if (!map[key]) map[key] = []; map[key].push(act) }
    })
    return map
  }, [filteredActivities])

  function handleClick(e, act) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPopupPosition({ top: rect.top, left: rect.right + 8 })
    setSelectedActivity(act)
  }

  function getMatchedColor(act) {
    if (act.client_links?.length > 0) {
      const c = clientMap[act.client_links[0].client_id]
      if (c) return c.color
    }
    return null
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
          <div className="timeline">
            {TIME_SLOTS.map(slot => {
              const acts = bySlot[slot.key] || []
              return (
                <div key={slot.key} className="tl-row" style={{ minHeight: ROW_HEIGHT }}>
                  <div className="tl-time">{slot.label}</div>
                  <div className="tl-content">
                    {acts.map((act, idx) => {
                      const matched = getMatchedColor(act)
                      const dur = getDuration(act)
                      const assignedBy = act.client_links?.[0]?.matched_by
                      const isAi = assignedBy && assignedBy !== 'manual'
                      const isEmail = act.activity_type === 'email'
                      const emailDir = isEmail ? (act.window_title?.startsWith('Re:') || act.window_title?.startsWith('FW:') ? 'in' : 'out') : null

                      return (
                        <div
                          key={act.id || idx}
                          className={`tl-card ${matched ? '' : 'unmatched'}`}
                          data-type={act.activity_type}
                          onClick={e => handleClick(e, act)}
                        >
                          {isAi && <span className="tl-ai">{'\u2728'}</span>}
                          <span className="tl-desc">
                            {isEmail && <span className={`email-dir ${emailDir}`}>{emailDir === 'in' ? '\u2B07' : '\u2B06'}</span>}
                            {act.window_title || 'Unknown'}
                          </span>
                          {dur != null && <span className="tl-dur">{formatDuration(dur)}</span>}
                        </div>
                      )
                    })}
                  </div>
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
