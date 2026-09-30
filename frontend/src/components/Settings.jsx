import React from 'react'
import { X } from 'lucide-react'

export default function Settings({ roundingInterval, onRoundingChange, onClose }) {
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Billing Interval</label>
            <select
              className="form-select"
              value={roundingInterval}
              onChange={e => onRoundingChange(Number(e.target.value))}
            >
              <option value={0}>Exact time</option>
              <option value={6}>6 min (1/10 hr)</option>
              <option value={10}>10 min (1/6 hr)</option>
              <option value={15}>15 min (1/4 hr)</option>
              <option value={30}>30 min (1/2 hr)</option>
            </select>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Round up each client's time to the nearest interval in reports
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
