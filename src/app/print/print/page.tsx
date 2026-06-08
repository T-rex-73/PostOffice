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
      background:'#f9f9f9',
      backgroundImage:'linear-gradient(#e8e8e8 1px,transparent 1px),linear-gradient(90deg,#e8e8e8 1px,transparent 1px)',
      backgroundSize:'40px 40px',
    }}>
      <div style={{ width:36, height:36, border:'3px solid #e0e0e0', borderTopColor:'#111', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
      <p style={{ fontFamily:T.fontMono, fontSize:11, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#999' }}>
        กำลังเตรียมซองจดหมาย
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const showGarudaSize = size !== 'AR_YELLOW' && size !== 'AR_BLUE'

  const chipBase: React.CSSProperties = {
    width:'100%', padding:'8px 12px', borderRadius:8,
    border:'1px solid #e0e0e0',
    fontFamily:T.fontMono, fontSize:11, fontWeight:700,
    cursor:'pointer', transition:'all .15s ease',
    letterSpacing:'0.04em', textAlign:'left',
    display:'flex', alignItems:'center', gap:8,
  }
  const chipOn:  React.CSSProperties = { ...chipBase, background:'#111111', color:'#ffffff', border:'1px solid #111111' }
  const chipOff: React.CSSProperties = { ...chipBase, background:'#ffffff', color:'#999999', border:'1px solid #e8e8e8' }
  const chipRed: React.CSSProperties = { ...chipBase, background:'#EE2D24', color:'#ffffff', border:'1px solid #EE2D24' }

  const secLabel: React.CSSProperties = {
    fontFamily:T.fontMono, fontSize:9, fontWeight:700,
    letterSpacing:'0.2em', textTransform:'uppercase',
    color:'#bbb', marginBottom:8,
  }
  const hr: React.CSSProperties = { border:'none', borderTop:'1px solid #e8e8e8', margin:'20px 0' }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Mono:wght@400;500&family=Sarabun:wght@300;400;600;700&display=swap');
        @font-face { font-family:'THSarabun'; src:url('/fonts/THSarabun.ttf') format('truetype'); }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:white; }
        ${pageCss[size] || '@page { margin:0; }'}
        @keyframes spin   { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }

        @media screen {
          body {
            background: #f9f9f9;
            background-image: linear-gradient(#e8e8e8 1px,transparent 1px),linear-gradient(90deg,#e8e8e8 1px,transparent 1px);
            background-size: 40px 40px;
            display: flex;
            min-height: 100vh;
          }
          #print-sidebar {
            width: 240px;
            min-width: 240px;
            min-height: 100vh;
            background: #ffffff;
            border-right: 2px solid #111111;
            display: flex;
            flex-direction: column;
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
            animation: fadeIn .25s ease both;
            box-shadow: 2px 0 0 #111111;
            z-index: 100;
          }
          #print-main {
            flex: 1;
            padding: 32px 28px;
            overflow-x: auto;
          }
          #envelope-print-area > div {
            margin: 0 auto 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,.15);
          }
          .envelope-wrapper { position: relative; }
        }

        @media print {
          body { background:white !important; display:block !important; }
          #print-sidebar { display:none !important; }
          #print-main { padding:0 !important; }
          #envelope-print-area > div { box-shadow:none !important; margin:0 !important; }
        }
      `}</style>

      {/* ══ LEFT SIDEBAR ══ */}
      <aside id="print-sidebar" className="no-print">

        {/* Branding */}
        <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid #e8e8e8' }}>
          <p style={{ fontFamily:T.fontMono, fontSize:9, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'#bbb', marginBottom:6 }}>
            ระบบบริหารจัดการ
          </p>
          <p style={{ fontFamily:T.fontDisp, fontSize:22, fontWeight:400, color:'#bbb', lineHeight:1.1, letterSpacing:'-0.02em' }}>
            พิมพ์<span style={{ fontWeight:900, color:'#111' }}>ซอง</span>
          </p>
          {/* size card */}
          <div style={{ marginTop:14, padding:'8px 12px', borderRadius:8, background:'#f5f5f5', border:'1px solid #e8e8e8' }}>
            <p style={{ fontFamily:T.fontMono, fontSize:11, fontWeight:700, color:'#333', marginBottom:2 }}>{sizeLabel[size] || size}</p>
            <p style={{ fontFamily:T.fontMono, fontSize:10, color:'#aaa' }}>{sizeSub[size] || ''}</p>
          </div>
          {/* count pill */}
          <div style={{
            marginTop:8, display:'inline-flex', alignItems:'center', gap:6,
            padding:'3px 10px', borderRadius:20,
            background:'#111', color:'#fff',
            fontFamily:T.fontMono, fontSize:10, fontWeight:700,
          }}>
            <span style={{ fontSize:12 }}>✉</span>
            {records.length} รายการ
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding:'20px', flex:1 }}>

          {/* ── ตราครุฑ ── */}
          <p style={secLabel}>ตราครุฑ</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <button onClick={() => setShowGaruda(true)}  style={showGaruda  ? chipOn  : chipOff}>
              <span style={{ fontSize:14 }}>🦅</span> มีตราครุฑ
            </button>
            <button onClick={() => setShowGaruda(false)} style={!showGaruda ? chipRed : chipOff}>
              <span style={{ fontSize:14 }}>🚫</span> ไม่มีตราครุฑ
            </button>
          </div>

          {/* ── ขนาดครุฑ ── */}
          {showGaruda && showGarudaSize && (
            <>
              <hr style={hr}/>
              <p style={secLabel}>ขนาดครุฑ</p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <button onClick={() => setGarudaSize('normal')} style={garudaSize==='normal' ? chipOn : chipOff}>
                  <span style={{ fontSize:14 }}>🔲</span>
                  <span>
                    ปกติ
                    <span style={{ display:'block', fontSize:9, fontWeight:400, opacity:.6, marginTop:1 }}>2 × 3 ซม.</span>
                  </span>
                </button>
                <button onClick={() => setGarudaSize('small')} style={garudaSize==='small' ? chipOn : chipOff}>
                  <span style={{ fontSize:14 }}>▫️</span>
                  <span>
                    เล็ก
                    <span style={{ display:'block', fontSize:9, fontWeight:400, opacity:.6, marginTop:1 }}>1.5 × 2 ซม.</span>
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Action buttons pinned to bottom */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid #e8e8e8', display:'flex', flexDirection:'column', gap:8 }}>
          <button
            onClick={() => window.print()}
            style={{
              width:'100%', padding:'12px 0',
              background:'#111111', color:'#ffffff',
              border:'2px solid #111111', borderRadius:8,
              fontFamily:T.fontMono, fontSize:12, fontWeight:700,
              cursor:'pointer', letterSpacing:'0.04em',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:'2px 2px 0 #111111', transition:'all .15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='#333'; (e.currentTarget as HTMLElement).style.borderColor='#333' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='#111'; (e.currentTarget as HTMLElement).style.borderColor='#111' }}
          >
            <span style={{ fontSize:15 }}>🖨️</span> พิมพ์ / PDF
          </button>

          <button
            onClick={() => window.close()}
            style={{
              width:'100%', padding:'10px 0',
              background:'#f5f5f5', color:'#666',
              border:'1px solid #e0e0e0', borderRadius:8,
              fontFamily:T.fontMono, fontSize:11, fontWeight:700,
              cursor:'pointer', letterSpacing:'0.04em', transition:'all .15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor='#111'; (e.currentTarget as HTMLElement).style.color='#111' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor='#e0e0e0'; (e.currentTarget as HTMLElement).style.color='#666' }}
          >
            ✕ ปิด
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
            minHeight:'80vh', gap:12, fontFamily:T.fontMono,
          }}>
            <span style={{ fontSize:56, opacity:.1 }}>✉</span>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#bbb' }}>ไม่มีรายการ</p>
            <button onClick={() => window.close()} style={{
              marginTop:8, padding:'9px 22px',
              background:'#111', color:'#fff',
              border:'2px solid #111', borderRadius:6,
              fontFamily:T.fontMono, fontSize:11, fontWeight:700, cursor:'pointer',
              letterSpacing:'0.08em', boxShadow:'2px 2px 0 #111',
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
        fontFamily:"'DM Mono','Courier New',monospace",
        background:'#f9f9f9',
        backgroundImage:'linear-gradient(#e8e8e8 1px,transparent 1px),linear-gradient(90deg,#e8e8e8 1px,transparent 1px)',
        backgroundSize:'40px 40px',
      }}>
        <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase', color:'#999' }}>กำลังโหลด...</p>
      </div>
    }>
      <PrintContent/>
    </Suspense>
  )
}
