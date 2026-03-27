import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function AddClientModal({ client, onSave, onDelete, onClose }) {
  const isEditing = !!client?.id
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [billable, setBillable] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (client) {
      setName(client.name || '')
      setDescription(client.description || '')
      setBillable(client.billable !== false)
    }
  }, [client])

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        billable,
      }

      if (isEditing) {
        data.id = client.id
      }

      await onSave(data)
    } catch {
      // Error handled in parent
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete client "${name}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      await onDelete(client.id)
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
          <h2 className="modal-title">{isEditing ? 'Edit Client' : 'Add Client'}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Client Name</label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Smith & Associates"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">AI Description</label>
              <textarea
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Real estate client, involved in commercial property acquisitions in Manhattan. Key contacts: John Smith (partner), Jane Doe (in-house counsel)."
                rows={3}
                style={{ resize: 'vertical' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Describe the client so AI can match activities automatically
              </div>
            </div>

            <div className="form-group">
              <label className="form-label-inline" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!billable}
                  onChange={(e) => setBillable(!e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Non-billable</span>
              </label>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Mark for internal, admin, or pro-bono work that should not be billed
              </div>
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
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
