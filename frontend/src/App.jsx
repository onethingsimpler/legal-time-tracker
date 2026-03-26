import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { api } from './api'
import Header from './components/Header'
import ActivityColumn from './components/ActivityColumn'
import TimeEntries from './components/TimeEntries'
import Projects from './components/Projects'
import AddClientModal from './components/AddClientModal'
import TimeEntryModal from './components/TimeEntryModal'
import TimeEntryDetail from './components/TimeEntryDetail'

export default function App() {
  // Core state
  const [date, setDate] = useState(new Date())
  const [zoom, setZoom] = useState(30)
  const [searchQuery, setSearchQuery] = useState('')

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

  const [aiActive] = useState(true)

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

  // New entry → adds as an activity in the source columns
  function handleSaveEntry(data) {
    const clientId = data.client_id ? Number(data.client_id) : null
    const client = clientId ? clients.find(c => c.id === clientId) : null
    const durSec = (data.duration_minutes || 0) * 60

    const appNames = { call: 'Phone', email: 'Microsoft Outlook', calendar: 'Calendar', document: 'App' }
    const newActivity = {
      id: Date.now(),
      app_name: appNames[data.activity_type] || 'App',
      window_title: data.matter || data.description || 'Manual entry',
      start_time: data.start_time,
      end_time: data.end_time,
      duration_seconds: durSec,
      activity_type: data.activity_type || 'document',
      metadata: {},
      client_links: client ? [{ id: Date.now(), activity_id: Date.now(), client_id: clientId, confidence: 1, matched_by: 'manual', client }] : [],
    }
    setActivities(prev => [...prev, newActivity])
    addToast('Entry added', 'success')
    setEntryModal({ open: false, entry: null, defaultStartTime: '', defaultEndTime: '' })
  }

  function handleDeleteEntry(id) {
    setEntries(prev => prev.filter(e => e.id !== id))
    addToast('Time entry deleted', 'success')
    setEntryModal({ open: false, entry: null, defaultStartTime: '', defaultEndTime: '' })
  }

  // Time Entry Detail (view breakdown)
  const [detailEntry, setDetailEntry] = useState(null)

  function handleEditEntry(entry) {
    setDetailEntry(entry)
  }

  function handleUnassignActivity(activityId) {
    setActivities(prev => prev.map(a => {
      if (a.id !== activityId) return a
      return { ...a, client_links: [] }
    }))
  }

  function handleCreateEntry(hints = {}) {
    setEntryModal({
      open: true,
      entry: hints.client_id_hint ? { client_id: hints.client_id_hint, description: hints.description } : null,
      defaultStartTime: hints.start_time_hint || '',
      defaultEndTime: hints.end_time_hint || '',
    })
  }

  const filteredActivities = searchQuery
    ? activities.filter(a => (a.window_title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.app_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : activities

  function handleExport() {
    addToast('Export feature coming soon', 'info')
  }

  function handleUpdateActivityTime(activityId, startTime, endTime) {
    setActivities(prev => prev.map(a => {
      if (a.id !== activityId) return a
      const base = new Date(a.start_time)
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const newStart = new Date(base); newStart.setHours(sh, sm, 0, 0)
      const newEnd = new Date(base); newEnd.setHours(eh, em, 0, 0)
      const durSec = (newEnd - newStart) / 1000
      return { ...a, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), duration_seconds: durSec }
    }))
  }

  function handleAssignActivity(activityId, clientId) {
    const client = clients.find(c => c.id === clientId)
    setActivities(prev => prev.map(a => {
      if (a.id !== activityId) return a
      return {
        ...a,
        client_links: [{ id: activityId, activity_id: activityId, client_id: clientId, confidence: 1, matched_by: 'manual', client }]
      }
    }))
    addToast(`Assigned to ${client?.name}`, 'success')
  }

  return (
    <div className="app">
      <Header
        date={date}
        onDateChange={setDate}
        zoom={zoom}
        onZoomChange={setZoom}
        aiActive={aiActive}
        onNewEntry={() => handleCreateEntry()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
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
          activities={filteredActivities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
          onAssign={handleAssignActivity}
          onUpdateTime={handleUpdateActivityTime}
        />

        <ActivityColumn
          title="Calendar"
          subtitle="Meetings & events"
          icon={'\u{1F4C5}'}
          filterTypes={['calendar']}
          emptyIcon={'\u{1F4C5}'}
          emptyMessage="No calendar events synced"
          activities={filteredActivities}
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
          activities={filteredActivities}
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
          activities={filteredActivities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
        />

        <TimeEntries
          entries={entries}
          clients={clients}
          activities={filteredActivities}
          onEditEntry={handleEditEntry}
          onAssign={handleAssignActivity}
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

      {detailEntry && (
        <TimeEntryDetail
          entry={detailEntry}
          activities={activities}
          onClose={() => setDetailEntry(null)}
          onUnassign={(activityId) => {
            handleUnassignActivity(activityId)
            addToast('Activity unassigned', 'success')
          }}
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
