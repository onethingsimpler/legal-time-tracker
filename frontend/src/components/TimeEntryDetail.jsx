import React from 'react'
import { X } from 'lucide-react'

function formatTime(d) {
  return d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''
}

function formatDuration(seconds) {
  if (!seconds) return '0m'
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`
}

const TYPE_LABELS = {
  document: '💻 Document',
  browser: '💻 Browser',
  calendar: '📅 Meeting',
  call: '📞 Call',
  email: '📧 Email',
}

export default function TimeEntryDetail({ entry, activities, onClose, onUnassign }) {
  const clientId = entry.client_id
  const clientActivities = (activities || []).filter(a =>
    a.client_links?.length > 0 && a.client_links[0].client_id === clientId
  )

  const totalMinutes = clientActivities.reduce((sum, a) => sum + (a.duration_seconds || 0) / 60, 0)

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              backgroundColor: entry.clientColor || '#94a3b8',
              flexShrink: 0,
            }} />
            {entry.clientName}
          </h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <div className="ted-summary">
            <div className="ted-summary-item">
              <span className="ted-summary-label">Total Time</span>
              <span className="ted-summary-value">{formatDuration(entry.duration_seconds)}</span>
            </div>
            <div className="ted-summary-item">
              <span className="ted-summary-label">Activities</span>
              <span className="ted-summary-value">{clientActivities.length}</span>
            </div>
          </div>

          {entry.description && (
            <div className="ted-desc">
              <div className="ted-desc-label">{'\u2728'} AI Summary</div>
              <div className="ted-desc-text">{entry.description}</div>
            </div>
          )}

          <div className="ted-activities-label">Activity Breakdown</div>
          <div className="ted-activities">
            {clientActivities.length === 0 ? (
              <div className="ted-empty">No activities linked</div>
            ) : (
              clientActivities.map(act => {
                const dur = Math.round((act.duration_seconds || 0) / 60)
                return (
                  <div key={act.id} className="ted-activity">
                    <div className="ted-activity-left">
                      <span className="ted-activity-type">{TYPE_LABELS[act.activity_type] || act.activity_type}</span>
                      <span className="ted-activity-title">{act.window_title}</span>
                      <span className="ted-activity-time">{formatTime(act.start_time)} – {formatTime(act.end_time)}</span>
                    </div>
                    <div className="ted-activity-right">
                      <span className="ted-activity-dur">{dur}m</span>
                      <button
                        className="ted-unassign-btn"
                        onClick={(e) => { e.stopPropagation(); onUnassign(act.id) }}
                      >
                        Unassign
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
