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

export default function ActivityColumn({
  title,
  subtitle,
  icon,
  filterTypes,
  emptyIcon,
  emptyMessage,
  activities,
  zoom,
  clients,
  onCreateEntry,
}) {
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

  const filteredActivities = useMemo(() => {
    if (!activities) return []
    if (!filterTypes || filterTypes.length === 0) return activities
    return activities.filter((a) => filterTypes.includes(a.activity_type))
  }, [activities, filterTypes])

  const timeSlots = useMemo(() => generateTimeSlots(zoom), [zoom])

  const activitiesBySlot = useMemo(() => {
    const map = {}
    filteredActivities.forEach((act) => {
      const key = getActivitySlotKey(act, zoom)
      if (key) {
        if (!map[key]) map[key] = []
        map[key].push(act)
      }
    })
    return map
  }, [filteredActivities, zoom])

  const clientMap = useMemo(() => {
    const map = {}
    if (clients) {
      clients.forEach((c) => {
        map[c.id] = c
      })
    }
    return map
  }, [clients])

  const totalCount = filteredActivities.length

  function handleActivityClick(e, activity) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPopupPosition({
      top: rect.top,
      left: rect.right + 8,
    })
    setSelectedActivity(activity)
  }

  function getMatchedColor(activity) {
    if (activity.client_links && activity.client_links.length > 0) {
      const link = activity.client_links[0]
      const client = clientMap[link.client_id]
      if (client) return client.color
    }
    if (activity.matched_client_id && clientMap[activity.matched_client_id]) {
      return clientMap[activity.matched_client_id].color
    }
    return null
  }

  const rowHeight = zoom === 15 ? 48 : zoom === 30 ? 64 : 80

  return (
    <div className="column source-column">
      <div className="column-header">
        <div className="column-title">
          <span className="column-icon">{icon}</span> {title}
          {totalCount > 0 && <span className="column-count">{totalCount}</span>}
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
                          <div className="activity-info">
                            <div className="activity-desc">
                              {act.window_title || act.title || act.description || 'Unknown'}
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
