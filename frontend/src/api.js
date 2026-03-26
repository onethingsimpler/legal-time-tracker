// Static demo mode - generates realistic data per day using date-seeded randomization.

function atTime(date, hour, minute = 0) {
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// Simple seeded random from a date string
function seededRand(dateStr) {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0
  return () => { h = (h * 16807 + 0) % 2147483647; return (h & 0x7fffffff) / 0x7fffffff }
}

function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)] }
function between(rand, min, max) { return min + Math.floor(rand() * (max - min + 1)) }

// ── Clients ───────────────────────────────────────────────────
const CLIENTS = [
  { id: 1, name: 'Morgan Ltd.', color: '#3B82F6', keywords: ['morgan'], created_at: new Date().toISOString() },
  { id: 2, name: 'Axion Ltd.', color: '#EF4444', keywords: ['axion'], created_at: new Date().toISOString() },
  { id: 3, name: 'Harper & Associates', color: '#10B981', keywords: ['harper'], created_at: new Date().toISOString() },
  { id: 4, name: 'AcmeCorp', color: '#F59E0B', keywords: ['acme'], created_at: new Date().toISOString() },
  { id: 5, name: 'Daven Ltd.', color: '#8B5CF6', keywords: ['daven'], created_at: new Date().toISOString() },
]

function cl(id) { return CLIENTS.find(c => c.id === id) || null }
function lnk(id, cid) { return [{ id, activity_id: id, client_id: cid, confidence: 0.95, matched_by: 'AI', client: cl(cid) }] }

// ── Activity templates (shuffled per day) ─────────────────────
const COMPUTER_TEMPLATES = [
  { app: 'Microsoft Word', title: 'Morgan_Ltd_Service_Agreement_v4_REDLINE.docx', dur: [38, 47, 52], cid: 1 },
  { app: 'Adobe Acrobat', title: 'Morgan_Ltd_Board_Resolution_2026.pdf', dur: [11, 14, 18], cid: 1 },
  { app: 'Microsoft Word', title: 'Morgan_Subsidiary_Merger_Analysis.docx', dur: [26, 33, 41], cid: 1 },
  { app: 'Microsoft Excel', title: 'AcmeCorp_Q1_Billing_Reconciliation.xlsx', dur: [22, 28, 34], cid: 4 },
  { app: 'Microsoft Word', title: 'Axion_IP_Claim_Response_FINAL.docx', dur: [37, 43, 51], cid: 2 },
  { app: 'Google Chrome', title: 'Westlaw - Patent Infringement Case Law 2025-2026', dur: [23, 31, 27], cid: 2 },
  { app: 'Microsoft PowerPoint', title: 'Daven_Vendor_Performance_Brief_Q1.pptx', dur: [24, 33, 29], cid: 5 },
  { app: 'Microsoft Word', title: 'Harper_Exec_Employment_Agreement_v3_TRACKED.docx', dur: [39, 47, 53], cid: 3 },
  { app: 'Adobe Acrobat', title: 'AcmeCorp_Regulatory_Compliance_Checklist.pdf', dur: [12, 17, 9], cid: 4 },
  { app: 'Google Chrome', title: 'SEC.gov - Recent Enforcement Actions & Compliance', dur: [11, 16, 13], cid: 4 },
  { app: 'Microsoft Word', title: 'Daven_Litigation_Memo_re_Discovery_Responses.docx', dur: [26, 34, 31], cid: 5 },
  { app: 'Microsoft Word', title: 'Harper_Real_Estate_Due_Diligence_Report.docx', dur: [28, 36, 22], cid: 3 },
  { app: 'Adobe Acrobat', title: 'Axion_Software_License_Agreement_Draft.pdf', dur: [17, 23, 14], cid: 2 },
  { app: 'Microsoft Excel', title: 'Morgan_Ltd_Fee_Estimate_2026.xlsx', dur: [18, 24, 21], cid: 1 },
  { app: 'Google Chrome', title: 'LexisNexis - Employment Law Precedents', dur: [19, 27, 22], cid: 3 },
]

const CALENDAR_TEMPLATES = [
  { title: 'Team Standup - Litigation Group', dur: [12, 17, 14], cid: 0 },
  { title: 'Morgan Ltd. - Contract Negotiation Call', dur: [28, 34, 31], cid: 1 },
  { title: 'Lunch - Partner Review (Private)', dur: [42, 51, 38], cid: 0 },
  { title: 'AcmeCorp - Compliance Review & Audit Prep', dur: [27, 33, 31], cid: 4 },
  { title: 'Harper & Associates - Employment Terms Follow-up', dur: [26, 32, 29], cid: 3 },
  { title: 'Internal - Pro Bono Case Review', dur: [18, 23, 21], cid: 0 },
  { title: 'Daven Ltd. - Litigation Strategy Meeting', dur: [27, 34, 31], cid: 5 },
  { title: 'Axion Ltd. - Patent Portfolio Review', dur: [28, 33, 26], cid: 2 },
]

const CALL_TEMPLATES = [
  { app: 'Phone', title: 'Sarah Chen (Morgan Ltd. - General Counsel)', dur: [11, 17, 14], cid: 1 },
  { app: 'FaceTime', title: 'James Harper - (917) 555-0142', dur: [23, 31, 27], cid: 3 },
  { app: 'Phone', title: 'John Daven - (212) 555-0198', dur: [12, 18, 16], cid: 5 },
  { app: 'Phone', title: 'Opposing Counsel - Richards & Webb LLP', dur: [9, 16, 13], cid: 5 },
  { app: 'Zoom', title: 'AcmeCorp - Compliance Review Call', dur: [26, 33, 29], cid: 4 },
  { app: 'Phone', title: 'Court Clerk - NY Supreme Court (Filing Confirmation)', dur: [7, 12, 9], cid: 5 },
  { app: 'Phone', title: 'Robert Kim (Axion Ltd. - VP Legal)', dur: [16, 22, 19], cid: 2 },
  { app: 'FaceTime', title: 'Morgan Ltd. - Board Secretary', dur: [11, 17, 13], cid: 1 },
]

const UNMATCHED_TEMPLATES = [
  { app: 'Phone', title: 'Unknown Number - (646) 555-0331', dur: [6, 11, 8], cid: 0, actType: 'call' },
  { app: 'Phone', title: 'Voicemail - (212) 555-0477', dur: [3, 5, 4], cid: 0, actType: 'call' },
  { app: 'Google Chrome', title: 'Google Maps - Restaurant Directions', dur: [4, 7, 5], cid: 0, actType: 'browser' },
  { app: 'Microsoft Outlook', title: 'CLE Webinar Registration Confirmation', dur: [3, 6, 4], cid: 0, actType: 'email' },
  { app: 'Microsoft Outlook', title: 'Office Supply Order - Staples Confirmation', dur: [2, 5, 3], cid: 0, actType: 'email' },
  { app: 'Google Chrome', title: 'LinkedIn - 3 New Connection Requests', dur: [5, 9, 7], cid: 0, actType: 'browser' },
  { app: 'Phone', title: 'Dr. Martinez Office - (917) 555-0289', dur: [4, 8, 6], cid: 0, actType: 'call' },
  { app: 'Microsoft Outlook', title: 'Bar Association - Annual Dues Reminder', dur: [3, 5, 4], cid: 0, actType: 'email' },
]

const EMAIL_TEMPLATES = [
  { title: 'Re: Morgan Ltd - Service Agreement Amendment (Sarah Chen)', dur: [8, 14, 11], cid: 1 },
  { title: 'Re: Introduction - Axion Ltd. IP Matters', dur: [9, 16, 12], cid: 2 },
  { title: 'Axion Ltd. - Patent Filing Deadline Reminder (Mar 31)', dur: [7, 13, 11], cid: 2 },
  { title: 'Re: Harper Employment Agreement - Final Comments from James', dur: [11, 17, 14], cid: 3 },
  { title: 'AcmeCorp - Q1 Invoice #2026-0341 Attached', dur: [8, 14, 11], cid: 4 },
  { title: 'Meeting Notes: AcmeCorp Compliance Audit Prep', dur: [12, 18, 16], cid: 4 },
  { title: 'Daven Ltd. - Discovery Responses Due April 7', dur: [7, 12, 9], cid: 5 },
  { title: 'FW: Board Resolution - Morgan Ltd. Restructuring', dur: [9, 14, 11], cid: 1 },
  { title: 'Re: Daven Vendor Performance - Action Items', dur: [8, 13, 11], cid: 5 },
  { title: 'Harper & Associates - Office Lease Review', dur: [10, 16, 13], cid: 3 },
]

const ENTRY_DESCRIPTIONS = {
  1: ['Call with GC Sarah Chen; redlined service agreement v4; reviewed board resolution', 'Contract negotiation; discussed subsidiary merger timeline and regulatory approvals', 'Reviewed fee estimate and engagement letter; email correspondence re: restructuring'],
  2: ['Email re: IP matters; drafted patent infringement claim response; Westlaw research', 'Reviewed software license agreement; patent portfolio assessment with VP Legal', 'Case law research on Westlaw; filing deadline preparation'],
  3: ['FaceTime meeting re: executive employment terms; non-compete provisions review', 'Reviewed final comments; revised employment agreement v3 with tracked changes', 'Employment law research on LexisNexis; due diligence report preparation'],
  4: ['Q1 billing reconciliation; invoice preparation', 'Reviewed compliance checklist and SEC updates; Zoom review call; meeting notes', 'Regulatory audit prep; compliance documentation review'],
  5: ['Calls with John Daven and opposing counsel; prepared performance brief', 'Drafted litigation memo; court filing confirmation; discovery correspondence', 'Litigation strategy discussion; vendor performance assessment'],
}

// ── Generate day data ─────────────────────────────────────────
function generateDayData(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const dow = date.getDay()

  // Weekends: empty
  if (dow === 0 || dow === 6) return { activities: [], entries: [] }

  const rand = seededRand(dateStr)
  const activities = []
  const entries = []
  let id = 1
  let cursor = 8 * 60 + 30 // start at 8:30 AM in minutes

  const numComputer = between(rand, 7, 10)
  const computers = []
  const used = new Set()
  while (computers.length < numComputer) {
    const t = pick(rand, COMPUTER_TEMPLATES)
    if (!used.has(t.title)) { computers.push({ ...t }); used.add(t.title) }
  }

  // Pick 2-4 calendar, 4-6 calls, 5-7 emails
  const numCal = between(rand, 2, 4)
  const numCall = between(rand, 4, 6)
  const numEmail = between(rand, 5, 7)

  const cals = []; const calUsed = new Set()
  while (cals.length < numCal) { const t = pick(rand, CALENDAR_TEMPLATES); if (!calUsed.has(t.title)) { cals.push({ ...t }); calUsed.add(t.title) } }

  const calls = []; const callUsed = new Set()
  while (calls.length < numCall) { const t = pick(rand, CALL_TEMPLATES); if (!callUsed.has(t.title)) { calls.push({ ...t }); callUsed.add(t.title) } }

  const emails = []; const emailUsed = new Set()
  while (emails.length < numEmail) { const t = pick(rand, EMAIL_TEMPLATES); if (!emailUsed.has(t.title)) { emails.push({ ...t }); emailUsed.add(t.title) } }

  // Pick 2-3 unmatched activities
  const numUnmatched = between(rand, 2, 3)
  const unmatched = []; const unmatchedUsed = new Set()
  while (unmatched.length < numUnmatched) { const t = pick(rand, UNMATCHED_TEMPLATES); if (!unmatchedUsed.has(t.title)) { unmatched.push({ ...t }); unmatchedUsed.add(t.title) } }

  // Resolve durations from arrays
  const resolve = (t) => ({ ...t, dur: Array.isArray(t.dur) ? pick(rand, t.dur) : t.dur })

  // Interleave all activities sequentially
  const allItems = [
    ...computers.map(t => ({ ...resolve(t), type: 'document', actType: t.app.includes('Chrome') ? 'browser' : 'document' })),
    ...cals.map(t => ({ ...resolve(t), type: 'calendar', actType: 'calendar', app: 'Calendar' })),
    ...calls.map(t => ({ ...resolve(t), type: 'call', actType: 'call' })),
    ...emails.map(t => ({ ...resolve(t), type: 'email', actType: 'email', app: 'Microsoft Outlook' })),
    ...unmatched.map(t => ({ ...resolve(t), type: t.actType })),
  ]

  // Shuffle
  for (let i = allItems.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [allItems[i], allItems[j]] = [allItems[j], allItems[i]]
  }

  // Place sequentially
  const clientMinutes = {}
  for (const item of allItems) {
    if (cursor >= 19 * 60) break // stop at 7 PM
    // Small gap between activities
    if (rand() > 0.5) cursor += between(rand, 3, 10)

    const startH = Math.floor(cursor / 60)
    const startM = cursor % 60
    const endCursor = cursor + item.dur
    const endH = Math.floor(endCursor / 60)
    const endM = endCursor % 60

    const act = {
      id,
      app_name: item.app,
      window_title: item.title,
      start_time: atTime(date, startH, startM),
      end_time: atTime(date, endH, endM),
      duration_seconds: item.dur * 60,
      activity_type: item.actType,
      metadata: {},
      client_links: item.cid ? lnk(id, item.cid) : [],
    }
    activities.push(act)

    if (item.cid) {
      clientMinutes[item.cid] = (clientMinutes[item.cid] || 0) + item.dur
    }

    cursor = endCursor
    id++
  }

  // Generate AI time entries per client
  let entryId = 1
  const clientActivities = {}
  for (const act of activities) {
    if (act.client_links.length > 0) {
      const cid = act.client_links[0].client_id
      if (!clientActivities[cid]) clientActivities[cid] = []
      clientActivities[cid].push(act)
    }
  }

  for (const [cidStr, acts] of Object.entries(clientActivities)) {
    const cid = Number(cidStr)
    const totalMin = acts.reduce((s, a) => s + a.duration_seconds / 60, 0)
    const roundedSec = Math.round(totalMin / 6) * 6 * 60 // 6-min billing increments
    const first = acts[0]
    const last = acts[acts.length - 1]
    const descs = ENTRY_DESCRIPTIONS[cid] || ['Legal work and correspondence']
    const desc = pick(rand, descs)
    const isDraft = rand() > 0.6

    entries.push({
      id: entryId++,
      client_id: cid,
      matter_id: cid,
      description: desc,
      start_time: first.start_time,
      end_time: last.end_time,
      duration_seconds: roundedSec,
      source: 'ai_suggested',
      status: isDraft ? 'draft' : 'confirmed',
      client: cl(cid),
    })
  }

  return { activities, entries }
}

// ── Cache generated days ──────────────────────────────────────
const dayCache = {}
function getDay(dateStr) {
  if (!dayCache[dateStr]) dayCache[dateStr] = generateDayData(dateStr)
  return dayCache[dateStr]
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ── Mock API ──────────────────────────────────────────────────
function ok(data) { return Promise.resolve({ data }) }

export const api = {
  getActivities(dateStr) {
    if (!dateStr) dateStr = formatDate(new Date())
    const day = getDay(dateStr)
    return ok({ activities: day.activities, total_activities: day.activities.length })
  },
  getClients() { return ok(CLIENTS) },
  createClient(data) { const c = { ...data, id: Date.now(), created_at: new Date().toISOString(), keywords: data.keywords || [] }; CLIENTS.push(c); return ok(c) },
  updateClient(id, data) { const c = CLIENTS.find(c => c.id === id); if (c) Object.assign(c, data); return ok(c) },
  deleteClient(id) { const i = CLIENTS.findIndex(c => c.id === id); if (i >= 0) CLIENTS.splice(i, 1); return ok({}) },
  getTimeEntries(dateStr) {
    if (!dateStr) dateStr = formatDate(new Date())
    return ok(getDay(dateStr).entries)
  },
  createTimeEntry(data) { return ok({ ...data, id: Date.now(), client: cl(data.client_id) }) },
  updateTimeEntry(id, data) { return ok(data) },
  deleteTimeEntry(id) { return ok({}) },
  getDailySummary() { return ok({}) },
  runAiMatch() { return ok([]) },
  suggestEntries() { return ok({ suggestions: [] }) },
  syncAll() { return ok([]) },
  getTrackerStatus() { return ok({ running: true, uptime_seconds: 3600, activities_captured: 26 }) },
  startTracker() { return ok({ running: true }) },
  stopTracker() { return ok({ running: false }) },
}
