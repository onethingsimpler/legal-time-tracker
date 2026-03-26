import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { api } from './api'
import Header from './components/Header'
import ActivityColumn from './components/ActivityColumn'
import TimeEntries from './components/TimeEntries'
import Projects from './components/Projects'
import AddClientModal from './components/AddClientModal'
import TimeEntryModal from './components/TimeEntryModal'

export default function App() {
  // Core state
  const [date, setDate] = useState(new Date())
  const [zoom, setZoom] = useState(30)

  // Data state
  const [activities, setActivities] = useState([])
  const [entries, setEntries] = useState([])
  const [clients, setClients] = useState([])

  // Loading state
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [loadingClients, setLoadingClients] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [matching, setMatching] = useState(false)

  // Modal state
  const [clientModal, setClientModal] = useState({ open: false, client: null })
  const [entryModal, setEntryModal] = useState({
    open: false,
    entry: null,
    defaultStartTime: '',
    defaultEndTime: '',
  })

  // Toasts
  const [toasts, setToasts] = useState([])

  function addToast(message, type = 'info') {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  // Data fetching
  const dateStr = format(date, 'yyyy-MM-dd')

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true)
    try {
      const res = await api.getActivities(dateStr)
      const data = res.data
      setActivities(data?.activities || (Array.isArray(data) ? data : []))
    } catch {
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }, [dateStr])

  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true)
    try {
      const res = await api.getTimeEntries(dateStr)
      setEntries(Array.isArray(res.data) ? res.data : res.data?.entries || [])
    } catch {
      setEntries([])
    } finally {
      setLoadingEntries(false)
    }
  }, [dateStr])

  const fetchClients = useCallback(async () => {
    setLoadingClients(true)
    try {
      const res = await api.getClients()
      setClients(Array.isArray(res.data) ? res.data : res.data?.clients || [])
    } catch {
      setClients([])
    } finally {
      setLoadingClients(false)
    }
  }, [])

  const fetchAll = useCallback(() => {
    fetchActivities()
    fetchEntries()
    fetchClients()
  }, [fetchActivities, fetchEntries, fetchClients])

  // Fetch on date change
  useEffect(() => {
    fetchActivities()
    fetchEntries()
  }, [fetchActivities, fetchEntries])

  // Fetch clients on mount
  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Actions
  async function handleSyncAll() {
    setSyncing(true)
    try {
      await api.syncAll()
      addToast('Sync complete', 'success')
      fetchAll()
    } catch {
      addToast('Sync failed', 'error')
    } finally {
      setSyncing(false)
    }
  }

  // Auto AI matching - runs continuously
  const [aiActive, setAiActive] = useState(true)

  useEffect(() => {
    if (!aiActive || activities.length === 0 || clients.length === 0) return

    // Run AI match silently on initial load
    const timeout = setTimeout(async () => {
      try {
        await api.runAiMatch(dateStr)
        fetchActivities()
        fetchEntries()
      } catch {
        // AI matching runs silently
      }
    }, 2000)

    // Then poll every 30s
    const interval = setInterval(async () => {
      try {
        await api.runAiMatch(dateStr)
        fetchActivities()
        fetchEntries()
      } catch {
        // silent
      }
    }, 30000)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [aiActive, dateStr, activities.length, clients.length])

  // Client CRUD
  async function handleSaveClient(data) {
    try {
      if (data.id) {
        await api.updateClient(data.id, data)
        addToast('Client updated', 'success')
      } else {
        await api.createClient(data)
        addToast('Client added', 'success')
      }
      setClientModal({ open: false, client: null })
      fetchClients()
    } catch {
      addToast('Failed to save client', 'error')
    }
  }

  async function handleDeleteClient(id) {
    try {
      await api.deleteClient(id)
      addToast('Client deleted', 'success')
      setClientModal({ open: false, client: null })
      fetchClients()
      fetchEntries()
    } catch {
      addToast('Failed to delete client', 'error')
    }
  }

  // Time Entry CRUD
  async function handleSaveEntry(data) {
    try {
      if (data.id) {
        await api.updateTimeEntry(data.id, data)
        addToast('Time entry updated', 'success')
      } else {
        await api.createTimeEntry(data)
        addToast('Time entry created', 'success')
      }
      setEntryModal({ open: false, entry: null, defaultStartTime: '', defaultEndTime: '' })
      fetchEntries()
    } catch {
      addToast('Failed to save time entry', 'error')
    }
  }

  async function handleDeleteEntry(id) {
    try {
      await api.deleteTimeEntry(id)
      addToast('Time entry deleted', 'success')
      setEntryModal({ open: false, entry: null, defaultStartTime: '', defaultEndTime: '' })
      fetchEntries()
    } catch {
      addToast('Failed to delete time entry', 'error')
    }
  }

  function handleEditEntry(entry) {
    setEntryModal({ open: true, entry, defaultStartTime: '', defaultEndTime: '' })
  }

  function handleCreateEntry(hints = {}) {
    setEntryModal({
      open: true,
      entry: hints.client_id_hint ? { client_id: hints.client_id_hint, description: hints.description } : null,
      defaultStartTime: hints.start_time_hint || '',
      defaultEndTime: hints.end_time_hint || '',
    })
  }

  function handleExport() {
    addToast('Export feature coming soon', 'info')
  }

  return (
    <div className="app">
      <Header
        date={date}
        onDateChange={setDate}
        zoom={zoom}
        onZoomChange={setZoom}
        onSyncAll={handleSyncAll}
        syncing={syncing}
        aiActive={aiActive}
        onNewEntry={() => handleCreateEntry()}
      />

      <Projects
        clients={clients}
        entries={entries}
        onAddClient={() => setClientModal({ open: true, client: null })}
        onEditClient={(client) => setClientModal({ open: true, client })}
        onExport={handleExport}
      />

      <div className="app-content">
        <ActivityColumn
          title="Computer"
          subtitle="Apps & documents"
          icon={'\u{1F4BB}'}
          filterTypes={['app', 'document', 'browser']}
          emptyIcon={'\u{1F4BB}'}
          emptyMessage="No computer activity captured yet"
          activities={activities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
        />

        <ActivityColumn
          title="Calendar"
          subtitle="Meetings & events"
          icon={'\u{1F4C5}'}
          filterTypes={['calendar']}
          emptyIcon={'\u{1F4C5}'}
          emptyMessage="No calendar events synced"
          activities={activities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
        />

        <ActivityColumn
          title="Calls"
          subtitle="Phone & video calls"
          icon={'\u{1F4DE}'}
          filterTypes={['call']}
          emptyIcon={'\u{1F4DE}'}
          emptyMessage="No calls synced yet"
          activities={activities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
        />

        <ActivityColumn
          title="Emails"
          subtitle="Sent & received"
          icon={'\u{1F4E7}'}
          filterTypes={['email']}
          emptyIcon={'\u{1F4E7}'}
          emptyMessage="No emails synced yet"
          activities={activities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
        />

        <TimeEntries
          entries={entries}
          zoom={zoom}
          clients={clients}
          onEditEntry={handleEditEntry}
          onCreateEntry={handleCreateEntry}
        />
      </div>

      {clientModal.open && (
        <AddClientModal
          client={clientModal.client}
          onSave={handleSaveClient}
          onDelete={handleDeleteClient}
          onClose={() => setClientModal({ open: false, client: null })}
        />
      )}

      {entryModal.open && (
        <TimeEntryModal
          entry={entryModal.entry}
          date={date}
          clients={clients}
          onSave={handleSaveEntry}
          onDelete={handleDeleteEntry}
          onClose={() => setEntryModal({ open: false, entry: null, defaultStartTime: '', defaultEndTime: '' })}
          defaultStartTime={entryModal.defaultStartTime}
          defaultEndTime={entryModal.defaultEndTime}
        />
      )}

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
