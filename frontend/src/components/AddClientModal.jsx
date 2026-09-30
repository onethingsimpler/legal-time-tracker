import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Archive, Search } from 'lucide-react'

export default function AddClientModal({ client, onSave, onDelete, onClose }) {
  const isEditing = !!client?.id
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [matters, setMatters] = useState([])
  const [newMatterName, setNewMatterName] = useState('')
  const [newMatterNumber, setNewMatterNumber] = useState('')
  const [matterSearch, setMatterSearch] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (client) {
      setName(client.name || '')
      setDescription(client.description || '')
      setMatters(client.matters || [])
    }
  }, [client])

  function addMatter() {
    const trimmedName = newMatterName.trim()
    if (!trimmedName) return
    const matter = {
      id: `m-${Date.now()}`,
      name: trimmedName,
      number: newMatterNumber.trim() || '',
      status: 'active',
    }
    setMatters(prev => [...prev, matter])
    setNewMatterName('')
    setNewMatterNumber('')
  }

  function removeMatter(id) {
    setMatters(prev => prev.filter(m => m.id !== id))
  }

  function toggleMatterStatus(id) {
    setMatters(prev => prev.map(m =>
      m.id === id ? { ...m, status: m.status === 'active' ? 'closed' : 'active' } : m
    ))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const data = { name: name.trim(), description: description.trim(), matters }
      if (isEditing) data.id = client.id
      await onSave(data)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete client "${name}"? This cannot be undone.`)) return
    setSaving(true)
    try { await onDelete(client.id) } catch {} finally { setSaving(false) }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const activeMatters = matters.filter(m => m.status === 'active')
  const closedMatters = matters.filter(m => m.status === 'closed')
  const searchLower = matterSearch.toLowerCase()
  const filteredActive = matterSearch
    ? activeMatters.filter(m => m.name.toLowerCase().includes(searchLower) || m.number.toLowerCase().includes(searchLower))
    : activeMatters
  const filteredClosed = matterSearch
    ? closedMatters.filter(m => m.name.toLowerCase().includes(searchLower) || m.number.toLowerCase().includes(searchLower))
    : closedMatters

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEditing ? 'Edit Client' : 'Add Client'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
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
                placeholder="e.g., Real estate client, involved in commercial property acquisitions in Manhattan."
                rows={2}
                style={{ resize: 'vertical' }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Describe the client so AI can match activities automatically
              </div>
            </div>

            <div className="form-group">
              <div className="matters-header">
                <label className="form-label" style={{ margin: 0 }}>Matters</label>
                <span className="matters-count">{activeMatters.length} active{closedMatters.length > 0 && `, ${closedMatters.length} closed`}</span>
              </div>

              {matters.length > 5 && (
                <div className="matters-search">
                  <Search size={13} className="matters-search-icon" />
                  <input
                    type="text"
                    className="matters-search-input"
                    placeholder="Search matters..."
                    value={matterSearch}
                    onChange={e => setMatterSearch(e.target.value)}
                  />
                </div>
              )}

              <div className="matters-scroll">
                {filteredActive.length > 0 && (
                  <div className="matters-table">
                    {filteredActive.map(m => (
                      <div key={m.id} className="matter-row">
                        <span className="matter-number">{m.number || '—'}</span>
                        <span className="matter-name">{m.name}</span>
                        <button type="button" className="matter-action-btn" onClick={() => toggleMatterStatus(m.id)} title="Close matter">
                          <Archive size={12} />
                        </button>
                        <button type="button" className="matter-action-btn matter-action-delete" onClick={() => removeMatter(m.id)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(showClosed || matterSearch) && filteredClosed.length > 0 && (
                  <div className="matters-table matters-table-closed">
                    <div className="matters-closed-label">Closed</div>
                    {filteredClosed.map(m => (
                      <div key={m.id} className="matter-row matter-row-closed">
                        <span className="matter-number">{m.number || '—'}</span>
                        <span className="matter-name">{m.name}</span>
                        <button type="button" className="matter-action-btn" onClick={() => toggleMatterStatus(m.id)} title="Reopen">
                          <Archive size={12} />
                        </button>
                        <button type="button" className="matter-action-btn matter-action-delete" onClick={() => removeMatter(m.id)} title="Delete">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!matterSearch && closedMatters.length > 0 && !showClosed && (
                  <button type="button" className="matters-show-closed" onClick={() => setShowClosed(true)}>
                    Show {closedMatters.length} closed
                  </button>
                )}

                {filteredActive.length === 0 && filteredClosed.length === 0 && matterSearch && (
                  <div className="matters-no-results">No matters match "{matterSearch}"</div>
                )}
              </div>

              <div className="matter-add-row">
                <input
                  className="form-input"
                  type="text"
                  value={newMatterNumber}
                  onChange={(e) => setNewMatterNumber(e.target.value)}
                  placeholder="Number"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMatter() } }}
                  style={{ width: 80, flexShrink: 0 }}
                />
                <input
                  className="form-input"
                  type="text"
                  value={newMatterName}
                  onChange={(e) => setNewMatterName(e.target.value)}
                  placeholder="Add new matter..."
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMatter() } }}
                  style={{ flex: 1 }}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={addMatter} disabled={!newMatterName.trim()}>
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            {isEditing && (
              <div className="modal-footer-left">
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>Delete</button>
              </div>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
