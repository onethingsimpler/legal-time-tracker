import React, { useState, useMemo } from 'react'
import ActivityDetail from './ActivityDetail'

const APP_ICONS = {
  document: '\u{1F4C4}',
  email: '\u{1F4E7}',
  call: '\u{1F4DE}',
  calendar: '\u{1F4C5}',
  browser: '\u{1F310}',
  chat: '\u{1F4AC}',
  default: '\u{1F4CB}',
}

function getAppIcon(activity) {
  const appName = (activity.app_name || activity.category || '').toLowerCase()
  const title = (activity.title || activity.window_title || '').toLowerCase()

  if (appName.includes('mail') || appName.includes('outlook') || title.includes('mail'))
    return APP_ICONS.email
  if (appName.includes('calendar') || title.includes('calendar') || title.includes('meeting'))
    return APP_ICONS.calendar
  if (appName.includes('zoom') || appName.includes('teams') || appName.includes('phone') || title.includes('call'))
    return APP_ICONS.call
  if (appName.includes('chrome') || appName.includes('safari') || appName.includes('firefox') || appName.includes('browser'))
    return APP_ICONS.browser
  if (appName.includes('slack') || appName.includes('discord') || appName.includes('message'))
    return APP_ICONS.chat
  if (appName.includes('word') || appName.includes('pages') || appName.includes('doc') || appName.includes('pdf'))
    return APP_ICONS.document

  return APP_ICONS.default
}

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return ''
  const m = Math.round(minutes)
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

function generateTimeSlots(zoom) {
  const slots = []
  for (let hour = 6; hour < 22; hour++) {
    for (let min = 0; min < 60; min += zoom) {
      const h = hour % 12 || 12
      const ampm = hour < 12 ? 'AM' : 'PM'
      const minStr = min === 0 ? '00' : String(min).padStart(2, '0')
      slots.push({
        hour,
        minute: min,
        label: `${h}:${minStr} ${ampm}`,
        key: `${hour}:${minStr}`,
      })
    }
  }
  return slots
}

function getActivitySlotKey(activity, zoom) {
  const startTime = activity.start_time || activity.timestamp
  if (!startTime) return null
  const d = new Date(startTime)
  const hour = d.getHours()
  const minute = Math.floor(d.getMinutes() / zoom) * zoom
  return `${hour}:${String(minute).padStart(2, '0')}`
}

function computeDuration(activity) {
  if (activity.duration_minutes) return activity.duration_minutes
  if (activity.start_time && activity.end_time) {
    const start = new Date(activity.start_time)
    const end = new Date(activity.end_time)
    return Math.round((end - start) / 60000)
  }
  return null
}

export default function MemoryAid({ activities, zoom, clients, onCreateEntry }) {
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

  const timeSlots = useMemo(() => generateTimeSlots(zoom), [zoom])

  const activitiesBySlot = useMemo(() => {
    const map = {}
    if (!activities) return map
    activities.forEach((act) => {
      const key = getActivitySlotKey(act, zoom)
      if (key) {
        if (!map[key]) map[key] = []
        map[key].push(act)
      }
    })
    return map
  }, [activities, zoom])

  const clientMap = useMemo(() => {
    const map = {}
    if (clients) {
      clients.forEach((c) => {
        map[c.id] = c
      })
    }
    return map
  }, [clients])

  function handleActivityClick(e, activity) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPopupPosition({
      top: rect.top,
      left: rect.right + 8,
    })
    setSelectedActivity(activity)
  }

  function getMatchedColor(activity) {
    if (activity.matched_client_id && clientMap[activity.matched_client_id]) {
      return clientMap[activity.matched_client_id].color
    }
    return null
  }

  const rowHeight = zoom === 15 ? 48 : zoom === 30 ? 64 : 80

  return (
    <div className="column memory-aid">
      <div className="column-header">
        <div className="column-title">Memory Aid</div>
        <div className="column-subtitle">Automatically captured activities</div>
      </div>

      <div className="column-body">
        {!activities || activities.length === 0 ? (
          <div className="no-activities">
            <div className="no-activities-icon">{'\u{1F4CB}'}</div>
            <div className="no-activities-text">
              No activities captured yet.<br />
              Start the tracker to begin recording.
            </div>
          </div>
        ) : (
          <div className="timeline" style={{ '--row-height': `${rowHeight}px` }}>
            {timeSlots.map((slot) => {
              const slotActivities = activitiesBySlot[slot.key] || []
              return (
                <div key={slot.key} className="timeline-row" style={{ minHeight: rowHeight }}>
                  <div className="timeline-time">{slot.label}</div>
                  <div className="timeline-content">
                    {slotActivities.map((act, idx) => {
                      const matchedColor = getMatchedColor(act)
                      const duration = computeDuration(act)
                      return (
                        <div
                          key={act.id || idx}
                          className={`activity-card ${matchedColor ? 'matched' : ''}`}
                          style={matchedColor ? { '--matched-color': matchedColor } : undefined}
                          onClick={(e) => handleActivityClick(e, act)}
                        >
                          <span className="activity-icon">{getAppIcon(act)}</span>
                          <div className="activity-info">
                            <div className="activity-desc">
                              {act.title || act.window_title || act.description || 'Unknown activity'}
                            </div>
                            <div className="activity-meta">
                              {act.app_name || ''}{act.app_name && act.start_time ? ' \u00b7 ' : ''}
                              {act.start_time ? formatTime(act.start_time) : ''}
                            </div>
                          </div>
                          {duration != null && (
                            <span className="activity-duration">{formatDuration(duration)}</span>
                          )}
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
          onCreateEntry={onCreateEntry}
        />
      )}
    </div>
  )
}
