// Demo data: 3 hand-crafted realistic lawyer workdays + random fallback for other dates.

function atTime(date, hour, minute = 0) {
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// ── Clients ───────────────────────────────────────────────────
const CLIENTS = [
  { id: 1, name: 'Morgan Ltd.', description: 'Corporate client. Key contact: Sarah Chen (General Counsel). Matters include service agreements, board resolutions, subsidiary merger, and restructuring.', matters: [
    { id: 'm1-1', name: 'Service Agreement', number: 'MRG-001', status: 'active' },
    { id: 'm1-2', name: 'Board Resolutions', number: 'MRG-002', status: 'active' },
    { id: 'm1-3', name: 'Subsidiary Merger', number: 'MRG-003', status: 'active' },
    { id: 'm1-4', name: 'Restructuring', number: 'MRG-004', status: 'active' },
  ], created_at: new Date().toISOString() },
  { id: 2, name: 'Axion Ltd.', description: 'IP and technology client. Key contact: Robert Kim (VP Legal). Matters include patent infringement claims, software licensing, and patent portfolio management.', matters: [
    { id: 'm2-1', name: 'Patent Infringement', number: 'AXN-001', status: 'active' },
    { id: 'm2-2', name: 'Software Licensing', number: 'AXN-002', status: 'active' },
    { id: 'm2-3', name: 'Patent Portfolio', number: 'AXN-003', status: 'active' },
  ], created_at: new Date().toISOString() },
  { id: 3, name: 'Harper & Associates', description: 'Employment law client. Key contact: James Harper. Matters include executive employment agreements, non-compete provisions, real estate due diligence, and office leases.', matters: [
    { id: 'm3-1', name: 'Employment Agreements', number: 'HRP-001', status: 'active' },
    { id: 'm3-2', name: 'Non-Compete Provisions', number: 'HRP-002', status: 'active' },
    { id: 'm3-3', name: 'Real Estate Due Diligence', number: 'HRP-003', status: 'active' },
    { id: 'm3-4', name: 'Office Leases', number: 'HRP-004', status: 'closed' },
  ], created_at: new Date().toISOString() },
  { id: 4, name: 'AcmeCorp', description: 'Regulatory compliance client. Matters include SEC compliance, quarterly billing, audit preparation, and regulatory checklists.', matters: [
    { id: 'm4-1', name: 'SEC Compliance', number: 'ACM-001', status: 'active' },
    { id: 'm4-2', name: 'Quarterly Billing', number: 'ACM-002', status: 'active' },
    { id: 'm4-3', name: 'Audit Preparation', number: 'ACM-003', status: 'active' },
  ], created_at: new Date().toISOString() },
  { id: 5, name: 'Daven Ltd.', description: 'Litigation client. Key contact: John Daven. Matters include vendor performance disputes, discovery responses, and litigation strategy. Opposing counsel: Richards & Webb LLP.', matters: [
    { id: 'm5-1', name: 'Vendor Disputes', number: 'DVN-001', status: 'active' },
    { id: 'm5-2', name: 'Discovery Responses', number: 'DVN-002', status: 'active' },
    { id: 'm5-3', name: 'Litigation Strategy', number: 'DVN-003', status: 'active' },
  ], created_at: new Date().toISOString() },
]

function cl(id) { return CLIENTS.find(c => c.id === id) || null }
function lnk(actId, cid) { return [{ id: actId, activity_id: actId, client_id: cid, confidence: 0.95, matched_by: 'AI', client: cl(cid) }] }

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function daysAgoDate(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return formatDate(d)
}

// ── Build activity/entry helpers ─────────────────────────────
let _id = 1
function act(date, type, app, title, startH, startM, endH, endM, cid) {
  const id = _id++
  return {
    id, app_name: app, window_title: title,
    start_time: atTime(date, startH, startM),
    end_time: atTime(date, endH, endM),
    duration_seconds: ((endH * 60 + endM) - (startH * 60 + startM)) * 60,
    activity_type: type, metadata: {},
    client_links: cid ? lnk(id, cid) : [],
  }
}

function buildEntries(activities) {
  const byClient = {}
  for (const a of activities) {
    if (a.client_links.length > 0) {
      const cid = a.client_links[0].client_id
      if (!byClient[cid]) byClient[cid] = []
      byClient[cid].push(a)
    }
  }
  const entries = []
  let eid = 1
  for (const [cidStr, acts] of Object.entries(byClient)) {
    const cid = Number(cidStr)
    const totalSec = acts.reduce((s, a) => s + a.duration_seconds, 0)
    const rounded = Math.round(totalSec / 360) * 360
    entries.push({
      id: eid++, client_id: cid,
      description: acts.map(a => a.window_title).join('; '),
      start_time: acts[0].start_time,
      end_time: acts[acts.length - 1].end_time,
      duration_seconds: rounded,
      source: 'ai_suggested', status: 'confirmed',
      client: cl(cid),
    })
  }
  return entries.sort((a, b) => b.duration_seconds - a.duration_seconds)
}

// ══════════════════════════════════════════════════════════════
// DAY 2 (2 days ago): Heavy litigation + new IP matter
// ══════════════════════════════════════════════════════════════
function buildDay2() {
  const d = new Date(daysAgoDate(2) + 'T00:00:00')
  _id = 1
  const a = [
    // ── COMPUTER (6 items, no overlap) ──
    act(d, 'document', 'Microsoft Word', 'Daven_Discovery_Response_Set_2_DRAFT.docx',     7, 45,  8, 40, 5),
    act(d, 'browser',  'Google Chrome',  'Westlaw - Patent Infringement Case Law 2025-2026', 9, 40, 10, 10, 2),
    act(d, 'document', 'Microsoft Word', 'Morgan_Subsidiary_Merger_Analysis_v1.docx',     11,  0, 11, 50, 1),
    act(d, 'document', 'Microsoft Word', 'Harper_Exec_Employment_Agreement_v2.docx',      13, 15, 14,  0, 3),
    act(d, 'document', 'Microsoft Excel', 'Daven_Discovery_Document_Index.xlsx',           15, 15, 15, 50, 5),
    act(d, 'browser',  'Google Chrome',  'Google Maps - Dinner Reservation Directions',   16, 30, 16, 37, 0),

    // ── CALENDAR (3 items, no overlap) ──
    act(d, 'calendar', 'Calendar', 'Team Standup - Litigation Group',                      8, 45,  9,  0, 0),
    act(d, 'calendar', 'Calendar', 'Daven Ltd. - Discovery Strategy Meeting',             10, 30, 11,  0, 5),
    act(d, 'calendar', 'Calendar', 'Internal - Pro Bono Case Review',                     14,  0, 14, 25, 0),

    // ── CALLS (4 items, no overlap) ──
    act(d, 'call', 'Phone',    'Court Clerk - NY Supreme Court (Filing Status)',            9, 15,  9, 27, 5),
    act(d, 'call', 'Phone',    'Robert Kim (Axion Ltd. - VP Legal)',                      10, 30, 10, 52, 2),
    act(d, 'call', 'FaceTime', 'James Harper - (917) 555-0142',                          14, 30, 14, 55, 3),
    act(d, 'call', 'Phone',    'Opposing Counsel - Richards & Webb LLP',                  16,  0, 16, 18, 5),

    // ── EMAILS (6 items, no overlap) ──
    act(d, 'email', 'Microsoft Outlook', 'Re: Daven Ltd - Discovery Timeline Update',                7, 50,  8,  4, 5),
    act(d, 'email', 'Microsoft Outlook', 'Axion Ltd. - Patent Filing Deadline Reminder (Mar 31)',     8, 10,  8, 22, 2),
    act(d, 'email', 'Microsoft Outlook', 'Re: Morgan Merger Brief - Sarah Chen Comments',           10,  0, 10, 14, 1),
    act(d, 'email', 'Microsoft Outlook', 'Harper - Initial Employment Terms for Review',            12, 30, 12, 44, 3),
    act(d, 'email', 'Microsoft Outlook', 'CLE Webinar Registration Confirmation',                   15,  0, 15,  6, 0),
    act(d, 'email', 'Microsoft Outlook', 'Daven Ltd. - Discovery Responses Due April 7',            16, 40, 16, 52, 5),
  ]

  // Override entry descriptions for realism
  const activities = a
  const entries = buildEntries(activities)
  const descMap = {
    5: 'Drafted discovery response set 2; court clerk call re: filing status; discovery index update; call with opposing counsel (Richards & Webb)',
    2: 'Patent infringement case law research on Westlaw; call with VP Legal Robert Kim re: filing deadline',
    1: 'Drafted subsidiary merger analysis v1; reviewed Sarah Chen comments on merger brief',
    3: 'Initial review of executive employment agreement v2; FaceTime with James Harper re: terms',
  }
  for (const e of entries) { if (descMap[e.client_id]) e.description = descMap[e.client_id] }
  return { activities, entries }
}

// ══════════════════════════════════════════════════════════════
// DAY 1 (yesterday): Contract negotiations + compliance
// ══════════════════════════════════════════════════════════════
function buildDay1() {
  const d = new Date(daysAgoDate(1) + 'T00:00:00')
  _id = 1
  const a = [
    // ── COMPUTER (7 items, no overlap) ──
    act(d, 'document', 'Microsoft Word',  'Morgan_Ltd_Service_Agreement_v4_REDLINE.docx',   8,  0,  8, 50, 1),
    act(d, 'document', 'Microsoft Word',  'Axion_IP_Claim_Response_DRAFT.docx',             9, 45, 10, 30, 2),
    act(d, 'document', 'Microsoft Word',  'Harper_NonCompete_Analysis_Memo.docx',          11, 30, 12, 10, 3),
    act(d, 'document', 'Adobe Acrobat',   'AcmeCorp_Regulatory_Compliance_Checklist.pdf',  13, 15, 13, 50, 4),
    act(d, 'browser',  'Google Chrome',   'SEC.gov - Recent Enforcement Actions & Compliance Updates', 14,  5, 14, 20, 4),
    act(d, 'document', 'Microsoft Word',  'Daven_Litigation_Memo_re_Discovery.docx',      15,  0, 15, 50, 5),
    act(d, 'browser',  'Google Chrome',   'LinkedIn - 3 New Connection Requests',          16, 45, 16, 53, 0),

    // ── CALENDAR (3 items, no overlap) ──
    act(d, 'calendar', 'Calendar', 'Team Standup - Litigation Group',                       8, 45,  9,  0, 0),
    act(d, 'calendar', 'Calendar', 'Morgan Ltd. - Contract Negotiation Call',              11,  0, 11, 34, 1),
    act(d, 'calendar', 'Calendar', 'AcmeCorp - Compliance Review & Audit Prep',           15,  0, 15, 33, 4),

    // ── CALLS (4 items, no overlap) ──
    act(d, 'call', 'Phone',    'Sarah Chen (Morgan Ltd. - General Counsel)',                9, 25,  9, 42, 1),
    act(d, 'call', 'Phone',    'John Daven - (212) 555-0198',                             12, 30, 12, 48, 5),
    act(d, 'call', 'Zoom',     'AcmeCorp - Compliance Review Call',                       15,  0, 15, 33, 4),
    act(d, 'call', 'Phone',    'Voicemail - Dr. Martinez Office (917) 555-0289',          16, 20, 16, 25, 0),

    // ── EMAILS (7 items, no overlap) ──
    act(d, 'email', 'Microsoft Outlook', 'Re: Morgan Ltd - Service Agreement Amendment (Sarah Chen)',  7, 48,  8,  2, 1),
    act(d, 'email', 'Microsoft Outlook', 'FW: Board Resolution - Morgan Ltd. Restructuring',          8, 10,  8, 24, 1),
    act(d, 'email', 'Microsoft Outlook', 'Re: Axion IP Claim - Robert Kim Initial Comments',          9, 50, 10,  4, 2),
    act(d, 'email', 'Microsoft Outlook', 'Harper - Non-Compete Provisions Questions from James',     11, 40, 11, 54, 3),
    act(d, 'email', 'Microsoft Outlook', 'Re: AcmeCorp Compliance - Updated Checklist Attached',     14, 30, 14, 44, 4),
    act(d, 'email', 'Microsoft Outlook', 'Meeting Notes: AcmeCorp Compliance Audit Prep',            15, 40, 15, 56, 4),
    act(d, 'email', 'Microsoft Outlook', 'Daven Ltd. - Litigation Memo Draft for Review',            16, 20, 16, 34, 5),
  ]

  const activities = a
  const entries = buildEntries(activities)
  const descMap = {
    1: 'Redlined service agreement v4; call with GC Sarah Chen; contract negotiation meeting; board resolution correspondence',
    2: 'Drafted IP claim response; reviewed Robert Kim initial comments on patent filing',
    3: 'Non-compete analysis memo; email correspondence with James Harper re: provisions',
    4: 'Compliance checklist review; SEC enforcement research; Zoom audit prep call; meeting notes',
    5: 'Drafted litigation memo re: discovery; call with John Daven on timeline; memo sent for review',
  }
  for (const e of entries) { if (descMap[e.client_id]) e.description = descMap[e.client_id] }
  return { activities, entries }
}

// ══════════════════════════════════════════════════════════════
// DAY 0 (today): Friday wrap-up + new assignment
// ══════════════════════════════════════════════════════════════
function buildDay0() {
  const d = new Date(daysAgoDate(0) + 'T00:00:00')
  _id = 1
  const a = [
    // ── COMPUTER (5 items, no overlap) ──
    act(d, 'document', 'Microsoft Word',       'Morgan_Engagement_Letter_2026_FINAL.docx',         8, 15,  9,  0, 1),
    act(d, 'document', 'Adobe Acrobat',        'Axion_Software_License_Agreement_v2_COMMENTS.pdf', 10,  0, 10, 35, 2),
    act(d, 'document', 'Microsoft Word',       'Harper_Exec_Employment_Agreement_v3_TRACKED.docx', 11,  0, 11, 50, 3),
    act(d, 'document', 'Microsoft PowerPoint', 'AcmeCorp_Board_Compliance_Presentation.pptx',      13, 30, 14, 15, 4),
    act(d, 'document', 'Microsoft Word',       'Daven_Deposition_Prep_Memo.docx',                 15,  0, 15, 40, 5),

    // ── CALENDAR (3 items, no overlap) ──
    act(d, 'calendar', 'Calendar', 'Team Standup - Litigation Group',                       8, 45,  9,  0, 0),
    act(d, 'calendar', 'Calendar', 'Lunch - Partner Review (Private)',                     12, 15, 13, 15, 0),
    act(d, 'calendar', 'Calendar', 'Axion Ltd. - Patent Portfolio Review',                 14, 30, 15,  0, 2),

    // ── CALLS (3 items, no overlap) ──
    act(d, 'call', 'FaceTime', 'James Harper - (917) 555-0142',                           10, 45, 11, 12, 3),
    act(d, 'call', 'Phone',    'Sarah Chen (Morgan Ltd. - General Counsel)',               13, 20, 13, 38, 1),
    act(d, 'call', 'Phone',    'John Daven - (212) 555-0198',                             15, 50, 16,  8, 5),

    // ── EMAILS (6 items, no overlap) ──
    act(d, 'email', 'Microsoft Outlook', 'Morgan Ltd. - Engagement Letter Billing Rates',              8,  0,  8, 14, 1),
    act(d, 'email', 'Microsoft Outlook', 'Re: Axion Licensing - Final Comments from Robert Kim',       9, 35,  9, 50, 2),
    act(d, 'email', 'Microsoft Outlook', 'Re: Harper Employment Agreement - Final Comments from James', 10, 50, 11,  6, 3),
    act(d, 'email', 'Microsoft Outlook', 'AcmeCorp - Board Presentation Draft Attached',              14, 35, 14, 50, 4),
    act(d, 'email', 'Microsoft Outlook', 'Bar Association - Annual Dues Reminder',                    15, 55, 16,  0, 0),
    act(d, 'email', 'Microsoft Outlook', 'Re: Daven Deposition Prep - Action Items for Monday',       16, 10, 16, 26, 5),
  ]

  const activities = a
  const entries = buildEntries(activities)
  const descMap = {
    1: 'Finalized engagement letter 2026; call with GC Sarah Chen re: billing rates; email follow-up',
    2: 'Reviewed Robert Kim comments on licensing agreement v2; patent portfolio review meeting',
    3: 'Final tracked changes on employment agreement v3; FaceTime with James Harper re: non-compete revisions',
    4: 'Board compliance presentation prep; draft sent to client for review',
    5: 'Deposition prep memo; call with John Daven re: witness list; action items for Monday',
  }
  for (const e of entries) { if (descMap[e.client_id]) e.description = descMap[e.client_id] }
  return { activities, entries }
}

// ══════════════════════════════════════════════════════════════
// Random fallback for other dates (simplified)
// ══════════════════════════════════════════════════════════════
function seededRand(dateStr) {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0
  return () => { h = (h * 16807 + 0) % 2147483647; return (h & 0x7fffffff) / 0x7fffffff }
}
function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)] }
function between(rand, min, max) { return min + Math.floor(rand() * (max - min + 1)) }

const COMP_T = [
  { app: 'Microsoft Word', title: 'Morgan_Ltd_Service_Agreement_v4_REDLINE.docx', dur: [38, 47], cid: 1 },
  { app: 'Microsoft Word', title: 'Morgan_Subsidiary_Merger_Analysis.docx', dur: [33, 41], cid: 1 },
  { app: 'Microsoft Excel', title: 'Morgan_Ltd_Fee_Estimate_2026.xlsx', dur: [18, 24], cid: 1 },
  { app: 'Microsoft Word', title: 'Axion_IP_Claim_Response_FINAL.docx', dur: [37, 48], cid: 2 },
  { app: 'Google Chrome', title: 'Westlaw - Patent Infringement Case Law 2025-2026', dur: [23, 31], cid: 2 },
  { app: 'Adobe Acrobat', title: 'Axion_Software_License_Agreement_Draft.pdf', dur: [17, 23], cid: 2 },
  { app: 'Microsoft Word', title: 'Harper_Exec_Employment_Agreement_v3_TRACKED.docx', dur: [39, 52], cid: 3 },
  { app: 'Microsoft Word', title: 'Harper_Real_Estate_Due_Diligence_Report.docx', dur: [28, 36], cid: 3 },
  { app: 'Google Chrome', title: 'LexisNexis - Employment Law Precedents', dur: [19, 27], cid: 3 },
  { app: 'Adobe Acrobat', title: 'AcmeCorp_Regulatory_Compliance_Checklist.pdf', dur: [12, 17], cid: 4 },
  { app: 'Google Chrome', title: 'SEC.gov - Recent Enforcement Actions & Compliance', dur: [11, 16], cid: 4 },
  { app: 'Microsoft Word', title: 'Daven_Litigation_Memo_re_Discovery_Responses.docx', dur: [26, 34], cid: 5 },
  { app: 'Microsoft Excel', title: 'Daven_Discovery_Document_Index.xlsx', dur: [20, 28], cid: 5 },
]
const CAL_T = [
  { title: 'Team Standup - Litigation Group', dur: [12, 15], cid: 0, slot: 'early' },
  { title: 'Morgan Ltd. - Contract Negotiation Call', dur: [28, 34], cid: 1, slot: 'mid' },
  { title: 'AcmeCorp - Compliance Review & Audit Prep', dur: [27, 33], cid: 4, slot: 'mid' },
  { title: 'Harper & Associates - Employment Terms Follow-up', dur: [26, 32], cid: 3, slot: 'late' },
  { title: 'Internal - Pro Bono Case Review', dur: [18, 23], cid: 0, slot: 'early' },
  { title: 'Daven Ltd. - Litigation Strategy Meeting', dur: [27, 34], cid: 5, slot: 'mid' },
  { title: 'Axion Ltd. - Patent Portfolio Review', dur: [28, 33], cid: 2, slot: 'late' },
]
const CALL_T = [
  { app: 'Phone', title: 'Sarah Chen (Morgan Ltd. - General Counsel)', dur: [11, 17], cid: 1 },
  { app: 'FaceTime', title: 'James Harper - (917) 555-0142', dur: [23, 31], cid: 3 },
  { app: 'Phone', title: 'John Daven - (212) 555-0198', dur: [12, 18], cid: 5 },
  { app: 'Zoom', title: 'AcmeCorp - Compliance Review Call', dur: [26, 33], cid: 4 },
  { app: 'Phone', title: 'Robert Kim (Axion Ltd. - VP Legal)', dur: [16, 22], cid: 2 },
]
const EMAIL_T = [
  { title: 'Re: Morgan Ltd - Service Agreement Amendment', dur: [8, 14], cid: 1 },
  { title: 'Axion Ltd. - Patent Filing Deadline Reminder', dur: [7, 12], cid: 2 },
  { title: 'Re: Harper Employment Agreement - Comments from James', dur: [11, 17], cid: 3 },
  { title: 'AcmeCorp - Q1 Invoice Attached', dur: [8, 14], cid: 4 },
  { title: 'Daven Ltd. - Discovery Responses Due April 7', dur: [7, 12], cid: 5 },
  { title: 'FW: Board Resolution - Morgan Ltd. Restructuring', dur: [9, 14], cid: 1 },
  { title: 'Meeting Notes: AcmeCorp Compliance Audit Prep', dur: [12, 18], cid: 4 },
]
const DESC_T = {
  1: ['Call with GC Sarah Chen; redlined service agreement v4; reviewed board resolution', 'Contract negotiation; discussed subsidiary merger timeline and regulatory approvals', 'Reviewed fee estimate and engagement letter; email correspondence re: restructuring'],
  2: ['Email re: IP matters; drafted patent infringement claim response; Westlaw research', 'Reviewed software license agreement; patent portfolio assessment with VP Legal', 'Case law research on Westlaw; filing deadline preparation'],
  3: ['FaceTime meeting re: executive employment terms; non-compete provisions review', 'Reviewed final comments; revised employment agreement v3 with tracked changes', 'Employment law research on LexisNexis; due diligence report preparation'],
  4: ['Q1 billing reconciliation; invoice preparation', 'Reviewed compliance checklist and SEC updates; Zoom review call; meeting notes', 'Regulatory audit prep; compliance documentation review'],
  5: ['Calls with John Daven and opposing counsel; prepared performance brief', 'Drafted litigation memo; court filing confirmation; discovery correspondence', 'Litigation strategy discussion; vendor performance assessment'],
}

function generateRandomDay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const dow = date.getDay()
  if (dow === 0 || dow === 6) {
    // Weekend: very light
    const rand = seededRand(dateStr)
    _id = 1
    const activities = []
    let cursor = 9 * 60
    const shuffled = [...COMP_T].sort(() => rand() - 0.5)
    for (let i = 0; i < between(rand, 2, 3); i++) {
      const t = shuffled[i]
      const dur = between(rand, t.dur[0], t.dur[1])
      const h = Math.floor(cursor / 60), m = cursor % 60
      const eh = Math.floor((cursor + dur) / 60), em = (cursor + dur) % 60
      activities.push(act(date, t.app.includes('Chrome') ? 'browser' : 'document', t.app, t.title, h, m, eh, em, t.cid))
      cursor += dur + between(rand, 30, 60)
    }
    const entries = buildEntries(activities)
    for (const e of entries) { const d = DESC_T[e.client_id]; if (d) e.description = pick(rand, d) }
    return { activities, entries }
  }

  const rand = seededRand(dateStr)
  _id = 1
  const activities = []

  // Computer: 5-6 items
  let cursor = 8 * 60 + between(rand, 0, 30)
  const compShuffled = [...COMP_T].sort(() => rand() - 0.5)
  const numComp = between(rand, 5, 6)
  for (let i = 0; i < numComp && i < compShuffled.length; i++) {
    const t = compShuffled[i]
    const dur = between(rand, t.dur[0], t.dur[1])
    if (cursor + dur > 17 * 60 + 30) break
    const h = Math.floor(cursor / 60), m = cursor % 60
    const eh = Math.floor((cursor + dur) / 60), em = (cursor + dur) % 60
    activities.push(act(date, t.app.includes('Chrome') ? 'browser' : 'document', t.app, t.title, h, m, eh, em, t.cid))
    cursor += dur + between(rand, 20, 40)
  }

  // Calendar: 2-3 items in slots
  const slotStarts = { early: [8, 45], mid: [10, 30], late: [14, 30] }
  const calShuffled = [...CAL_T].sort(() => rand() - 0.5)
  const usedSlots = new Set()
  const numCal = between(rand, 2, 3)
  let calCount = 0
  for (const t of calShuffled) {
    if (calCount >= numCal) break
    if (usedSlots.has(t.slot)) continue
    usedSlots.add(t.slot)
    const dur = between(rand, t.dur[0], t.dur[1])
    const [sh, sm] = slotStarts[t.slot]
    const start = sh * 60 + sm + between(rand, 0, 15)
    const h = Math.floor(start / 60), m = start % 60
    const eh = Math.floor((start + dur) / 60), em = (start + dur) % 60
    activities.push(act(date, 'calendar', 'Calendar', t.title, h, m, eh, em, t.cid))
    calCount++
  }

  // Calls: 3-4 items
  cursor = 9 * 60 + between(rand, 15, 45)
  const callShuffled = [...CALL_T].sort(() => rand() - 0.5)
  const numCall = between(rand, 3, 4)
  for (let i = 0; i < numCall && i < callShuffled.length; i++) {
    const t = callShuffled[i]
    const dur = between(rand, t.dur[0], t.dur[1])
    if (cursor + dur > 17 * 60) break
    const h = Math.floor(cursor / 60), m = cursor % 60
    const eh = Math.floor((cursor + dur) / 60), em = (cursor + dur) % 60
    activities.push(act(date, 'call', t.app, t.title, h, m, eh, em, t.cid))
    cursor += dur + between(rand, 35, 70)
  }

  // Emails: 5-6 items
  cursor = 8 * 60 + between(rand, 0, 15)
  const emailShuffled = [...EMAIL_T].sort(() => rand() - 0.5)
  const numEmail = between(rand, 5, 6)
  for (let i = 0; i < numEmail && i < emailShuffled.length; i++) {
    const t = emailShuffled[i]
    const dur = between(rand, t.dur[0], t.dur[1])
    if (cursor + dur > 17 * 60 + 30) break
    const h = Math.floor(cursor / 60), m = cursor % 60
    const eh = Math.floor((cursor + dur) / 60), em = (cursor + dur) % 60
    activities.push(act(date, 'email', 'Microsoft Outlook', t.title, h, m, eh, em, t.cid))
    cursor += dur + between(rand, 20, 50)
  }

  const entries = buildEntries(activities)
  for (const e of entries) { const d = DESC_T[e.client_id]; if (d) e.description = pick(rand, d) }
  return { activities, entries }
}

// ── Resolve day data ─────────────────────────────────────────
const craftedDays = {}
function getCraftedDays() {
  // Rebuild each time since "today" changes
  const d0 = daysAgoDate(0)
  const d1 = daysAgoDate(1)
  const d2 = daysAgoDate(2)
  if (!craftedDays[d0]) craftedDays[d0] = buildDay0()
  if (!craftedDays[d1]) craftedDays[d1] = buildDay1()
  if (!craftedDays[d2]) craftedDays[d2] = buildDay2()
  return { [d0]: craftedDays[d0], [d1]: craftedDays[d1], [d2]: craftedDays[d2] }
}

const randomCache = {}
function getDay(dateStr) {
  const crafted = getCraftedDays()
  if (crafted[dateStr]) return crafted[dateStr]
  if (!randomCache[dateStr]) randomCache[dateStr] = generateRandomDay(dateStr)
  return randomCache[dateStr]
}

// ── Mock API ─────────────────────────────────────────────────
function ok(data) { return Promise.resolve({ data }) }

export const api = {
  getActivities(dateStr) {
    if (!dateStr) dateStr = formatDate(new Date())
    const day = getDay(dateStr)
    return ok({ activities: day.activities, total_activities: day.activities.length })
  },
  getClients() { return ok(CLIENTS) },
  createClient(data) { const c = { ...data, id: Date.now(), created_at: new Date().toISOString(), description: data.description || '' }; CLIENTS.push(c); return ok(c) },
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
