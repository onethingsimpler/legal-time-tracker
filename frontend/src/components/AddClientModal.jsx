import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const COLOR_OPTIONS = [
  '#22c55e', '#f97316', '#ec4899', '#8b5cf6',
  '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444',
  '#06b6d4', '#84cc16', '#a855f7', '#f43f5e',
]

export default function AddClientModal({ client, onSave, onDelete, onClose }) {
  const isEditing = !!client?.id
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [keywords, setKeywords] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (client) {
      setName(client.name || '')
      setColor(client.color || COLOR_OPTIONS[0])
      setKeywords(
        Array.isArray(client.keywords)
          ? client.keywords.join(', ')
          : client.keywords || ''
      )
    }
  }, [client])

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        color,
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
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
              <label className="form-label">Color</label>
              <div className="color-picker-group">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-swatch ${color === c ? 'selected' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Keywords (comma separated)</label>
              <input
                className="form-input"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g., smith, merger, acquisition"
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Used for AI matching of activities to this client
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
