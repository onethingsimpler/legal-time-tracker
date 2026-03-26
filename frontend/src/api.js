// Static demo mode - all data is embedded, no server needed.
// For live mode with a backend, swap this file with api.server.js

function today(hour, minute = 0) {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// ── Demo Clients ──────────────────────────────────────────────
const CLIENTS = [
  { id: 1, name: 'Morgan Ltd.', color: '#3B82F6', keywords: ['morgan'], created_at: new Date().toISOString() },
  { id: 2, name: 'Axion Ltd.', color: '#EF4444', keywords: ['axion'], created_at: new Date().toISOString() },
  { id: 3, name: 'Harper & Associates', color: '#10B981', keywords: ['harper'], created_at: new Date().toISOString() },
  { id: 4, name: 'AcmeCorp', color: '#F59E0B', keywords: ['acme'], created_at: new Date().toISOString() },
  { id: 5, name: 'Daven Ltd.', color: '#8B5CF6', keywords: ['daven'], created_at: new Date().toISOString() },
]

function clientById(id) {
  return CLIENTS.find(c => c.id === id) || null
}

// ── Demo Activities ───────────────────────────────────────────
const ACTIVITIES = [
  // Computer / Document
  { id: 1, app_name: 'Microsoft Word', window_title: 'Morgan_Ltd_Service_Agreement_v4_REDLINE.docx', start_time: today(8,30), end_time: today(9,15), duration_seconds: 2700, activity_type: 'document', metadata: {}, client_links: [{ id:1, activity_id:1, client_id:1, confidence:0.95, matched_by:'AI', client: clientById(1) }] },
  { id: 2, app_name: 'Adobe Acrobat', window_title: 'Morgan_Ltd_Board_Resolution_2026.pdf', start_time: today(9,15), end_time: today(9,30), duration_seconds: 900, activity_type: 'document', metadata: {}, client_links: [{ id:2, activity_id:2, client_id:1, confidence:0.95, matched_by:'AI', client: clientById(1) }] },
  { id: 3, app_name: 'Microsoft Excel', window_title: 'AcmeCorp_Q1_Billing_Reconciliation.xlsx', start_time: today(10,30), end_time: today(11,0), duration_seconds: 1800, activity_type: 'document', metadata: {}, client_links: [{ id:3, activity_id:3, client_id:4, confidence:0.95, matched_by:'AI', client: clientById(4) }] },
  { id: 4, app_name: 'Microsoft Word', window_title: 'Axion_IP_Claim_Response_FINAL.docx', start_time: today(11,30), end_time: today(12,15), duration_seconds: 2700, activity_type: 'document', metadata: {}, client_links: [{ id:4, activity_id:4, client_id:2, confidence:0.95, matched_by:'AI', client: clientById(2) }] },
  { id: 5, app_name: 'Google Chrome', window_title: 'Westlaw - Patent Infringement Case Law 2025-2026', start_time: today(12,15), end_time: today(12,45), duration_seconds: 1800, activity_type: 'browser', metadata: {}, client_links: [{ id:5, activity_id:5, client_id:2, confidence:0.85, matched_by:'AI', client: clientById(2) }] },
  { id: 6, app_name: 'Microsoft PowerPoint', window_title: 'Daven_Vendor_Performance_Brief_Q1.pptx', start_time: today(13,30), end_time: today(14,0), duration_seconds: 1800, activity_type: 'document', metadata: {}, client_links: [{ id:6, activity_id:6, client_id:5, confidence:0.95, matched_by:'AI', client: clientById(5) }] },
  { id: 7, app_name: 'Microsoft Word', window_title: 'Harper_Exec_Employment_Agreement_v3_TRACKED.docx', start_time: today(14,30), end_time: today(15,15), duration_seconds: 2700, activity_type: 'document', metadata: {}, client_links: [{ id:7, activity_id:7, client_id:3, confidence:0.95, matched_by:'AI', client: clientById(3) }] },
  { id: 8, app_name: 'Adobe Acrobat', window_title: 'AcmeCorp_Regulatory_Compliance_Checklist.pdf', start_time: today(15,30), end_time: today(15,45), duration_seconds: 900, activity_type: 'document', metadata: {}, client_links: [{ id:8, activity_id:8, client_id:4, confidence:0.95, matched_by:'AI', client: clientById(4) }] },
  { id: 9, app_name: 'Google Chrome', window_title: 'SEC.gov - Recent Enforcement Actions & Compliance Updates', start_time: today(15,45), end_time: today(16,0), duration_seconds: 900, activity_type: 'browser', metadata: {}, client_links: [{ id:9, activity_id:9, client_id:4, confidence:0.80, matched_by:'AI', client: clientById(4) }] },
  { id: 10, app_name: 'Microsoft Word', window_title: 'Daven_Litigation_Memo_re_Discovery_Responses.docx', start_time: today(16,30), end_time: today(17,0), duration_seconds: 1800, activity_type: 'document', metadata: {}, client_links: [{ id:10, activity_id:10, client_id:5, confidence:0.95, matched_by:'AI', client: clientById(5) }] },

  // Calendar
  { id: 11, app_name: 'Calendar', window_title: 'Team Standup - Litigation Group', start_time: today(8,45), end_time: today(9,0), duration_seconds: 900, activity_type: 'calendar', metadata: {}, client_links: [] },
  { id: 12, app_name: 'Calendar', window_title: 'Meeting with James Harper - Employment Terms Review', start_time: today(10,0), end_time: today(10,30), duration_seconds: 1800, activity_type: 'calendar', metadata: {}, client_links: [{ id:12, activity_id:12, client_id:3, confidence:0.95, matched_by:'AI', client: clientById(3) }] },
  { id: 13, app_name: 'Calendar', window_title: 'Morgan Ltd. - Contract Negotiation Call', start_time: today(11,0), end_time: today(11,30), duration_seconds: 1800, activity_type: 'calendar', metadata: {}, client_links: [{ id:13, activity_id:13, client_id:1, confidence:0.95, matched_by:'AI', client: clientById(1) }] },
  { id: 14, app_name: 'Calendar', window_title: 'Lunch - Partner Review (Private)', start_time: today(12,45), end_time: today(13,30), duration_seconds: 2700, activity_type: 'calendar', metadata: {}, client_links: [] },
  { id: 15, app_name: 'Calendar', window_title: 'AcmeCorp - Compliance Review & Audit Prep', start_time: today(16,0), end_time: today(16,30), duration_seconds: 1800, activity_type: 'calendar', metadata: {}, client_links: [{ id:15, activity_id:15, client_id:4, confidence:0.95, matched_by:'AI', client: clientById(4) }] },

  // Calls
  { id: 16, app_name: 'Phone', window_title: 'Sarah Chen (Morgan Ltd. - General Counsel)', start_time: today(9,30), end_time: today(9,45), duration_seconds: 900, activity_type: 'call', metadata: {}, client_links: [{ id:16, activity_id:16, client_id:1, confidence:0.95, matched_by:'AI', client: clientById(1) }] },
  { id: 17, app_name: 'FaceTime', window_title: 'James Harper - (917) 555-0142', start_time: today(10,0), end_time: today(10,25), duration_seconds: 1500, activity_type: 'call', metadata: {}, client_links: [{ id:17, activity_id:17, client_id:3, confidence:0.95, matched_by:'AI', client: clientById(3) }] },
  { id: 18, app_name: 'Phone', window_title: 'John Daven - (212) 555-0198', start_time: today(13,30), end_time: today(13,50), duration_seconds: 1200, activity_type: 'call', metadata: {}, client_links: [{ id:18, activity_id:18, client_id:5, confidence:0.95, matched_by:'AI', client: clientById(5) }] },
  { id: 19, app_name: 'Phone', window_title: 'Opposing Counsel - Richards & Webb LLP', start_time: today(14,0), end_time: today(14,15), duration_seconds: 900, activity_type: 'call', metadata: {}, client_links: [{ id:19, activity_id:19, client_id:5, confidence:0.80, matched_by:'AI', client: clientById(5) }] },
  { id: 20, app_name: 'Zoom', window_title: 'AcmeCorp - Compliance Review Call', start_time: today(16,0), end_time: today(16,30), duration_seconds: 1800, activity_type: 'call', metadata: {}, client_links: [{ id:20, activity_id:20, client_id:4, confidence:0.95, matched_by:'AI', client: clientById(4) }] },
  { id: 21, app_name: 'Phone', window_title: 'Court Clerk - NY Supreme Court (Filing Confirmation)', start_time: today(17,0), end_time: today(17,10), duration_seconds: 600, activity_type: 'call', metadata: {}, client_links: [{ id:21, activity_id:21, client_id:5, confidence:0.70, matched_by:'AI', client: clientById(5) }] },

  // Emails
  { id: 22, app_name: 'Microsoft Outlook', window_title: 'Re: Morgan Ltd - Service Agreement Amendment (Sarah Chen)', start_time: today(8,30), end_time: today(8,45), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: [{ id:22, activity_id:22, client_id:1, confidence:0.95, matched_by:'AI', client: clientById(1) }] },
  { id: 23, app_name: 'Microsoft Outlook', window_title: 'FW: Board Resolution - Morgan Ltd. Restructuring', start_time: today(9,15), end_time: today(9,30), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: [{ id:23, activity_id:23, client_id:1, confidence:0.95, matched_by:'AI', client: clientById(1) }] },
  { id: 24, app_name: 'Microsoft Outlook', window_title: 'Re: Introduction - Axion Ltd. IP Matters', start_time: today(11,0), end_time: today(11,10), duration_seconds: 600, activity_type: 'email', metadata: {}, client_links: [{ id:24, activity_id:24, client_id:2, confidence:0.95, matched_by:'AI', client: clientById(2) }] },
  { id: 25, app_name: 'Microsoft Outlook', window_title: 'Axion Ltd. - Patent Filing Deadline Reminder (Mar 31)', start_time: today(11,15), end_time: today(11,25), duration_seconds: 600, activity_type: 'email', metadata: {}, client_links: [{ id:25, activity_id:25, client_id:2, confidence:0.95, matched_by:'AI', client: clientById(2) }] },
  { id: 26, app_name: 'Microsoft Outlook', window_title: 'Re: Harper Employment Agreement - Final Comments from James', start_time: today(14,15), end_time: today(14,30), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: [{ id:26, activity_id:26, client_id:3, confidence:0.95, matched_by:'AI', client: clientById(3) }] },
  { id: 27, app_name: 'Microsoft Outlook', window_title: 'AcmeCorp - Q1 Invoice #2026-0341 Attached', start_time: today(15,15), end_time: today(15,25), duration_seconds: 600, activity_type: 'email', metadata: {}, client_links: [{ id:27, activity_id:27, client_id:4, confidence:0.95, matched_by:'AI', client: clientById(4) }] },
  { id: 28, app_name: 'Microsoft Outlook', window_title: 'Meeting Notes: AcmeCorp Compliance Audit Prep', start_time: today(16,30), end_time: today(16,45), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: [{ id:28, activity_id:28, client_id:4, confidence:0.95, matched_by:'AI', client: clientById(4) }] },
  { id: 29, app_name: 'Microsoft Outlook', window_title: 'Daven Ltd. - Discovery Responses Due April 7', start_time: today(17,0), end_time: today(17,15), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: [{ id:29, activity_id:29, client_id:5, confidence:0.95, matched_by:'AI', client: clientById(5) }] },
]

// ── Demo Time Entries ─────────────────────────────────────────
const TIME_ENTRIES = [
  { id: 1, client_id: 1, matter_id: 1, description: 'Reviewed and redlined service agreement v4; reviewed board resolution; email correspondence with Sarah Chen re: amendment terms; call with General Counsel', start_time: today(8,30), end_time: today(9,48), duration_seconds: 4680, source: 'ai_suggested', status: 'confirmed', client: clientById(1) },
  { id: 2, client_id: 3, matter_id: 5, description: 'Meeting with James Harper to review executive employment terms; discussed non-compete and severance provisions', start_time: today(10,0), end_time: today(10,30), duration_seconds: 1800, source: 'ai_suggested', status: 'confirmed', client: clientById(3) },
  { id: 3, client_id: 4, matter_id: 7, description: 'Reconciled Q1 billing spreadsheet; prepared invoice #2026-0341', start_time: today(10,30), end_time: today(11,0), duration_seconds: 1800, source: 'ai_suggested', status: 'confirmed', client: clientById(4) },
  { id: 4, client_id: 1, matter_id: 2, description: 'Contract negotiation call; discussed subsidiary merger timeline and regulatory approvals', start_time: today(11,0), end_time: today(11,30), duration_seconds: 1800, source: 'ai_suggested', status: 'confirmed', client: clientById(1) },
  { id: 5, client_id: 2, matter_id: 3, description: 'Email correspondence re: introduction and patent filing deadline; finalized IP claim response; Westlaw patent case law research', start_time: today(11,0), end_time: today(12,48), duration_seconds: 6480, source: 'ai_suggested', status: 'draft', client: clientById(2) },
  { id: 6, client_id: 5, matter_id: 9, description: 'Call with John Daven re: vendor performance Q1; prepared performance brief presentation; call with opposing counsel (Richards & Webb LLP)', start_time: today(13,30), end_time: today(14,18), duration_seconds: 2880, source: 'ai_suggested', status: 'draft', client: clientById(5) },
  { id: 7, client_id: 3, matter_id: 5, description: 'Reviewed final comments from James Harper; revised executive employment agreement v3 with tracked changes', start_time: today(14,18), end_time: today(15,18), duration_seconds: 3600, source: 'ai_suggested', status: 'confirmed', client: clientById(3) },
  { id: 8, client_id: 4, matter_id: 8, description: 'Reviewed regulatory compliance checklist and SEC enforcement updates; Zoom compliance review call; drafted follow-up meeting notes', start_time: today(15,30), end_time: today(16,48), duration_seconds: 4680, source: 'ai_suggested', status: 'confirmed', client: clientById(4) },
  { id: 9, client_id: 5, matter_id: 10, description: 'Drafted litigation memo re: discovery responses; call with court clerk for filing confirmation; email re: discovery deadline April 7', start_time: today(16,30), end_time: today(17,18), duration_seconds: 2880, source: 'ai_suggested', status: 'draft', client: clientById(5) },
]

// ── Mock API (returns instantly) ──────────────────────────────
function ok(data) {
  return Promise.resolve({ data })
}

export const api = {
  getActivities() {
    return ok({ activities: ACTIVITIES, total_activities: ACTIVITIES.length })
  },
  getClients() {
    return ok(CLIENTS)
  },
  createClient(data) {
    const c = { ...data, id: Date.now(), created_at: new Date().toISOString(), keywords: data.keywords || [] }
    CLIENTS.push(c)
    return ok(c)
  },
  updateClient(id, data) {
    const c = CLIENTS.find(c => c.id === id)
    if (c) Object.assign(c, data)
    return ok(c)
  },
  deleteClient(id) {
    const idx = CLIENTS.findIndex(c => c.id === id)
    if (idx >= 0) CLIENTS.splice(idx, 1)
    return ok({})
  },
  getTimeEntries() {
    return ok(TIME_ENTRIES)
  },
  createTimeEntry(data) {
    const e = { ...data, id: Date.now(), client: clientById(data.client_id) }
    TIME_ENTRIES.push(e)
    return ok(e)
  },
  updateTimeEntry(id, data) {
    const e = TIME_ENTRIES.find(e => e.id === id)
    if (e) Object.assign(e, data)
    return ok(e)
  },
  deleteTimeEntry(id) {
    const idx = TIME_ENTRIES.findIndex(e => e.id === id)
    if (idx >= 0) TIME_ENTRIES.splice(idx, 1)
    return ok({})
  },
  getDailySummary() { return ok({}) },
  runAiMatch() { return ok([]) },
  suggestEntries() { return ok({ suggestions: [] }) },
  syncAll() { return ok([]) },
  getTrackerStatus() { return ok({ running: true, uptime_seconds: 3600, activities_captured: ACTIVITIES.length }) },
  startTracker() { return ok({ running: true }) },
  stopTracker() { return ok({ running: false }) },
}
