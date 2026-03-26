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
} from 'lucide-react'
import { api } from '../api'

export default function Header({
  date,
  onDateChange,
  zoom,
  onZoomChange,
  onSyncAll,
  syncing,
  aiActive,
  onNewEntry,
  searchQuery,
  onSearchChange,
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
