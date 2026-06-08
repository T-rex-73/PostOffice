'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import EnvelopeTemplate, { type OfficeInfo, type EnvSize, type GarudaSize } from '@/components/envelope/EnvelopeTemplate'

function PrintContent() {
  const searchParams = useSearchParams()
  const [records, setRecords]       = useState<any[]>([])
  const [officeInfo, setOfficeInfo] = useState<OfficeInfo>({ office_name:'', office_address:'', license_no:'', post_name:'', office_zip:'' })
  const [showGaruda, setShowGaruda] = useState(true)
  const [garudaSize, setGarudaSize] = useState<GarudaSize>('normal')
  const [loading, setLoading]       = useState(true)
  const [userRole, setUserRole]     = useState('user')
  const [garudaOpen, setGarudaOpen] = useState(true)

  const ids      = searchParams.get('ids')?.split(',').map(Number) || []
  const size     = (searchParams.get('size') || 'DL') as EnvSize
  const username = searchParams.get('u') || ''

  useEffect(() => {
    if (!ids.length) { setLoading(false); return }
    Promise.all([
      fetch(`/api/users/profile?username=${encodeURIComponent(username)}`).then(r => r.json()),
    ]).then(([profile]) => {
      if (profile && !profile.error) {
        setOfficeInfo(profile)
        setUserRole(profile.role || 'user')
        const officeName = profile.office_name || ''
        fetch(`/api/records?username=${encodeURIComponent(username)}&role=${encodeURIComponent(profile.role || 'user')}&officeName=${encodeURIComponent(officeName)}`)
          .then(r => r.json())
          .then(rd => {
            const map: Record<number,any> = {}
            rd.forEach((r: any) => { map[r.rowId] = r })
            setRecords(ids.map(id => map[id]).filter(Boolean).map((r: any) => ({
              recipient: r['__ชื่อผู้รับ'], department: r['__ถึง'], address: r['__ที่'],
              sub_district: r['__ตำบล'], district: r['__อำเภอ'], province: r['__จังหวัด'],
              zip: r['__รหัสไปรษณีย์'], owner: r['__เจ้าของเรื่อง'], book_no: r['__เลขที่หนังสือ'],
              quantity: r['__จำนวน'], type: r['__ประเภท'], tracking_er: r['__เลขแท็กER'], recorded_at: r['__วันที่'],
            })))
            setLoading(false)
          })
          .catch(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }).catch(() => setLoading(false))
  }, [])

  const sizeLabel: Record<string,string> = {
    DL:'ซองยาว DL', A4:'ซอง A4 แนวนอน', A4_FOLD:'A4 พับหลัง',
    AR_YELLOW:'ใบตอบรับ สีเหลือง', AR_BLUE:'ใบตอบรับ สีฟ้า',
  }
  const sizeSub: Record<string,string> = {
    DL:'230×110 มม.', A4:'297×210 มม.', A4_FOLD:'210×297 มม.',
    AR_YELLOW:'148×105 มม. (A6)', AR_BLUE:'148×105 มม. (A6)',
  }

  const pageCss: Record<string,string> = {
    DL:       '@page { size: 230mm 110mm; margin: 0; }',
    A4:       '@page { size: A4 landscape; margin: 0; }',
    A4_FOLD:  '@page { size: A4 portrait; margin: 0; }',
    AR_YELLOW:'@page { size: 148mm 105mm; margin: 0; }',
    AR_BLUE:  '@page { size: 148mm 105mm; margin: 0; }',
  }

  const T = {
    fontSans: "'Sarabun','Kanit',sans-serif",
    fontMono: "'DM Mono','Courier New',monospace",
    fontDisp: "'Playfair Display',Georgia,serif",
  }

  if (loading) return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100vh', gap:16, fontFamily:T.fontMono,
      background:'#f0f0f0',
    }}>
      <div style={{ width:32, height:32, border:'2.5px solid #e0e0e0', borderTopColor:'#111', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
      <p style={{ fontFamily:T.fontMono, fontSize:11, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#999' }}>
        กำลังเตรียมซองจดหมาย
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const showGarudaSize = size !== 'AR_YELLOW' && size !== 'AR_BLUE'

  /* ── small reusable style tokens ── */
  const menuItem = (active: boolean): React.CSSProperties => ({
    width:'100%', padding:'9px 12px', borderRadius:10,
    border:'none', background: active ? '#1a1a1a' : 'transparent',
    color: active ? '#ffffff' : '#444',
    fontFamily:T.fontSans, fontSize:13, fontWeight: active ? 600 : 400,
    cursor:'pointer', transition:'all .15s ease',
    textAlign:'left', display:'flex', alignItems:'center', gap:10,
  })

  const menuItemDanger = (active: boolean): React.CSSProperties => ({
    ...menuItem(false),
    color: active ? '#cc2b22' : '#888',
    background: active ? '#fff0ef' : 'transparent',
    fontWeight: active ? 600 : 400,
  })

  const sectionLabel: React.CSSProperties = {
    fontFamily:T.fontSans, fontSize:11, fontWeight:600,
    letterSpacing:'0.08em', textTransform:'uppercase',
    color:'#aaa', padding:'0 4px', marginBottom:4,
  }

  const divider: React.CSSProperties = {
    border:'none', borderTop:'1px solid #e8e8e8', margin:'10px 0',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Mono:wght@400;500&family=Sarabun:wght@300;400;600;700&display=swap');
        @font-face { font-family:'THSarabun'; src:url('/fonts/THSarabun.ttf') format('truetype'); }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:white; }
        ${pageCss[size] || '@page { margin:0; }'}
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

        @media screen {
          body {
            background: #ebebeb;
            display: flex;
            min-height: 100vh;
          }

          /* ── Sidebar shell ── */
          #print-sidebar {
            width: 260px;
            min-width: 260px;
            min-height: 100vh;
            background: #f5f5f5;
            display: flex;
            flex-direction: column;
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
            animation: fadeIn .3s ease both;
            z-index: 100;
            padding: 16px 12px;
            gap: 6px;
          }

          /* ── White floating card panels inside sidebar ── */
          .sb-card {
            background: #ffffff;
            border-radius: 14px;
            padding: 14px 12px;
            display: flex;
            flex-direction: column;
            gap: 3px;
            animation: slideUp .25s ease both;
          }

          /* ── Main content area ── */
          #print-main {
            flex: 1;
            padding: 32px 28px;
            overflow-x: auto;
          }
          #envelope-print-area > div {
            margin: 0 auto 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,.12);
          }
          .envelope-wrapper { position: relative; }

          button:hover { opacity: .85; }
        }

        @media print {
          body { background:white !important; display:block !important; }
          #print-sidebar { display:none !important; }
          #print-main { padding:0 !important; }
          #envelope-print-area > div { box-shadow:none !important; margin:0 !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════
          LEFT SIDEBAR  — redesigned as Figma-style menu
      ══════════════════════════════════════ */}
      <aside id="print-sidebar" className="no-print">

        {/* ── Header card ── */}
        <div className="sb-card" style={{ gap:6 }}>
          {/* Star icon + Menu label like the reference image */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:18, lineHeight:1 }}>✦</span>
            <span style={{ fontFamily:T.fontSans, fontSize:15, fontWeight:700, color:'#111', letterSpacing:'-0.01em' }}>
              การตั้งค่าก่อนพิมพ์
            </span>
          </div>

          {/* Size badge */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:9, background:'#f5f5f5' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity:.5 }}>
              <rect x="1" y="2" width="14" height="12" rx="2" stroke="#333" strokeWidth="1.4"/>
              <path d="M4 6h8M4 9h5" stroke="#333" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <div>
              <p style={{ fontFamily:T.fontSans, fontSize:12, fontWeight:600, color:'#222' }}>{sizeLabel[size] || size}</p>
              <p style={{ fontFamily:T.fontMono, fontSize:10, color:'#aaa', marginTop:1 }}>{sizeSub[size] || ''}</p>
            </div>
            {/* Count pill */}
            <div style={{
              marginLeft:'auto', display:'inline-flex', alignItems:'center', gap:4,
              padding:'2px 9px', borderRadius:20,
              background:'#111', color:'#fff',
              fontFamily:T.fontMono, fontSize:10, fontWeight:700,
            }}>
              ✉ {records.length}
            </div>
          </div>
        </div>

        {/* ── ตราครุฑ section card ── */}
        <div className="sb-card">
          {/* Collapsible header */}
          <button
            onClick={() => setGarudaOpen(o => !o)}
            style={{
              background:'none', border:'none', padding:'2px 4px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              cursor:'pointer', width:'100%', marginBottom: garudaOpen ? 6 : 0,
            }}
          >
            <p style={sectionLabel}>ตราครุฑ</p>
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{ opacity:.4, transform: garudaOpen ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}
            >
              <path d="M3 5l4 4 4-4" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {garudaOpen && (
            <>
              <button onClick={() => setShowGaruda(true)} style={menuItem(showGaruda)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke={showGaruda ? '#fff' : '#ccc'} strokeWidth="1.3"/>
                  <path d="M5.5 8.5l2 2 3-3.5" stroke={showGaruda ? '#fff' : '#ccc'} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                มีตราครุฑ
              </button>
              <button onClick={() => setShowGaruda(false)} style={menuItemDanger(!showGaruda)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6.5" stroke={!showGaruda ? '#cc2b22' : '#ccc'} strokeWidth="1.3"/>
                  <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={!showGaruda ? '#cc2b22' : '#ccc'} strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                ไม่มีตราครุฑ
              </button>
            </>
          )}
        </div>

        {/* ── ขนาดครุฑ section card (conditional) ── */}
        {showGaruda && showGarudaSize && (
          <div className="sb-card">
            <p style={{ ...sectionLabel, marginBottom:6 }}>ขนาดครุฑ</p>

            <button onClick={() => setGarudaSize('normal')} style={menuItem(garudaSize === 'normal')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="10" rx="2"
                  stroke={garudaSize === 'normal' ? '#fff' : '#bbb'} strokeWidth="1.3"/>
              </svg>
              <span>
                ปกติ
                <span style={{ display:'block', fontSize:10, fontWeight:400, opacity:.6, marginTop:1 }}>2 × 3 ซม.</span>
              </span>
            </button>

            <button onClick={() => setGarudaSize('small')} style={menuItem(garudaSize === 'small')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="4" y="5" width="8" height="6" rx="1.5"
                  stroke={garudaSize === 'small' ? '#fff' : '#bbb'} strokeWidth="1.3"/>
              </svg>
              <span>
                เล็ก
                <span style={{ display:'block', fontSize:10, fontWeight:400, opacity:.6, marginTop:1 }}>1.5 × 2 ซม.</span>
              </span>
            </button>
          </div>
        )}

        {/* ── Spacer ── */}
        <div style={{ flex:1 }}/>

        {/* ── Action card pinned bottom ── */}
        <div className="sb-card" style={{ gap:6, marginTop:4 }}>
          <button
            onClick={() => window.print()}
            style={{
              width:'100%', padding:'11px 0',
              background:'#1a1a1a', color:'#ffffff',
              border:'none', borderRadius:10,
              fontFamily:T.fontSans, fontSize:13, fontWeight:700,
              cursor:'pointer', letterSpacing:'0.02em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              transition:'all .15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#333' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a1a' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 5V2h8v3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round"/>
              <rect x="1" y="5" width="14" height="7" rx="2" stroke="#fff" strokeWidth="1.4"/>
              <path d="M4 9h8M4 12h8" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".6"/>
            </svg>
            พิมพ์ / PDF
          </button>

          <button
            onClick={() => window.close()}
            style={{
              width:'100%', padding:'9px 0',
              background:'transparent', color:'#888',
              border:'none', borderRadius:10,
              fontFamily:T.fontSans, fontSize:12, fontWeight:500,
              cursor:'pointer', transition:'color .15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#111' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#888' }}
          >
            ✕ ปิดหน้านี้
          </button>
        </div>
      </aside>

      {/* ══ RIGHT — envelope area (untouched) ══ */}
      <main id="print-main">
        <div id="envelope-print-area">
          {records.map((record, index) => (
            <div key={index} className="envelope-wrapper" style={{ position:'relative', display:'inline-block', width:'100%' }}>
              <EnvelopeTemplate
                records={[record]}
                size={size}
                officeInfo={officeInfo}
                showGaruda={showGaruda}
                garudaSize={garudaSize}
              />
            </div>
          ))}
        </div>

        {records.length === 0 && (
          <div className="no-print" style={{
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            minHeight:'80vh', gap:12, fontFamily:T.fontSans,
          }}>
            <span style={{ fontSize:56, opacity:.1 }}>✉</span>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#bbb' }}>ไม่มีรายการ</p>
            <button onClick={() => window.close()} style={{
              marginTop:8, padding:'9px 22px',
              background:'#111', color:'#fff',
              border:'none', borderRadius:9,
              fontFamily:T.fontSans, fontSize:12, fontWeight:700, cursor:'pointer',
            }}>
              ปิดหน้านี้
            </button>
          </div>
        )}
      </main>
    </>
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        height:'100vh', gap:16,
        fontFamily:"'Sarabun','Kanit',sans-serif",
        background:'#ebebeb',
      }}>
        <p style={{ fontSize:12, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'#999' }}>กำลังโหลด...</p>
      </div>
    }>
      <PrintContent/>
    </Suspense>
  )
}
