import axios from 'axios'

const API_BASE = '/api'

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const api = {
  // Activities
  getActivities(date) {
    return client.get('/activities', { params: { date } })
  },

  // Clients
  getClients() {
    return client.get('/clients')
  },

  createClient(data) {
    return client.post('/clients', data)
  },

  updateClient(id, data) {
    return client.put(`/clients/${id}`, data)
  },

  deleteClient(id) {
    return client.delete(`/clients/${id}`)
  },

  // Time Entries
  getTimeEntries(date) {
    return client.get('/time-entries', { params: { date } })
  },

  createTimeEntry(data) {
    return client.post('/time-entries', data)
  },

  updateTimeEntry(id, data) {
    return client.put(`/time-entries/${id}`, data)
  },

  deleteTimeEntry(id) {
    return client.delete(`/time-entries/${id}`)
  },

  // Daily Summary
  getDailySummary(date) {
    return client.get('/daily-summary', { params: { date } })
  },

  // AI
  runAiMatch(date) {
    return client.post('/ai/match', { date })
  },

  suggestEntries(date) {
    return client.post('/ai/suggest', { date })
  },

  // Sync
  syncAll() {
    return client.post('/sync')
  },

  // Tracker
  getTrackerStatus() {
    return client.get('/tracker/status')
  },

  startTracker() {
    return client.post('/tracker/start')
  },

  stopTracker() {
    return client.post('/tracker/stop')
  },
}
