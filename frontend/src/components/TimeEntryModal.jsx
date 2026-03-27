import React, { useState, useEffect, useMemo } from 'react'
import { X, Clock } from 'lucide-react'
import { clientColor } from '../clientColor'

const DEFAULT_COLORS = [
  '#22c55e', '#f97316', '#ec4899', '#8b5cf6',
  '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444',
]

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0 min'
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
}

function timeToInputValue(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function buildDateTimeString(dateObj, timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(dateObj)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export default function TimeEntryModal({
  entry,
  date,
  clients,
  onSave,
  onDelete,
  onClose,
  defaultStartTime,
  defaultEndTime,
}) {
  const isEditing = !!entry?.id

  const [category, setCategory] = useState('document')
  const [clientId, setClientId] = useState('')
  const [matter, setMatter] = useState('')
  const [description, setDescription] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [saving, setSaving] = useState(false)

  function toDateInput(d) {
    const dt = new Date(d)
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
  }

  useEffect(() => {
    if (entry) {
      setClientId(entry.client_id || '')
      setMatter(entry.matter || '')
      setDescription(entry.description || '')
      setEntryDate(entry.start_time ? toDateInput(entry.start_time) : toDateInput(date))
      setStartTime(timeToInputValue(entry.start_time) || defaultStartTime || '')
      setEndTime(timeToInputValue(entry.end_time) || defaultEndTime || '')
    } else {
      setEntryDate(toDateInput(date))
      setStartTime(defaultStartTime || '')
      setEndTime(defaultEndTime || '')
    }
  }, [entry, date, defaultStartTime, defaultEndTime])

  const durationMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    return endMins > startMins ? endMins - startMins : 0
  }, [startTime, endTime])

  const selectedClient = useMemo(() => {
    if (!clientId || !clients) return null
    return clients.find((c) => c.id === clientId || String(c.id) === String(clientId))
  }, [clientId, clients])

  async function handleSave(e) {
    e.preventDefault()
    if (!startTime || !endTime) return
    if (durationMinutes <= 0) return

    setSaving(true)
    try {
      const data = {
        activity_type: category,
        client_id: clientId,
        matter: matter.trim() || undefined,
        description: description.trim() || undefined,
        start_time: buildDateTimeString(new Date(entryDate + 'T00:00:00'), startTime),
        end_time: buildDateTimeString(new Date(entryDate + 'T00:00:00'), endTime),
        duration_minutes: durationMinutes,
      }

      if (isEditing) {
        data.id = entry.id
      }

      await onSave(data)
    } catch {
      // Error handled in parent
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this time entry?')) return
    setSaving(true)
    try {
      await onDelete(entry.id)
    } catch {
      // Error handled in parent
    } finally {
      setSaving(false)
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEditing ? 'Edit Time Entry' : 'New Time Entry'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="document">{'\u{1F4BB}'} Computer</option>
                <option value="calendar">{'\u{1F4C5}'} Calendar</option>
                <option value="call">{'\u{1F4DE}'} Call</option>
                <option value="email">{'\u{1F4E7}'} Email</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Client</label>
              <select
                className="form-select"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value)
                  setMatter('')
                }}
              >
                <option value="">None (unassigned)</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject</label>
              <input
                className="form-input"
                type="text"
                value={matter}
                onChange={(e) => setMatter(e.target.value)}
                placeholder="e.g., Contract Review #2024-001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                className="form-input"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  className="form-input"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  className="form-input"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="duration-display">
              <Clock size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
              Duration: {formatDuration(durationMinutes)}
              {selectedClient && (
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: clientColor(selectedClient.id),
                    marginLeft: 8,
                    verticalAlign: 0,
                  }}
                />
              )}
            </div>
          </div>

          <div className="modal-footer">
            {isEditing && (
              <div className="modal-footer-left">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete
                </button>
              </div>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !startTime || !endTime || durationMinutes <= 0}
            >
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Create Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
