import React from 'react'
import { Download, BarChart3, Users } from 'lucide-react'

export default function Projects({ onManageClients, onExport, onReport }) {
  return (
    <div className="projects-bar">
      <div style={{ flex: 1 }} />
      <div className="projects-bar-right">
        <button className="btn btn-secondary btn-sm" onClick={onManageClients}>
          <Users size={12} />
          Clients
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onReport}>
          <BarChart3 size={12} />
          Report
        </button>
        <button className="btn btn-primary btn-sm" onClick={onExport}>
          <Download size={12} />
          Export
        </button>
      </div>
    </div>
  )
}
