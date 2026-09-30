import React, { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { clientColor } from '../clientColor'

function formatTime(d) {
  return d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''
}

export default function SplitModal({ activity, clients, onSplit, onClose }) {
  const totalMinutes = Math.round((activity.duration_seconds || 0) / 60)
  const originalClientId = activity.client_links?.[0]?.client_id || ''
  const originalClient = originalClientId && clients ? clients.find(c => c.id === originalClientId) : null
  const half = Math.floor(totalMinutes / 2)

  const [segments, setSegments] = useState([
    { minutes: half, clientId: String(originalClientId), description: '' },
    { minutes: totalMinutes - half, clientId: '', description: '' },
  ])

  const usedMinutes = segments.reduce((s, seg) => s + seg.minutes, 0)
  const remaining = totalMinutes - usedMinutes
  const canConfirm = remaining === 0 && segments.every(s => s.minutes > 0)

  function updateSegment(idx, field, value) {
    setSegments(prev => prev.map((seg, i) => {
      if (i !== idx) return seg
      if (field === 'minutes') {
        return { ...seg, minutes: Math.max(0, Number(value) || 0) }
      }
      return { ...seg, [field]: value }
    }))
  }

  function addSegment() {
    setSegments(prev => [...prev, { minutes: Math.max(0, remaining), clientId: '', description: '' }])
  }

  function removeSegment(idx) {
    if (segments.length <= 2) return
    setSegments(prev => prev.filter((_, i) => i !== idx))
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2 className="modal-title">Split Time</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="split-source">
            <div className="split-source-title">{activity.window_title}</div>
            <div className="split-source-meta">
              {formatTime(activity.start_time)} – {formatTime(activity.end_time)} · {totalMinutes}m
              {originalClient && (
                <span className="split-source-client">
                  <span className="split-source-dot" style={{ backgroundColor: clientColor(originalClient.id) }} />
                  {originalClient.name}
                </span>
              )}
            </div>
          </div>

          <div className="split-segments">
            {segments.map((seg, i) => {
              const cid = seg.clientId ? Number(seg.clientId) : null
              const color = cid ? clientColor(cid) : 'var(--border-color)'
              return (
                <div key={i} className="split-seg">
                  <div className="split-seg-header">
                    <span className="split-seg-dot" style={{ backgroundColor: color }} />
                    <span className="split-seg-label">Part {i + 1}</span>
                    {segments.length > 2 && (
                      <button className="split-seg-remove" onClick={() => removeSegment(i)} title="Remove">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="split-seg-fields">
                    <div className="split-seg-row">
                      <label className="split-seg-field-label">Duration</label>
                      <div className="split-seg-duration">
                        <input
                          type="number"
                          className="split-seg-min"
                          value={seg.minutes}
                          onChange={e => updateSegment(i, 'minutes', e.target.value)}
                          min={1}
                        />
                        <span className="split-seg-unit">min</span>
                      </div>
                    </div>
                    <div className="split-seg-row">
                      <label className="split-seg-field-label">Client</label>
                      <select
                        className="split-seg-select"
                        value={seg.clientId}
                        onChange={e => updateSegment(i, 'clientId', e.target.value)}
                      >
                        <option value="">Select client...</option>
                        {clients?.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="split-seg-row">
                      <label className="split-seg-field-label">Description</label>
                      <input
                        type="text"
                        className="split-seg-text"
                        value={seg.description}
                        onChange={e => updateSegment(i, 'description', e.target.value)}
                        placeholder="What was this portion about?"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="split-footer-row">
            <button className="split-add-btn" onClick={addSegment} type="button">
              <Plus size={14} />
              Add segment
            </button>
            <div className={`split-status ${remaining === 0 ? 'ok' : remaining < 0 ? 'over' : 'short'}`}>
              {remaining === 0
                ? `${totalMinutes}m allocated`
                : remaining > 0
                  ? `${remaining}m remaining`
                  : `${Math.abs(remaining)}m over`
              }
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSplit(activity.id, segments)} disabled={!canConfirm}>
            Split into {segments.length}
          </button>
        </div>
      </div>
    </div>
  )
}
