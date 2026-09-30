import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  Sparkles,
  Loader2,
  Plus,
  Search,
  BarChart3,
  Download,
  Users,
  Play,
  Square,
  Timer,
  Settings,
} from 'lucide-react'
import { api } from '../api'

function formatElapsed(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Header({
  date,
  onDateChange,
  aiActive,
  onNewEntry,
  searchQuery,
  onSearchChange,
  onReport,
  onExport,
  onManageClients,
  onSettings,
  timer,
  onStartTimer,
  onStopTimer,
}) {
  const [trackerRunning, setTrackerRunning] = useState(false)
  const [trackerLoading, setTrackerLoading] = useState(false)

  useEffect(() => {
    fetchTrackerStatus()
  }, [])

  async function fetchTrackerStatus() {
    try {
      const res = await api.getTrackerStatus()
      setTrackerRunning(res.data?.running ?? false)
    } catch {
      // Tracker status unavailable
    }
  }

  async function toggleTracker() {
    setTrackerLoading(true)
    try {
      if (trackerRunning) {
        await api.stopTracker()
        setTrackerRunning(false)
      } else {
        await api.startTracker()
        setTrackerRunning(true)
      }
    } catch {
      // Handle error silently
    } finally {
      setTrackerLoading(false)
    }
  }

  function goToPreviousDay() {
    const prev = new Date(date)
    prev.setDate(prev.getDate() - 1)
    onDateChange(prev)
  }

  function goToNextDay() {
    const next = new Date(date)
    next.setDate(next.getDate() + 1)
    onDateChange(next)
  }

  function goToToday() {
    onDateChange(new Date())
  }

  const dateStr = format(date, 'EEEE, MMMM d, yyyy')

  return (
    <header className="header">
      <div className="header-left">
        <div className="header-logo">
          Legal<span>TimeTracker</span>
        </div>
        <div className="header-search">
          <Search size={14} className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="header-center">
        <div className="date-nav">
          <button className="date-nav-btn" onClick={goToPreviousDay} title="Previous day">
            <ChevronLeft size={16} />
          </button>
          <span className="date-display" onClick={goToToday} title="Go to today">
            <Calendar size={14} style={{ marginRight: 6, verticalAlign: -1, display: 'inline' }} />
            {dateStr}
          </span>
          <button className="date-nav-btn" onClick={goToNextDay} title="Next day">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="header-right">
        <button className="btn btn-ghost btn-sm" onClick={onManageClients} title="Manage clients">
          <Users size={14} />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onSettings} title="Settings">
          <Settings size={14} />
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onReport}>
          <BarChart3 size={14} />
          Report
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onExport}>
          <Download size={14} />
          Export
        </button>
        <div className="timer-controls">
          {timer?.running ? (
            <>
              <span className="timer-display">{formatElapsed(timer.elapsed)}</span>
              <button className="btn btn-danger btn-sm" onClick={onStopTimer} title="Stop timer">
                <Square size={12} />
                Stop
              </button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => onStartTimer()} title="Start timer">
              <Play size={12} />
              Timer
            </button>
          )}
        </div>

        <button className="btn btn-primary" onClick={onNewEntry} title="New time entry">
          <Plus size={14} />
          New Entry
        </button>

        <div className="ai-status">
          <Sparkles size={14} className={aiActive ? 'ai-sparkle' : ''} />
          <span>AI {aiActive ? 'Active' : 'Paused'}</span>
          <span className={`ai-dot ${aiActive ? 'active' : ''}`} />
        </div>
      </div>
    </header>
  )
}
