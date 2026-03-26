// Static demo mode - all data is embedded, no server needed.

function today(hour, minute = 0) {
  const d = new Date()
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// ── Clients ───────────────────────────────────────────────────
const CLIENTS = [
  { id: 1, name: 'Morgan Ltd.', color: '#3B82F6', keywords: ['morgan'], created_at: new Date().toISOString() },
  { id: 2, name: 'Axion Ltd.', color: '#EF4444', keywords: ['axion'], created_at: new Date().toISOString() },
  { id: 3, name: 'Harper & Associates', color: '#10B981', keywords: ['harper'], created_at: new Date().toISOString() },
  { id: 4, name: 'AcmeCorp', color: '#F59E0B', keywords: ['acme'], created_at: new Date().toISOString() },
  { id: 5, name: 'Daven Ltd.', color: '#8B5CF6', keywords: ['daven'], created_at: new Date().toISOString() },
]

function cl(id) { return CLIENTS.find(c => c.id === id) || null }
function link(id, cid) { return [{ id, activity_id: id, client_id: cid, confidence: 0.95, matched_by: 'AI', client: cl(cid) }] }

// ── Activities (NO overlaps - strict sequential timeline) ─────
// Each activity occupies a unique time slot across ALL columns.
const ACTIVITIES = [
  // 8:30–8:45  CALL  Morgan
  { id: 1, app_name: 'Phone', window_title: 'Sarah Chen (Morgan Ltd. - General Counsel)', start_time: today(8,30), end_time: today(8,45), duration_seconds: 900, activity_type: 'call', metadata: {}, client_links: link(1,1) },
  // 8:45–9:00  CALENDAR  (internal)
  { id: 2, app_name: 'Calendar', window_title: 'Team Standup - Litigation Group', start_time: today(8,45), end_time: today(9,0), duration_seconds: 900, activity_type: 'calendar', metadata: {}, client_links: [] },
  // 9:00–9:45  COMPUTER  Morgan
  { id: 3, app_name: 'Microsoft Word', window_title: 'Morgan_Ltd_Service_Agreement_v4_REDLINE.docx', start_time: today(9,0), end_time: today(9,45), duration_seconds: 2700, activity_type: 'document', metadata: {}, client_links: link(3,1) },
  // 9:45–10:00  COMPUTER  Morgan
  { id: 4, app_name: 'Adobe Acrobat', window_title: 'Morgan_Ltd_Board_Resolution_2026.pdf', start_time: today(9,45), end_time: today(10,0), duration_seconds: 900, activity_type: 'document', metadata: {}, client_links: link(4,1) },
  // 10:00–10:15  EMAIL  Morgan
  { id: 5, app_name: 'Microsoft Outlook', window_title: 'Re: Morgan Ltd - Service Agreement Amendment (Sarah Chen)', start_time: today(10,0), end_time: today(10,15), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: link(5,1) },
  // 10:15–10:45  CALL  Harper
  { id: 6, app_name: 'FaceTime', window_title: 'James Harper - (917) 555-0142', start_time: today(10,15), end_time: today(10,45), duration_seconds: 1800, activity_type: 'call', metadata: {}, client_links: link(6,3) },
  // 10:45–11:00  EMAIL  Axion
  { id: 7, app_name: 'Microsoft Outlook', window_title: 'Re: Introduction - Axion Ltd. IP Matters', start_time: today(10,45), end_time: today(11,0), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: link(7,2) },
  // 11:00–11:30  CALENDAR  Morgan
  { id: 8, app_name: 'Calendar', window_title: 'Morgan Ltd. - Contract Negotiation Call', start_time: today(11,0), end_time: today(11,30), duration_seconds: 1800, activity_type: 'calendar', metadata: {}, client_links: link(8,1) },
  // 11:30–12:00  COMPUTER  AcmeCorp
  { id: 9, app_name: 'Microsoft Excel', window_title: 'AcmeCorp_Q1_Billing_Reconciliation.xlsx', start_time: today(11,30), end_time: today(12,0), duration_seconds: 1800, activity_type: 'document', metadata: {}, client_links: link(9,4) },
  // 12:00–12:45  COMPUTER  Axion
  { id: 10, app_name: 'Microsoft Word', window_title: 'Axion_IP_Claim_Response_FINAL.docx', start_time: today(12,0), end_time: today(12,45), duration_seconds: 2700, activity_type: 'document', metadata: {}, client_links: link(10,2) },
  // 12:45–1:00  EMAIL  Axion
  { id: 11, app_name: 'Microsoft Outlook', window_title: 'Axion Ltd. - Patent Filing Deadline Reminder (Mar 31)', start_time: today(12,45), end_time: today(13,0), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: link(11,2) },
  // 1:00–1:30  COMPUTER  Axion
  { id: 12, app_name: 'Google Chrome', window_title: 'Westlaw - Patent Infringement Case Law 2025-2026', start_time: today(13,0), end_time: today(13,30), duration_seconds: 1800, activity_type: 'browser', metadata: {}, client_links: link(12,2) },
  // 1:30–2:15  CALENDAR  (internal)
  { id: 13, app_name: 'Calendar', window_title: 'Lunch - Partner Review (Private)', start_time: today(13,30), end_time: today(14,15), duration_seconds: 2700, activity_type: 'calendar', metadata: {}, client_links: [] },
  // 2:15–2:30  CALL  Daven
  { id: 14, app_name: 'Phone', window_title: 'John Daven - (212) 555-0198', start_time: today(14,15), end_time: today(14,30), duration_seconds: 900, activity_type: 'call', metadata: {}, client_links: link(14,5) },
  // 2:30–2:45  CALL  Daven
  { id: 15, app_name: 'Phone', window_title: 'Opposing Counsel - Richards & Webb LLP', start_time: today(14,30), end_time: today(14,45), duration_seconds: 900, activity_type: 'call', metadata: {}, client_links: link(15,5) },
  // 2:45–3:15  COMPUTER  Daven
  { id: 16, app_name: 'Microsoft PowerPoint', window_title: 'Daven_Vendor_Performance_Brief_Q1.pptx', start_time: today(14,45), end_time: today(15,15), duration_seconds: 1800, activity_type: 'document', metadata: {}, client_links: link(16,5) },
  // 3:15–3:30  EMAIL  Harper
  { id: 17, app_name: 'Microsoft Outlook', window_title: 'Re: Harper Employment Agreement - Final Comments from James', start_time: today(15,15), end_time: today(15,30), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: link(17,3) },
  // 3:30–4:15  COMPUTER  Harper
  { id: 18, app_name: 'Microsoft Word', window_title: 'Harper_Exec_Employment_Agreement_v3_TRACKED.docx', start_time: today(15,30), end_time: today(16,15), duration_seconds: 2700, activity_type: 'document', metadata: {}, client_links: link(18,3) },
  // 4:15–4:30  EMAIL  AcmeCorp
  { id: 19, app_name: 'Microsoft Outlook', window_title: 'AcmeCorp - Q1 Invoice #2026-0341 Attached', start_time: today(16,15), end_time: today(16,30), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: link(19,4) },
  // 4:30–4:45  COMPUTER  AcmeCorp
  { id: 20, app_name: 'Adobe Acrobat', window_title: 'AcmeCorp_Regulatory_Compliance_Checklist.pdf', start_time: today(16,30), end_time: today(16,45), duration_seconds: 900, activity_type: 'document', metadata: {}, client_links: link(20,4) },
  // 4:45–5:00  COMPUTER  AcmeCorp
  { id: 21, app_name: 'Google Chrome', window_title: 'SEC.gov - Recent Enforcement Actions & Compliance Updates', start_time: today(16,45), end_time: today(17,0), duration_seconds: 900, activity_type: 'browser', metadata: {}, client_links: link(21,4) },
  // 5:00–5:30  CALL  AcmeCorp
  { id: 22, app_name: 'Zoom', window_title: 'AcmeCorp - Compliance Review Call', start_time: today(17,0), end_time: today(17,30), duration_seconds: 1800, activity_type: 'call', metadata: {}, client_links: link(22,4) },
  // 5:30–5:45  EMAIL  AcmeCorp
  { id: 23, app_name: 'Microsoft Outlook', window_title: 'Meeting Notes: AcmeCorp Compliance Audit Prep', start_time: today(17,30), end_time: today(17,45), duration_seconds: 900, activity_type: 'email', metadata: {}, client_links: link(23,4) },
  // 5:45–6:15  COMPUTER  Daven
  { id: 24, app_name: 'Microsoft Word', window_title: 'Daven_Litigation_Memo_re_Discovery_Responses.docx', start_time: today(17,45), end_time: today(18,15), duration_seconds: 1800, activity_type: 'document', metadata: {}, client_links: link(24,5) },
  // 6:15–6:25  CALL  Daven
  { id: 25, app_name: 'Phone', window_title: 'Court Clerk - NY Supreme Court (Filing Confirmation)', start_time: today(18,15), end_time: today(18,25), duration_seconds: 600, activity_type: 'call', metadata: {}, client_links: link(25,5) },
  // 6:25–6:35  EMAIL  Daven
  { id: 26, app_name: 'Microsoft Outlook', window_title: 'Daven Ltd. - Discovery Responses Due April 7', start_time: today(18,25), end_time: today(18,35), duration_seconds: 600, activity_type: 'email', metadata: {}, client_links: link(26,5) },
]

// ── AI Time Entries (non-overlapping blocks, accurately totaled) ──
// Morgan block 1:  call 15m + doc 45m + doc 15m + email 15m = 1h 30m
// Morgan block 2:  calendar call 30m
// Harper block 1:  FaceTime 30m
// Axion:           email 15m + doc 45m + email 15m + research 30m = 1h 48m (rounded)
// AcmeCorp block 1: Excel 30m
// Daven block 1:   call 15m + call 15m + PPT 30m = 1h
// Harper block 2:  email 15m + doc 45m = 1h
// AcmeCorp block 2: email 15m + PDF 15m + Chrome 15m + Zoom 30m + email 15m = 1h 30m
// Daven block 2:   doc 30m + call 10m + email 10m = 48m (rounded)
// TOTAL: 1h30 + 30 + 30 + 1h48 + 30 + 1h + 1h + 1h30 + 48 = 9h 6m
const TIME_ENTRIES = [
  { id: 1, client_id: 1, matter_id: 1, description: 'Call with GC Sarah Chen; redlined service agreement v4; reviewed board resolution; email correspondence re: amendment terms', start_time: today(8,30), end_time: today(10,0), duration_seconds: 5400, source: 'ai_suggested', status: 'confirmed', client: cl(1) },
  { id: 2, client_id: 3, matter_id: 5, description: 'FaceTime meeting with James Harper re: executive employment terms; discussed non-compete and severance provisions', start_time: today(10,15), end_time: today(10,45), duration_seconds: 1800, source: 'ai_suggested', status: 'confirmed', client: cl(3) },
  { id: 3, client_id: 2, matter_id: 3, description: 'Email correspondence re: IP matters; drafted patent infringement claim response; filing deadline review; Westlaw case law research', start_time: today(10,45), end_time: today(12,33), duration_seconds: 6480, source: 'ai_suggested', status: 'draft', client: cl(2) },
  { id: 4, client_id: 1, matter_id: 2, description: 'Contract negotiation conference call; discussed subsidiary merger timeline and regulatory approvals', start_time: today(11,0), end_time: today(11,30), duration_seconds: 1800, source: 'ai_suggested', status: 'confirmed', client: cl(1) },
  { id: 5, client_id: 4, matter_id: 7, description: 'Q1 billing reconciliation spreadsheet review and invoice preparation', start_time: today(11,30), end_time: today(12,0), duration_seconds: 1800, source: 'ai_suggested', status: 'confirmed', client: cl(4) },
  { id: 6, client_id: 5, matter_id: 9, description: 'Calls with John Daven and opposing counsel Richards & Webb re: vendor performance; prepared performance brief presentation', start_time: today(14,15), end_time: today(15,15), duration_seconds: 3600, source: 'ai_suggested', status: 'draft', client: cl(5) },
  { id: 7, client_id: 3, matter_id: 5, description: 'Reviewed final comments from James Harper; revised executive employment agreement v3 with tracked changes', start_time: today(15,15), end_time: today(16,15), duration_seconds: 3600, source: 'ai_suggested', status: 'confirmed', client: cl(3) },
  { id: 8, client_id: 4, matter_id: 8, description: 'Reviewed compliance checklist and SEC enforcement updates; Zoom compliance review call; invoice and meeting notes', start_time: today(16,15), end_time: today(17,45), duration_seconds: 5400, source: 'ai_suggested', status: 'confirmed', client: cl(4) },
  { id: 9, client_id: 5, matter_id: 10, description: 'Drafted litigation memo re: discovery responses; court clerk filing confirmation call; discovery deadline correspondence', start_time: today(17,45), end_time: today(18,33), duration_seconds: 2880, source: 'ai_suggested', status: 'draft', client: cl(5) },
]

// ── Mock API ──────────────────────────────────────────────────
function ok(data) { return Promise.resolve({ data }) }

export const api = {
  getActivities() { return ok({ activities: ACTIVITIES, total_activities: ACTIVITIES.length }) },
  getClients() { return ok(CLIENTS) },
  createClient(data) { const c = { ...data, id: Date.now(), created_at: new Date().toISOString(), keywords: data.keywords || [] }; CLIENTS.push(c); return ok(c) },
  updateClient(id, data) { const c = CLIENTS.find(c => c.id === id); if (c) Object.assign(c, data); return ok(c) },
  deleteClient(id) { const i = CLIENTS.findIndex(c => c.id === id); if (i >= 0) CLIENTS.splice(i, 1); return ok({}) },
  getTimeEntries() { return ok(TIME_ENTRIES) },
  createTimeEntry(data) { const e = { ...data, id: Date.now(), client: cl(data.client_id) }; TIME_ENTRIES.push(e); return ok(e) },
  updateTimeEntry(id, data) { const e = TIME_ENTRIES.find(e => e.id === id); if (e) Object.assign(e, data); return ok(e) },
  deleteTimeEntry(id) { const i = TIME_ENTRIES.findIndex(e => e.id === id); if (i >= 0) TIME_ENTRIES.splice(i, 1); return ok({}) },
  getDailySummary() { return ok({}) },
  runAiMatch() { return ok([]) },
  suggestEntries() { return ok({ suggestions: [] }) },
  syncAll() { return ok([]) },
  getTrackerStatus() { return ok({ running: true, uptime_seconds: 3600, activities_captured: ACTIVITIES.length }) },
  startTracker() { return ok({ running: true }) },
  stopTracker() { return ok({ running: false }) },
}
