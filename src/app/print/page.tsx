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

  // ลบซองตาม index
  const handleDelete = (index: number) => {
    setRecords(prev => prev.filter((_, i) => i !== index))
  }

  const sizeLabel: Record<string,string> = {
    DL:'ซองยาว DL (230×110 มม.)', A4:'ซอง A4 แนวนอน (297×210 มม.)', A4_FOLD:'A4 พับหลัง แนวตั้ง (210×297 มม.)',
    AR_YELLOW:'ใบตอบรับ สีเหลือง (A6 แนวนอน)', AR_BLUE:'ใบตอบรับ สีฟ้า (A6 แนวนอน)',
  }

  const pageCss: Record<string,string> = {
    DL:       '@page { size: 230mm 110mm; margin: 0; }',
    A4:       '@page { size: A4 landscape; margin: 0; }',
    A4_FOLD:  '@page { size: A4 portrait; margin: 0; }',
    AR_YELLOW:'@page { size: 148mm 105mm; margin: 0; }',
    AR_BLUE:  '@page { size: 148mm 105mm; margin: 0; }',
  }

  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Sarabun' }}>กำลังเตรียมซองจดหมาย...</div>

  const showGarudaSize = size !== 'AR_YELLOW' && size !== 'AR_BLUE'

  return (
    <>
      <style>{`
        @font-face { font-family:'THSarabun'; src:url('/fonts/THSarabun.ttf') format('truetype'); }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:white; }
        ${pageCss[size] || '@page { margin:0; }'}
        @media screen {
          body { background:#e5e7eb; padding:20px; }
          #envelope-print-area > div { margin:0 auto 24px; box-shadow:0 4px 20px rgba(0,0,0,.2); }
          .envelope-wrapper { position:relative; }
          .delete-btn {
            position:absolute; top:8px; right:8px; z-index:10;
            background:#EE2D24; color:white; border:none;
            width:32px; height:32px; border-radius:50%;
            font-size:16px; cursor:pointer; display:flex;
            align-items:center; justify-content:center;
            box-shadow:0 2px 6px rgba(0,0,0,.3);
            transition:background 0.2s;
          }
          .delete-btn:hover { background:#c0392b; }
        }
        @media print {
          body { background:white !important; padding:0 !important; }
          .no-print { display:none !important; }
          .delete-btn { display:none !important; }
        }
      `}</style>

      {/* Control bar */}
      <div className="no-print" style={{ textAlign:'center', padding:'16px', fontFamily:'Sarabun', background:'white', borderBottom:'1px solid #e2e8f0', marginBottom:'20px', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', flexWrap:'wrap' }}>
        <button onClick={() => window.print()} style={{ background:'#002B5B', color:'white', border:'none', padding:'10px 24px', borderRadius:'8px', fontSize:'14pt', cursor:'pointer' }}>
          🖨️ พิมพ์ / บันทึก PDF
        </button>

        {/* ปุ่มครุฑ มี/ไม่มี */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', background:'#f8fafc' }}>
          <span style={{ fontSize:'12pt', fontFamily:'Sarabun' }}>ตราครุฑ:</span>
          <button
            onClick={() => setShowGaruda(true)}
            style={{ padding:'4px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontFamily:'Sarabun', fontSize:'11pt', background: showGaruda ? '#002B5B' : '#e2e8f0', color: showGaruda ? 'white' : '#64748b' }}>
            มี
          </button>
          <button
            onClick={() => setShowGaruda(false)}
            style={{ padding:'4px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontFamily:'Sarabun', fontSize:'11pt', background: !showGaruda ? '#EE2D24' : '#e2e8f0', color: !showGaruda ? 'white' : '#64748b' }}>
            ไม่มี
          </button>
        </div>

        {/* ปุ่มขนาดครุฑ — แสดงเฉพาะเมื่อ showGaruda=true และไม่ใช่ AR */}
        {showGaruda && showGarudaSize && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', background:'#f8fafc' }}>
            <span style={{ fontSize:'12pt', fontFamily:'Sarabun' }}>ขนาดครุฑ:</span>
            <button
              onClick={() => setGarudaSize('normal')}
              style={{ padding:'4px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontFamily:'Sarabun', fontSize:'11pt', background: garudaSize === 'normal' ? '#002B5B' : '#e2e8f0', color: garudaSize === 'normal' ? 'white' : '#64748b' }}>
              ปกติ (2×3 ซม.)
            </button>
            <button
              onClick={() => setGarudaSize('small')}
              style={{ padding:'4px 14px', borderRadius:'6px', border:'none', cursor:'pointer', fontFamily:'Sarabun', fontSize:'11pt', background: garudaSize === 'small' ? '#002B5B' : '#e2e8f0', color: garudaSize === 'small' ? 'white' : '#64748b' }}>
              เล็ก (1.5×2 ซม.)
            </button>
          </div>
        )}

        <button onClick={() => window.close()} style={{ background:'#e2e8f0', color:'#334155', border:'none', padding:'10px 20px', borderRadius:'8px', fontSize:'14pt', cursor:'pointer' }}>
          ✕ ปิด
        </button>
        <div style={{ fontSize:'10pt', color:'#888', width:'100%', textAlign:'center' }}>
          {records.length} รายการ · {sizeLabel[size] || size}
        </div>
      </div>

      {/* แสดงซองทีละใบพร้อมปุ่มลบ */}
      <div id="envelope-print-area">
        {records.map((record, index) => (
          <div key={index} className="envelope-wrapper" style={{ position:'relative', display:'inline-block', width:'100%' }}>
            <button
              className="delete-btn no-print"
              onClick={() => handleDelete(index)}
              title="ลบซองนี้"
            >
              ✕
            </button>
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
        <div className="no-print" style={{ textAlign:'center', padding:'60px', fontFamily:'Sarabun', fontSize:'14pt', color:'#94a3b8' }}>
          ไม่มีรายการ — <button onClick={() => window.close()} style={{ color:'#002B5B', background:'none', border:'none', cursor:'pointer', fontSize:'14pt', textDecoration:'underline' }}>ปิดหน้านี้</button>
        </div>
      )}
    </>
  )
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh' }}>กำลังโหลด...</div>}>
      <PrintContent/>
    </Suspense>
  )
}
