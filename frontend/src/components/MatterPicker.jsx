import React, { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

function CreateMatterModal({ initialName, clientName, onSave, onClose }) {
  const [name, setName] = useState(initialName)
  const [number, setNumber] = useState('')

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name.trim(), number.trim())
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }} onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2 className="modal-title">New Matter</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body">
            {clientName && (
              <div className="form-group">
                <label className="form-label">Client</label>
                <div className="form-input-static">{clientName}</div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Matter Name</label>
              <input
                className="form-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Patent Infringement Claim"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Matter Number</label>
              <input
                className="form-input"
                type="text"
                value={number}
                onChange={e => setNumber(e.target.value)}
                placeholder="e.g., MRG-005"
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Optional billing reference number
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>Add Matter</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MatterPicker({ matters, value, onChange, onCreateMatter, clientName, placeholder }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createName, setCreateName] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  const activeMatters = (matters || []).filter(m => m.status === 'active')
  const selected = value ? activeMatters.find(m => m.id === value) : null

  const filtered = search
    ? activeMatters.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.number.toLowerCase().includes(search.toLowerCase())
      )
    : activeMatters

  const exactMatch = search && activeMatters.some(m => m.name.toLowerCase() === search.toLowerCase())
  const showCreate = search.trim() && !exactMatch

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(matter) {
    onChange(matter.id)
    setOpen(false)
    setSearch('')
  }

  function handleClear() {
    onChange(null)
    setOpen(false)
    setSearch('')
  }

  function handleStartCreate() {
    setCreateName(search.trim())
    setShowCreateModal(true)
    setOpen(false)
    setSearch('')
  }

  function handleConfirmCreate(name, number) {
    const matter = onCreateMatter(name, number)
    onChange(matter.id)
    setShowCreateModal(false)
    setCreateName('')
  }

  function handleFocus() {
    setOpen(true)
    setSearch('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showCreate) {
        handleStartCreate()
      } else if (filtered.length === 1) {
        handleSelect(filtered[0])
      }
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
      inputRef.current?.blur()
    }
  }

  return (
    <>
      <div className="matter-picker" ref={ref}>
        <input
          ref={inputRef}
          className="matter-picker-input"
          type="text"
          value={open ? search : (selected ? (selected.number ? `${selected.number} — ${selected.name}` : selected.name) : '')}
          onChange={e => setSearch(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Search or create matter...'}
          onClick={e => e.stopPropagation()}
        />
        {selected && !open && (
          <button className="matter-picker-clear" onClick={e => { e.stopPropagation(); handleClear() }}>
            &times;
          </button>
        )}
        {open && (
          <div className="matter-picker-dropdown" onClick={e => e.stopPropagation()}>
            {filtered.length > 0 && (
              <div className="matter-picker-list">
                {filtered.map(m => (
                  <div
                    key={m.id}
                    className={`matter-picker-option${m.id === value ? ' selected' : ''}`}
                    onClick={() => handleSelect(m)}
                  >
                    {m.number && <span className="matter-picker-option-num">{m.number}</span>}
                    <span className="matter-picker-option-name">{m.name}</span>
                  </div>
                ))}
              </div>
            )}
            {!search && selected && (
              <div className="matter-picker-option matter-picker-option-clear" onClick={handleClear}>
                Remove matter
              </div>
            )}
            {showCreate && (
              <div className="matter-picker-option matter-picker-option-create" onClick={handleStartCreate}>
                Create "{search.trim()}"
              </div>
            )}
            {filtered.length === 0 && !showCreate && (
              <div className="matter-picker-empty">No matters found</div>
            )}
          </div>
        )}
      </div>
      {showCreateModal && (
        <CreateMatterModal
          initialName={createName}
          clientName={clientName}
          onSave={handleConfirmCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  )
}
