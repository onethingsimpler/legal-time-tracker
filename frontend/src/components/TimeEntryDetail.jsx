import React from 'react'
import { X, Scissors } from 'lucide-react'
import { clientColor } from '../clientColor'
import MatterPicker from './MatterPicker'

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
  document: '\u{1F4BB} Document',
  browser: '\u{1F4BB} Browser',
  calendar: '\u{1F4C5} Meeting',
  call: '\u{1F4DE} Call',
  email: '\u{1F4E7} Email',
}

export default function TimeEntryDetail({ entry, activities, clients, onClose, onUnassign, onToggleBillable, onSetMatter, onAddMatter, onSplit }) {
  const clientId = entry.client_id
  const client = clients?.find(c => c.id === clientId)
  const activeMatters = client?.matters?.filter(m => m.status === 'active') || []
  const clientActivities = (activities || []).filter(a =>
    a.client_links?.length > 0 && a.client_links[0].client_id === clientId
  )


  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 12, height: 12, borderRadius: '50%',
              backgroundColor: entry.clientColor || clientColor(entry.client_id),
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
                const isNonBillable = act.billable === false
                return (
                  <div key={act.id} className={`ted-activity${isNonBillable ? ' ted-activity-nb' : ''}`} style={{ flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <div className="ted-activity-left">
                        <span className="ted-activity-type">{TYPE_LABELS[act.activity_type] || act.activity_type}</span>
                        <span className="ted-activity-title">{act.window_title}</span>
                        <span className="ted-activity-time">{formatTime(act.start_time)} – {formatTime(act.end_time)}</span>
                      </div>
                      <div className="ted-activity-right">
                        <span className="ted-activity-dur">{dur}m</span>
                        {isNonBillable && <span className="ted-activity-nb-badge">NB</span>}
                      </div>
                    </div>
                    <div className="ted-activity-meta">
                      <div className="ted-activity-matter-row" onClick={e => e.stopPropagation()}>
                        <MatterPicker
                          matters={client?.matters}
                          value={act.matter_id}
                          onChange={matterId => onSetMatter(act.id, matterId)}
                          onCreateMatter={(name, number) => onAddMatter(clientId, name, number)}
                          clientName={client?.name}
                          placeholder="Search or create matter..."
                        />
                      </div>
                      <div className="ted-activity-actions-row">
                        <button className="ted-activity-action-link" onClick={e => { e.stopPropagation(); onToggleBillable(act.id) }}>
                          {isNonBillable ? 'Mark billable' : 'Non billable'}
                        </button>
                        {dur > 1 && (
                          <button className="ted-activity-action-link" onClick={e => { e.stopPropagation(); onClose(); onSplit(act) }}>
                            <Scissors size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                            Split
                          </button>
                        )}
                        <button className="ted-activity-action-link ted-activity-action-danger" onClick={e => { e.stopPropagation(); onUnassign(act.id) }}>
                          Unassign
                        </button>
                      </div>
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
