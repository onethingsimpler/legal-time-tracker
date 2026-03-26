import React, { useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'

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

function formatTime(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return '--'
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
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

export default function ActivityDetail({ activity, position, clients, onClose, onCreateEntry }) {
  const popupRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose()
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position to keep popup in viewport
  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight

      if (rect.right > vw) {
        popupRef.current.style.left = `${position.left - rect.width - 16}px`
      }
      if (rect.bottom > vh) {
        popupRef.current.style.top = `${vh - rect.height - 16}px`
      }
    }
  }, [position])

  const matchedClient = activity.matched_client_id && clients
    ? clients.find((c) => c.id === activity.matched_client_id || String(c.id) === String(activity.matched_client_id))
    : null

  const duration = computeDuration(activity)
  const title = activity.title || activity.window_title || activity.description || 'Unknown activity'
  const appName = activity.app_name || 'Unknown app'

  function handleCreateEntry() {
    onCreateEntry({
      description: title,
      start_time_hint: activity.start_time
        ? new Date(activity.start_time).toTimeString().slice(0, 5)
        : undefined,
      end_time_hint: activity.end_time
        ? new Date(activity.end_time).toTimeString().slice(0, 5)
        : undefined,
      client_id_hint: activity.matched_client_id || undefined,
    })
    onClose()
  }

  return (
    <div className="activity-popup-overlay" onClick={onClose}>
      <div
        ref={popupRef}
        className="activity-popup"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="activity-popup-header">
          <span className="activity-popup-icon">{getAppIcon(activity)}</span>
          <span className="activity-popup-title">{title}</span>
        </div>

        <div className="activity-popup-body">
          <div className="activity-popup-row">
            <span className="activity-popup-label">Application</span>
            <span className="activity-popup-value">{appName}</span>
          </div>

          {activity.window_title && activity.window_title !== title && (
            <div className="activity-popup-row">
              <span className="activity-popup-label">Window</span>
              <span className="activity-popup-value">{activity.window_title}</span>
            </div>
          )}

          <div className="activity-popup-row">
            <span className="activity-popup-label">Start</span>
            <span className="activity-popup-value">{formatTime(activity.start_time)}</span>
          </div>

          <div className="activity-popup-row">
            <span className="activity-popup-label">End</span>
            <span className="activity-popup-value">{formatTime(activity.end_time)}</span>
          </div>

          <div className="activity-popup-row">
            <span className="activity-popup-label">Duration</span>
            <span className="activity-popup-value">{formatDuration(duration)}</span>
          </div>

          {matchedClient && (
            <div className="activity-popup-match">
              <span
                className="activity-popup-match-dot"
                style={{ backgroundColor: matchedClient.color || '#3b82f6' }}
              />
              <span className="activity-popup-match-name">{matchedClient.name}</span>
              {activity.match_confidence != null && (
                <span className="activity-popup-match-confidence">
                  {Math.round(activity.match_confidence * 100)}% confidence
                </span>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
