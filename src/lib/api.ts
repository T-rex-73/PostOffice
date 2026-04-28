// ── API CLIENT ────────────────────────────────────────────────────────────────
const post  = (url: string, body: unknown) =>
  fetch(url, { method: 'POST',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())
const patch = (url: string, body: unknown) =>
  fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json())

// Helper: สร้าง query params จาก currentUser เพื่อส่ง role + office_name ทุก request
function userParams(u: { username: string; role: string; office_name: string }) {
  const q = new URLSearchParams()
  q.set('currentUsername', u.username)
  q.set('role', u.role)
  q.set('officeName', u.office_name)
  return q
}

export const api = {
  login:    (username: string, password: string, mode: 'username' | 'email' = 'username') =>
    post('/api/auth/login', { username, password, mode }),

  register: (name: string, username: string, password: string, email: string,
             officeName: string, officeAddress: string, officeZip: string, licenseNo: string, postName: string) =>
    post('/api/auth/register', { name, username, password, email, officeName, officeAddress, officeZip, licenseNo, postName }),

  // Step 1: validate and pre-register account (no office info yet)
  registerStep1: (name: string, username: string, password: string, email: string) =>
    post('/api/auth/register', { name, username, password, email, step: 1 }),

  // ── Records — ส่ง username+role+officeName ทุก request เพื่อ data isolation ──
  getRecords: (params?: { from?: string; to?: string; owner?: string; username?: string; role?: string; officeName?: string }) => {
    const q = new URLSearchParams()
    if (params?.from)       q.set('from',       params.from)
    if (params?.to)         q.set('to',         params.to)
    if (params?.owner)      q.set('owner',       params.owner)
    if (params?.username)   q.set('username',    params.username)
    if (params?.role)       q.set('role',        params.role)
    if (params?.officeName !== undefined) q.set('officeName', params.officeName)
    return fetch('/api/records?' + q).then(r => r.json())
  },

  saveRecord: (formData: Record<string, unknown>) =>
    post('/api/records', formData),

  saveBulkRecords: (rows: Record<string, unknown>[], username: string) =>
    post('/api/records', { bulk: true, rows, username }),

  updateTracking: (updates: { rowId: number; trackingER: string; trackingTH: string }[]) =>
    patch('/api/records/tracking', updates),

  searchRecord: (q: string, username: string, role: string, officeName?: string) =>
    fetch(`/api/records/search?q=${encodeURIComponent(q)}&username=${encodeURIComponent(username)}&role=${encodeURIComponent(role)}&officeName=${encodeURIComponent(officeName || '')}`).then(r => r.json()),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (currentUser: { username: string; role: string; office_name: string }) => {
    const q = userParams(currentUser)
    return fetch('/api/users?' + q).then(r => r.json())
  },

  approveUser: (username: string, currentUser: { username: string; role: string; office_name: string }) =>
    patch('/api/users', { action: 'approve', username, currentUsername: currentUser.username, currentRole: currentUser.role, currentOffice: currentUser.office_name }),

  revokeUser: (username: string, currentUser: { username: string; role: string; office_name: string }) =>
    patch('/api/users', { action: 'revoke', username, currentUsername: currentUser.username, currentRole: currentUser.role, currentOffice: currentUser.office_name }),

  deleteUser: (username: string, currentUser: { username: string; role: string; office_name: string }) =>
    fetch(`/api/users?username=${encodeURIComponent(username)}&${userParams(currentUser)}`, { method: 'DELETE' }).then(r => r.json()),

  changeUserRole: (username: string, role: string, currentUser: { username: string; role: string; office_name: string }) =>
    patch('/api/users', { action: 'changeRole', username, role, currentUsername: currentUser.username, currentRole: currentUser.role, currentOffice: currentUser.office_name }),

  editUser: (username: string, name: string, password: string, currentUser: { username: string; role: string; office_name: string }) =>
    patch('/api/users', { action: 'edit', username, name, password, currentUsername: currentUser.username, currentRole: currentUser.role, currentOffice: currentUser.office_name }),

  setUserLimit: (username: string, access_duration: string, month_count: number | undefined, currentUser: { username: string; role: string; office_name: string }) =>
    patch('/api/users', { action: 'setLimit', username, access_duration, month_count, currentUsername: currentUser.username, currentRole: currentUser.role, currentOffice: currentUser.office_name }),

  // ── Locations ─────────────────────────────────────────────────────────────
  getLocationData: () => fetch('/api/locations').then(r => r.json()),
  searchLandOffices: (q: string) =>
    fetch(`/api/locations?type=land_offices&q=${encodeURIComponent(q)}`).then(r => r.json()),

  // ── Record editing ────────────────────────────────────────────────────────
  editRecord: (id: number, formData: Record<string, unknown>) =>
    patch('/api/records', { action: 'edit', id, ...formData }),

  // ── Delete records ────────────────────────────────────────────────────────
  deleteRecords: (ids: number[], currentUser: { username: string; role: string; office_name: string }) =>
    fetch('/api/records', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, username: currentUser.username, role: currentUser.role, officeName: currentUser.office_name }) }).then(r => r.json()),

  // ── Delivery ──────────────────────────────────────────────────────────────
  saveDeliveryNote: (records: Record<string, string>[]) => post('/api/delivery', records),

  // ── Print — เปิด tab พร้อม ids ────────────────────────────────────────────
  openEnvelopePrint: (rowIds: number[], size: 'DL' | 'A4' | 'A4_FOLD' | 'AR_YELLOW' | 'AR_BLUE', username: string) => {
    window.open(`/print?ids=${rowIds.join(',')}&size=${size}&u=${encodeURIComponent(username)}`, '_blank')
  },
}
