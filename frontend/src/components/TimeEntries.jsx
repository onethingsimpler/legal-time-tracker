import React, { useState, useRef, useMemo, useCallback } from 'react'

const DEFAULT_COLORS = [
  '#22c55e', '#f97316', '#ec4899', '#8b5cf6',
  '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444',
]

function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return ''
  const m = Math.round(minutes)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
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

function getSlotIndex(entry, timeSlots, fieldName) {
  const timeStr = entry[fieldName]
  if (!timeStr) return -1
  const d = new Date(timeStr)
  const hour = d.getHours()
  const minute = d.getMinutes()

  for (let i = 0; i < timeSlots.length; i++) {
    const slot = timeSlots[i]
    if (slot.hour === hour && minute >= slot.minute && minute < slot.minute + (timeSlots[1]?.minute - timeSlots[0]?.minute || 60)) {
      return i
    }
    if (slot.hour > hour) return Math.max(0, i - 1)
  }
  return timeSlots.length - 1
}

function computeDuration(entry) {
  if (entry.duration_minutes) return entry.duration_minutes
  if (entry.start_time && entry.end_time) {
    const start = new Date(entry.start_time)
    const end = new Date(entry.end_time)
    return Math.round((end - start) / 60000)
  }
  return 0
}

export default function TimeEntries({ entries, zoom, clients, onEditEntry, onCreateEntry }) {
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const timelineRef = useRef(null)

  const timeSlots = useMemo(() => generateTimeSlots(zoom), [zoom])

  const clientMap = useMemo(() => {
    const map = {}
    if (clients) {
      clients.forEach((c, idx) => {
        map[c.id] = { ...c, color: c.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length] }
      })
    }
    return map
  }, [clients])

  const entriesBySlot = useMemo(() => {
    const map = {}
    if (!entries) return map
    entries.forEach((entry) => {
      const startIdx = getSlotIndex(entry, timeSlots, 'start_time')
      const endIdx = getSlotIndex(entry, timeSlots, 'end_time')
      const duration = computeDuration(entry)
      const client = clientMap[entry.client_id]

      if (startIdx >= 0) {
        const spanSlots = Math.max(1, endIdx - startIdx + 1)
        if (!map[startIdx]) map[startIdx] = []
        map[startIdx].push({
          ...entry,
          spanSlots,
          duration,
          clientName: client?.name || 'Unassigned',
          clientColor: client?.color || '#94a3b8',
        })
      }
    })
    return map
  }, [entries, timeSlots, clientMap])

  const rowHeight = zoom === 15 ? 48 : zoom === 30 ? 64 : 80

  const handleMouseDown = useCallback((e, slotIndex) => {
    if (e.target.closest('.time-entry-block')) return
    setDragStart(slotIndex)
    setDragEnd(slotIndex)
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e, slotIndex) => {
    if (isDragging) {
      setDragEnd(slotIndex)
    }
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const startSlot = timeSlots[Math.min(dragStart, dragEnd)]
      const endSlot = timeSlots[Math.max(dragStart, dragEnd)]
      if (startSlot && endSlot) {
        const startHour = String(startSlot.hour).padStart(2, '0')
        const startMin = String(startSlot.minute).padStart(2, '0')
        const endHour = String(endSlot.hour).padStart(2, '0')
        const endMinute = endSlot.minute + zoom
        const endMin = String(endMinute % 60).padStart(2, '0')
        const endH = String(endSlot.hour + Math.floor(endMinute / 60)).padStart(2, '0')

        onCreateEntry({
          start_time_hint: `${startHour}:${startMin}`,
          end_time_hint: `${endH}:${endMin}`,
        })
      }
    }
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }, [isDragging, dragStart, dragEnd, timeSlots, zoom, onCreateEntry])

  const selStart = dragStart !== null && dragEnd !== null ? Math.min(dragStart, dragEnd) : null
  const selEnd = dragStart !== null && dragEnd !== null ? Math.max(dragStart, dragEnd) : null

  return (
    <div className="column time-entries ai-column">
      <div className="column-header ai-header">
        <div className="column-title">
          <span className="ai-header-icon">{'\u2728'}</span>
          AI Time Entries
          <span className="ai-live-badge">LIVE</span>
        </div>
        <div className="column-subtitle">Continuously generated from your activity</div>
      </div>

      <div className="column-body" ref={timelineRef} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <div className="timeline" style={{ '--row-height': `${rowHeight}px` }}>
          {timeSlots.map((slot, slotIdx) => {
            const slotEntries = entriesBySlot[slotIdx] || []
            const isInSelection = isDragging && selStart !== null && selEnd !== null &&
              slotIdx >= selStart && slotIdx <= selEnd
            const isFirstSelected = slotIdx === selStart && isDragging

            return (
              <div
                key={slot.key}
                className="timeline-row"
                style={{ minHeight: rowHeight }}
                onMouseDown={(e) => handleMouseDown(e, slotIdx)}
                onMouseMove={(e) => handleMouseMove(e, slotIdx)}
              >
                <div className="timeline-time">{slot.label}</div>
                <div className="timeline-content" style={{ position: 'relative' }}>
                  {slotEntries.map((entry, idx) => {
                    const isAi = entry.source === 'ai_suggested'
                    const isDraft = entry.status === 'draft'
                    const confidence = entry.confidence || 0.95
                    return (
                      <div
                        key={entry.id || idx}
                        className={`time-entry-block ${isDraft ? 'draft' : 'confirmed'} ${isAi ? 'ai-generated' : ''}`}
                        style={{
                          '--entry-color': entry.clientColor,
                          minHeight: entry.spanSlots * rowHeight - 8,
                          zIndex: 2,
                        }}
                        onClick={() => onEditEntry(entry)}
                      >
                        {isAi && <div className="ai-shimmer" />}
                        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                          <div className="time-entry-name">
                            {isAi && <span className="ai-sparkle-badge">{'\u2728'}</span>}
                            {entry.clientName}
                            {!isDraft && <span className="confirmed-check">{'\u2713'}</span>}
                          </div>
                          {entry.description && (
                            <div className="time-entry-detail">{entry.description}</div>
                          )}
                          {isDraft && (
                            <div className="time-entry-status">
                              <span className="pulse-dot" />
                              Awaiting review
                            </div>
                          )}
                        </div>
                        <div className="time-entry-right" style={{ position: 'relative', zIndex: 1 }}>
                          <span className="time-entry-duration">
                            {formatDuration(entry.duration)}
                          </span>
                          {isAi && (
                            <span className="ai-confidence">{Math.round(confidence * 100)}%</span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {slotEntries.length === 0 && !isInSelection && (
                    <div className="drag-hint">Click &amp; drag to create entry</div>
                  )}

                  {isFirstSelected && isDragging && (
                    <div
                      className="drag-selection"
                      style={{
                        top: 0,
                        height: (selEnd - selStart + 1) * rowHeight - 8,
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
