import React, { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { Monitor, CalendarDays, Phone, Mail } from 'lucide-react'
import { api } from './api'
import Header from './components/Header'
import ActivityColumn, { TimeGutter, useTimeRange } from './components/ActivityColumn'
import TimeEntries from './components/TimeEntries'
import AddClientModal from './components/AddClientModal'
import TimeEntryModal from './components/TimeEntryModal'
import TimeEntryDetail from './components/TimeEntryDetail'
import ReportView from './components/ReportView'
import ManageClients from './components/ManageClients'
import SplitModal from './components/SplitModal'
import Settings from './components/Settings'

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

  // Report, manage clients & settings state
  const [showReport, setShowReport] = useState(false)
  const [showManageClients, setShowManageClients] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [splitActivity, setSplitActivity] = useState(null)
  const [roundingInterval, setRoundingInterval] = useState(0)

  // Modal state
  const [clientModal, setClientModal] = useState({ open: false, client: null })
  const [entryModal, setEntryModal] = useState({
    open: false,
    entry: null,
    defaultStartTime: '',
    defaultEndTime: '',
  })

  // Timer state
  const [timer, setTimer] = useState({ running: false, startTime: null, elapsed: 0 })
  const timerRef = useRef(null)

  useEffect(() => {
    if (timer.running) {
      timerRef.current = setInterval(() => {
        setTimer(prev => ({ ...prev, elapsed: Math.floor((Date.now() - prev.startTime) / 1000) }))
      }, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [timer.running])

  function handleStartTimer() {
    setTimer({ running: true, startTime: Date.now(), elapsed: 0 })
  }

  function handleStopTimer() {
    const startDate = new Date(timer.startTime)
    const endDate = new Date()
    const startStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
    const endStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
    setTimer({ running: false, startTime: null, elapsed: 0 })
    setEntryModal({
      open: true,
      entry: null,
      defaultStartTime: startStr,
      defaultEndTime: endStr,
    })
  }

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
  const { startHour, endHour } = useTimeRange(activities)

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

  // New entry → adds as an activity in the source columns + entry for billable tracking
  function handleSaveEntry(data) {
    const clientId = data.client_id ? Number(data.client_id) : null
    const client = clientId ? clients.find(c => c.id === clientId) : null
    const durSec = (data.duration_minutes || 0) * 60
    const actId = Date.now()

    const appNames = { call: 'Phone', email: 'Microsoft Outlook', calendar: 'Calendar', document: 'App' }
    const newActivity = {
      id: actId,
      app_name: appNames[data.activity_type] || 'App',
      window_title: data.matter || data.description || 'Manual entry',
      start_time: data.start_time,
      end_time: data.end_time,
      duration_seconds: durSec,
      activity_type: data.activity_type || 'document',
      metadata: {},
      client_links: client ? [{ id: actId, activity_id: actId, client_id: clientId, confidence: 1, matched_by: 'manual', client }] : [],
    }
    setActivities(prev => [...prev, newActivity])

    if (clientId) {
      setEntries(prev => {
        const existing = prev.find(e => e.client_id === clientId)
        if (existing) {
          return prev.map(e => e.client_id === clientId ? { ...e, billable: data.billable } : e)
        }
        return [...prev, {
          id: actId,
          client_id: clientId,
          description: data.description || data.matter || '',
          start_time: data.start_time,
          end_time: data.end_time,
          duration_seconds: durSec,
          billable: data.billable,
          source: 'manual',
          client,
        }]
      })
    }

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

  function handleSetActivityMatter(activityId, matterId) {
    setActivities(prev => prev.map(a =>
      a.id === activityId ? { ...a, matter_id: matterId } : a
    ))
  }

  function handleAddMatterToClient(clientId, matterName, matterNumber) {
    const matter = {
      id: `m-${Date.now()}`,
      name: matterName.trim(),
      number: (matterNumber || '').trim(),
      status: 'active',
    }
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c
      return { ...c, matters: [...(c.matters || []), matter] }
    }))
    return matter
  }

  function handleToggleActivityBillable(activityId) {
    setActivities(prev => prev.map(a =>
      a.id === activityId ? { ...a, billable: a.billable === false ? true : false } : a
    ))
  }

  function handleSplitActivity(activityId, segments) {
    setActivities(prev => {
      const act = prev.find(a => a.id === activityId)
      if (!act || !segments || segments.length < 2) return prev

      const start = new Date(act.start_time)
      let cursor = start.getTime()

      const newActivities = segments.map((seg, i) => {
        const segStart = new Date(cursor)
        const segEnd = new Date(cursor + seg.minutes * 60 * 1000)
        cursor = segEnd.getTime()

        const segClient = seg.clientId ? clients.find(c => c.id === Number(seg.clientId)) : null
        const segId = i === 0 ? act.id : Date.now() + i

        return {
          ...act,
          id: segId,
          window_title: seg.description || act.window_title,
          start_time: segStart.toISOString(),
          end_time: segEnd.toISOString(),
          duration_seconds: seg.minutes * 60,
          client_links: seg.clientId
            ? [{ id: segId, activity_id: segId, client_id: Number(seg.clientId), confidence: 1, matched_by: 'manual', client: segClient }]
            : [],
        }
      })

      return prev.filter(a => a.id !== activityId).concat(newActivities)
    })
    setDetailEntry(null)
    setSplitActivity(null)
    addToast('Activity split', 'success')
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
        onReport={() => setShowReport(true)}
        onExport={handleExport}
        onManageClients={() => setShowManageClients(true)}
        onSettings={() => setShowSettings(true)}
        timer={timer}
        onStartTimer={handleStartTimer}
        onStopTimer={handleStopTimer}
      />

      <div className="app-content">
        <TimeGutter startHour={startHour} endHour={endHour} />
        <ActivityColumn
          title="Computer"
          subtitle="Apps & documents"
          icon={<Monitor size={15} />}
          filterTypes={['app', 'document', 'browser']}
          emptyIcon={<Monitor size={15} />}
          emptyMessage="No computer activity captured yet"
          activities={filteredActivities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
          onAssign={handleAssignActivity}
          onUpdateTime={handleUpdateActivityTime}
          onSplit={(act) => setSplitActivity(act)}
          onToggleBillable={handleToggleActivityBillable}
          onSetMatter={handleSetActivityMatter}
          onAddMatter={handleAddMatterToClient}
          startHour={startHour}
          endHour={endHour}
        />

        <ActivityColumn
          title="Calendar"
          subtitle="Meetings & events"
          icon={<CalendarDays size={15} />}
          filterTypes={['calendar']}
          emptyIcon={<CalendarDays size={15} />}
          emptyMessage="No calendar events synced"
          activities={filteredActivities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
          onAssign={handleAssignActivity}
          onUpdateTime={handleUpdateActivityTime}
          onSplit={(act) => setSplitActivity(act)}
          onToggleBillable={handleToggleActivityBillable}
          onSetMatter={handleSetActivityMatter}
          onAddMatter={handleAddMatterToClient}
          startHour={startHour}
          endHour={endHour}
        />

        <ActivityColumn
          title="Calls"
          subtitle="Phone & video calls"
          icon={<Phone size={15} />}
          filterTypes={['call']}
          emptyIcon={<Phone size={15} />}
          emptyMessage="No calls synced yet"
          activities={filteredActivities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
          onAssign={handleAssignActivity}
          onUpdateTime={handleUpdateActivityTime}
          onSplit={(act) => setSplitActivity(act)}
          onToggleBillable={handleToggleActivityBillable}
          onSetMatter={handleSetActivityMatter}
          onAddMatter={handleAddMatterToClient}
          startHour={startHour}
          endHour={endHour}
        />

        <ActivityColumn
          title="Emails"
          subtitle="Sent & received"
          icon={<Mail size={15} />}
          filterTypes={['email']}
          emptyIcon={<Mail size={15} />}
          emptyMessage="No emails synced yet"
          activities={filteredActivities}
          zoom={zoom}
          clients={clients}
          onCreateEntry={handleCreateEntry}
          onAssign={handleAssignActivity}
          onUpdateTime={handleUpdateActivityTime}
          onSplit={(act) => setSplitActivity(act)}
          onToggleBillable={handleToggleActivityBillable}
          onSetMatter={handleSetActivityMatter}
          onAddMatter={handleAddMatterToClient}
          startHour={startHour}
          endHour={endHour}
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
          onAddMatter={handleAddMatterToClient}
          defaultStartTime={entryModal.defaultStartTime}
          defaultEndTime={entryModal.defaultEndTime}
        />
      )}

      {detailEntry && (
        <TimeEntryDetail
          entry={detailEntry}
          activities={activities}
          clients={clients}
          onClose={() => setDetailEntry(null)}
          onUnassign={(activityId) => {
            handleUnassignActivity(activityId)
            addToast('Activity unassigned', 'success')
          }}
          onToggleBillable={handleToggleActivityBillable}
          onSetMatter={handleSetActivityMatter}
          onAddMatter={handleAddMatterToClient}
          onSplit={(act) => { setDetailEntry(null); setSplitActivity(act) }}
        />
      )}

      {showManageClients && (
        <ManageClients
          clients={clients}
          onAdd={() => {
            setShowManageClients(false)
            setClientModal({ open: true, client: null })
          }}
          onEdit={(client) => {
            setShowManageClients(false)
            setClientModal({ open: true, client })
          }}
          onDelete={(id) => {
            handleDeleteClient(id)
            setShowManageClients(false)
          }}
          onClose={() => setShowManageClients(false)}
        />
      )}

      {showReport && (
        <ReportView
          onClose={() => setShowReport(false)}
          clients={clients}
          roundingInterval={roundingInterval}
        />
      )}

      {splitActivity && (
        <SplitModal
          activity={splitActivity}
          clients={clients}
          onSplit={handleSplitActivity}
          onClose={() => setSplitActivity(null)}
        />
      )}

      {showSettings && (
        <Settings
          roundingInterval={roundingInterval}
          onRoundingChange={setRoundingInterval}
          onClose={() => setShowSettings(false)}
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
