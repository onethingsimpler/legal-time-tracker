import React, { useState, useMemo } from 'react'
import { X, Plus, Pencil, Trash2, Search } from 'lucide-react'

export default function ManageClients({ clients, onAdd, onEdit, onDelete, onClose }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    )
  }, [clients, search])

  function handleDelete(client) {
    if (!window.confirm(`Delete client "${client.name}"? This cannot be undone.`)) return
    onDelete(client.id)
  }

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-card" onClick={e => e.stopPropagation()}>
        <div className="report-header">
          <h2 className="report-title">Manage Clients</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 28px 0' }}>
          <div className="mc-search">
            <Search size={14} className="mc-search-icon" />
            <input
              className="mc-search-input"
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="report-body">
          {filtered.length === 0 ? (
            <div className="report-empty">
              {clients.length === 0
                ? 'No clients yet. Add your first client to get started.'
                : 'No clients match your search.'}
            </div>
          ) : (
            <div className="mc-list">
              {filtered.map(c => (
                <div key={c.id} className="mc-row">
                  <div className="mc-info">
                    <div className="mc-name">
                      {c.name}
                      {c.billable === false && (
                        <span className="mc-nb-badge">Non-billable</span>
                      )}
                    </div>
                    {c.description && (
                      <div className="mc-description">{c.description}</div>
                    )}
                  </div>
                  <div className="mc-actions">
                    <button className="mc-btn" onClick={() => onEdit(c)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="mc-btn mc-btn-danger" onClick={() => handleDelete(c)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <Plus size={14} />
            Add Client
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
