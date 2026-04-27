'use client'
import { buildFullTracking, formatZipSpaced } from '@/lib/utils'

export interface EnvelopeData {
  recipient: string; department: string; address: string
  sub_district: string; district: string; province: string; zip: string
  owner: string; book_no: string; quantity: string; type: string
  tracking_er: string; recorded_at: string
}
export interface OfficeInfo {
  office_name: string; office_address: string; license_no: string; post_name: string; office_zip?: string
}
export type EnvSize = 'DL' | 'A4' | 'A4_FOLD' | 'AR_YELLOW' | 'AR_BLUE'
export type GarudaSize = 'normal' | 'small'

interface Props { records: EnvelopeData[]; size: EnvSize; officeInfo: OfficeInfo; showGaruda: boolean; garudaSize?: GarudaSize }

const F: React.CSSProperties = {
  fontFamily: "'AngsanaUPC','Angsana New','AngsanaUPC',serif",
  color: '#000', lineHeight: 1.2,
}

// ── LicenseBox ────────────────────────────────────────────────────────────────
function LicenseBox({ info, fontSize = 13, top = '8mm', right = '8mm' }: { info: OfficeInfo; fontSize?: number; top?: string; right?: string }) {
  return (
    <div style={{
      position: 'absolute', top, right,
      border: '1.5pt solid #000', padding: '2mm 5mm',
      textAlign: 'center', ...F, fontSize: `${fontSize}pt`, lineHeight: 1.4, minWidth: '45mm',
    }}>
      <div>ชำระค่าฝากส่งเป็นรายเดือน</div>
      <div>ใบอนุญาตเลขที่  {info.license_no}</div>
      <div>{info.post_name}</div>
    </div>
  )
}

// ── ตราครุฑ ───────────────────────────────────────────────────────────────────
// garudaSize: 'small'  = 1.5×2 ซม. (≈57×76 px @96dpi)
//             'normal' = 2×3 ซม.   (≈76×113 px @96dpi)
function Garuda({ garudaSize = 'normal' }: { size?: number; garudaSize?: 'normal' | 'small' }) {
  // 1 ซม. ≈ 37.8px  →  1.5 ซม.≈57px, 2 ซม.≈76px, 3 ซม.≈113px
  const w = garudaSize === 'small' ? 57  : 76
  const h = garudaSize === 'small' ? 76  : 113
  return (
    <img
      src="/garuda.jpg"
      width={w}
      height={h}
      style={{ display: 'block', marginBottom: '1mm', objectFit: 'contain' }}
      alt="ตราครุฑ"
    />
  )
}

// ── SenderBlock ────────────────────────────────────────────────────────────────
// จัดที่อยู่ผู้ส่งในรูปแบบ:
//   ที่อยู่ ถนน ตำบล
//   อำเภอ จังหวัด รหัสไปรษณีย์
//   เลขที่หนังสือ
// โดยแยก office_address ที่มีรูปแบบ "ถนน... ตำบล... อำเภอ... จังหวัด..." หรือ "ถนน... อำเภอ..."
function parseSenderAddress(officeAddress: string) {
  if (!officeAddress) return { line1: '', line2: '' }
  // แยกที่ "อำเภอ" เพื่อตัดบรรทัด
  const ampIdx = officeAddress.search(/อำเภอ|เขต/)
  if (ampIdx > 0) {
    return {
      line1: officeAddress.slice(0, ampIdx).trim(),
      line2: officeAddress.slice(ampIdx).trim(),
    }
  }
  // fallback: แสดงทั้งหมดในบรรทัดเดียว
  return { line1: officeAddress, line2: '' }
}

// ── RecipientBlock ─────────────────────────────────────────────────────────────
function RecipientBlock({
  r, fontSize = 16, recipientIndent = '28mm',
}: { r: EnvelopeData; fontSize?: number; recipientIndent?: string }) {
  const zip = formatZipSpaced(r.zip)
  const col = `${recipientIndent} 1fr`
  const row = (label: string, content: React.ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: col }}>
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      <span>{content}</span>
    </div>
  )
  const subDistLine = [
    r.sub_district ? `ตำบล/แขวง${r.sub_district}` : '',
    r.district     ? `  ${r.district}`              : '',
  ].filter(Boolean).join('')

  return (
    <div style={{ ...F, fontSize: `${fontSize}pt`, lineHeight: 1.35 }}>
      {row('เรียน', r.recipient)}
      {r.department  && row('', r.department)}
      {r.address     && row('', r.address)}
      {subDistLine   && row('', subDistLine)}
      {row('', `จังหวัด${r.province}`)}
      {row('', (
        <span style={{ fontSize: `${fontSize + 5}pt`, fontWeight: 'bold', letterSpacing: '0.35em' }}>
          {zip || r.zip}
        </span>
      ))}
    </div>
  )
}

// ── SenderBlockDLWithGaruda ────────────────────────────────────────────────────────────────
function SenderBlockDLWithGaruda({ info, r, garudaSize }: { info: OfficeInfo; r: EnvelopeData; garudaSize?: GarudaSize }) {
  const { line1, line2 } = parseSenderAddress(info.office_address)
  return (
    <>
      <div style={{ position: 'absolute', top: '4mm', left: '10mm' }}>
        <Garuda garudaSize={garudaSize} />
      </div>
      <div style={{ position: 'absolute', top: '20mm', left: '14mm', width: '75mm' }}>
        <div style={{ ...F, fontSize: '15pt', lineHeight: 1.3 }}>
          <div>{info.office_name}</div>
          {line1 && <div>{line1}</div>}
          {line2 && <div>{line2}</div>}
          <div>ที่  {r.book_no}</div>
        </div>
      </div>
    </>
  )
}

// ── SenderBlockDLWithoutGaruda ────────────────────────────────────────────────────────────────
function SenderBlockDLWithoutGaruda({ info, r }: { info: OfficeInfo; r: EnvelopeData }) {
  const { line1, line2 } = parseSenderAddress(info.office_address)
  return (
    <div style={{ position: 'absolute', top: '26mm', left: '10mm', width: '75mm' }}>
      <div style={{ ...F, fontSize: '15pt', lineHeight: 1.3 }}>
        <div>{info.office_name}</div>
        {line1 && <div>{line1}</div>}
        {line2 && <div>{line2}</div>}
        <div>ที่  {r.book_no}</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DL
// ══════════════════════════════════════════════════════════════════════════════
function DL({ r, info, showGaruda, garudaSize = 'normal' }: { r: EnvelopeData; info: OfficeInfo; showGaruda: boolean; garudaSize?: GarudaSize }) {
  return (
    <div style={{
      width: '230mm', height: '100mm', pageBreakAfter: 'always',
      boxSizing: 'border-box', backgroundColor: 'white', position: 'relative',
    }}>
      {showGaruda ? <SenderBlockDLWithGaruda info={info} r={r} garudaSize={garudaSize} /> : <SenderBlockDLWithoutGaruda info={info} r={r} />}
      <LicenseBox info={info} fontSize={12} top="8mm" right="2mm" />
      <div style={{ position: 'absolute', top: '50mm', left: '80mm', right: '10mm' }}>
        <RecipientBlock r={r} fontSize={17} recipientIndent='18mm' />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// A4 พับหลัง
// ══════════════════════════════════════════════════════════════════════════════
function A4Fold({ r, info, showGaruda, garudaSize = 'normal' }: { r: EnvelopeData; info: OfficeInfo; showGaruda: boolean; garudaSize?: GarudaSize }) {
  const { line1, line2 } = parseSenderAddress(info.office_address)
  return (
    <div style={{
      width: '210mm', height: '297mm', pageBreakAfter: 'always',
      boxSizing: 'border-box', backgroundColor: 'white', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '148.5mm', padding: '2mm 10mm', boxSizing: 'border-box',
      }}>
        <div style={{ ...F, fontSize: '14pt', lineHeight: 1.1 }}>
          {showGaruda && <Garuda garudaSize={garudaSize} />}
          <div>{info.office_name}</div>
          {line1 && <div>{line1}</div>}
          {line2 && <div>{line2}</div>}
          <div>ที่  {r.book_no}</div>
        </div>
        <LicenseBox info={info} fontSize={12} top="8mm" right="6mm" />
        <div style={{ marginTop: '2mm', marginLeft: '70mm' }}>
          <RecipientBlock r={r} fontSize={16} recipientIndent='15mm' />
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// A4 ธรรมดา
// ══════════════════════════════════════════════════════════════════════════════
function A4Envelope({ r, info, showGaruda, garudaSize = 'normal' }: { r: EnvelopeData; info: OfficeInfo; showGaruda: boolean; garudaSize?: GarudaSize }) {
  const { line1, line2 } = parseSenderAddress(info.office_address)
  return (
    <div style={{
      width: '297mm', height: '210mm', pageBreakAfter: 'always',
      boxSizing: 'border-box', backgroundColor: 'white', position: 'relative',
      padding: '14mm 18mm',
    }}>
      <div style={{ ...F, fontSize: '16pt', lineHeight: 1.3 }}>
        {showGaruda && <Garuda garudaSize={garudaSize} />}
        <div>{info.office_name}</div>
        {line1 && <div>{line1}</div>}
        {line2 && <div>{line2}</div>}
        <div>ที่  {r.book_no}</div>
      </div>
      <LicenseBox info={info} fontSize={14} />
      <div style={{ marginTop: '14mm', marginLeft: '80mm' }}>
        <RecipientBlock r={r} fontSize={20} recipientIndent='28mm' />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// AR หน้าซอง — แบ่งครึ่งบน/ล่าง ด้วยแถบดำ ตามรูปตัวอย่าง
//
//  ┌──────────────────────────────────────────┐
//  │  กองการเจ้าหน้าที่                       │  ← ผู้รับ เริ่มจากซ้าย
//  │      กรมที่ดิน  ศูนย์ราชการฯ            │    เยื้องขวาด้วย paddingLeft 14mm
//  │  ตำบล/แขวง ทุ่งสองห้อง  เขตหลักสี่      │
//  │  จังหวัดกรุงเทพมหานคร  1 0 2 1 0        │
//  │      สนามจันทร์                          │
//  ██████████████████████████████████████████  ← แถบดำ
//  │                                          │
//  │        สำนักงานที่ดินจังหวัดนครปฐม      │  ← ผู้ส่ง กึ่งกลาง-ขวา
//  │        ถนนลำพยา      ตำบลลำพยา         │    paddingLeft 20mm
//  │        อำเภอเมืองลำพยา  จังหวัดนครปฐม  │
//  │        นฐ book_no  owner                │
//  │                 7 3 0 0 0               │
//  └──────────────────────────────────────────┘
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// AR สีเหลือง (ใบตอบรับภายในประเทศ)
// Layout:
//  ┌──────────────────────────────────────────┐
//  │ ผู้รับ — ชื่อ ← ซ้าย paddingLeft 14mm   │
//  │   หน่วยงาน + ที่อยู่ เยื้อง 4mm          │
//  │   ตำบล/แขวง + อำเภอ เยื้อง 4mm           │
//  │   จังหวัด   ZIP ใหญ่                     │
//  │   post_name เยื้อง 8mm                   │
//  ██████████████████████████████████████████
//  │ ผู้ส่ง — ชื่อสำนักงาน paddingLeft 20mm   │
//  │   ที่อยู่, เลขที่หนังสือ, ZIP            │
//  └──────────────────────────────────────────┘
// ══════════════════════════════════════════════════════════════════════════════
function ARYellow({ r, info, isLast }: { r: EnvelopeData; info: OfficeInfo; showGaruda: boolean; isLast?: boolean }) {
  const zip         = formatZipSpaced(r.zip)
  const upperPt     = '14pt'
  const upperZipFs  = '20pt'
  const lowerPt     = '18pt'
  const lowerZipFs  = '24pt'

  const subDistLine = [
    r.address      ? r.address                     : '',
    r.sub_district ? `ตำบล/แขวง${r.sub_district}` : '',
    r.district     ? `  ${r.district}`              : '',
  ].filter(Boolean).join(' ')

  const { line1: addrLine1, line2: addrLine2 } = parseSenderAddress(info.office_address)

  return (
    <div style={{
      width: '148mm', height: '210mm',
      pageBreakAfter: isLast ? 'auto' : 'always',
      breakAfter:     isLast ? 'auto' : 'page',
      boxSizing: 'border-box',
      backgroundColor: '#fffbe6',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* ══ ครึ่งบน: ผู้รับ ═══════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '105mm',
        padding: '12mm 8mm 0 6mm', boxSizing: 'border-box',
        ...F, fontSize: upperPt, lineHeight: 1.1,
      }}>
        <div style={{ paddingLeft: '10mm' }}>{r.recipient}</div>
        {r.department && <div style={{ paddingLeft: '14mm' }}>{r.department}</div>}
        {subDistLine && <div style={{paddingLeft: '0mm' }}>{subDistLine}</div>}
        <div style={{ position: 'relative', paddingLeft: '0mm', marginTop: '0.5mm' }}>
          <span>จังหวัด{r.province}</span>
          <span style={{
            position: 'absolute', top: 0,left: "67mm", right: '0mm',
            fontSize: upperZipFs, fontWeight: 'bold', letterSpacing: '0.2em',
          }}>
            {zip || r.zip}
          </span>
        </div>
        {info.post_name && (
          <div style={{ fontSize: '14pt', paddingLeft: '50mm', marginTop: '2mm' }}>{info.post_name}</div>
        )}
      </div>

      {/* ══ แถบดำแบ่งกลาง ═════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: '105mm', left: 0, right: 0,
        height: '5mm', backgroundColor: '#000',
      }} />
      {/* ══ ครึ่งล่าง: ผู้ส่ง ═════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: '120mm', left: 150, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: '20mm', paddingRight: '8mm', boxSizing: 'border-box',
        ...F, fontSize: lowerPt, lineHeight: 1.5,
      }}>
        <div>{info.office_name}</div>
        {addrLine1 && <div>{addrLine1}</div>}
        {addrLine2 && <div>{addrLine2}</div>}
        <div>ที่ {r.book_no}&nbsp;&nbsp;&nbsp;{r.owner}</div>
        <div style={{ fontSize: lowerZipFs, fontWeight: 'bold', letterSpacing: '0.29em', marginLeft: '38mm', marginTop: '7mm' }}>
          {info.office_zip ? formatZipSpaced(info.office_zip) : (zip || r.zip)}
        </div>
      </div>

    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// AR สีฟ้า (ใบตอบรับระหว่างหน่วยงาน / EMS ต่างจังหวัด)
// Layout ต่างจากสีเหลือง:
//  ┌──────────────────────────────────────────┐
//  │ ผู้รับ — ชื่อตัวใหญ่ bold กึ่งกลางแนวตั้ง│
//  │ [border-left] หน่วยงาน แยกบรรทัด        │
//  │ ที่อยู่, ตำบล+อำเภอ, จังหวัด, ZIP ใหญ่  │
//  ██████████████████████████████████████████
//  │ [กรอบ border สีน้ำเงิน] ผู้ส่ง          │
//  │  label "ผู้ส่ง / FROM"                  │
//  │  ชื่อสำนักงาน, ที่อยู่, เลขที่หนังสือ   │
//  │  ZIP ใหญ่                               │
//  └──────────────────────────────────────────┘
// ══════════════════════════════════════════════════════════════════════════════
function ARBlue({ r, info, isLast }: { r: EnvelopeData; info: OfficeInfo; showGaruda: boolean; isLast?: boolean }) {
  const zip   = formatZipSpaced(r.zip)
const upperPt     = '14pt'
const upperZipFs  = '20pt'
const lowerPt     = '18pt'
const lowerZipFs  = '24pt'

  const { line1: addrLine1, line2: addrLine2 } = parseSenderAddress(info.office_address)

  return (
    <div style={{
      width: '148mm', height: '210mm',
      pageBreakAfter: isLast ? 'auto' : 'always',
      breakAfter:     isLast ? 'auto' : 'page',
      boxSizing: 'border-box',
      backgroundColor: '#ddeeff',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* ══ ครึ่งบน: ผู้รับ — จัดซ้าย กึ่งกลางแนวตั้ง ═══════════════════ */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50mm',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '8mm 10mm 8mm 5mm', boxSizing: 'border-box',
        ...F, fontSize: upperPt, lineHeight: 1.1,
      }}>
        {/* ชื่อผู้รับ */}
        <div style={{paddingLeft: '9mm',marginBottom: '0.3mm' }}>{r.recipient}</div>
        {/* หน่วยงาน — บรรทัดแยก ไม่มี border-left */}
        {r.department && (
          <div style={{ paddingLeft: '13mm', marginBottom: '0.5mm' }}>
            {[r.department]}
          </div>
        )}
        {/* ตำบล + อำเภอ */}
        {(r.address || r.sub_district || r.district) && (
          <div style={{ paddingLeft: '0mm', marginTop: '-0.5mm', display: 'flex', gap: '1mm', flexWrap: 'wrap' }}>
            {r.address && <span>{r.address}</span>}
            {r.sub_district && <span>ตำบล{r.sub_district}</span>}
            {r.district && <span>{r.district}</span>}
          </div>
        )}
        <div style={{ position: 'relative', paddingLeft: '0mm', marginTop: '0.5mm' }}>
          <span>จังหวัด{r.province}</span>
          <span style={{
            position: 'absolute', top: 1, left: "72mm", right: '0mm',
            fontSize: upperZipFs, fontWeight: 'bold', letterSpacing: '0.1em',
          }}>
            {zip || r.zip}
          </span>
        </div>
        {/* ชื่อไปรษณีย์ */}
        {info.post_name && (
          <div style={{ fontSize: '13pt', marginTop: '7mm',paddingLeft: '15mm' }}>{info.post_name}</div>
        )}
      </div>

      {/* ══ แถบดำแบ่งกลาง ═════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', top: '105mm', left: 0, right: 0,
        height: '5mm', backgroundColor: '#000',
      }} />

      {/* ══ ครึ่งล่าง: ผู้ส่ง — ไม่มีกรอบ ไม่มี label ══════════════════════ */}
      <div style={{
        position: 'absolute', top: '130mm', left: '50mm', right: '8mm', bottom: '8mm',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '4mm 6mm', boxSizing: 'border-box',
        ...F, fontSize: lowerPt, lineHeight: 1.6,
      }}>
        <div style={{ marginBottom: '0.5mm'}}>{info.office_name}</div>
        {addrLine1 && <div>{addrLine1}</div>}
        {addrLine2 && <div>{addrLine2}</div>}
        <div>ที่ {r.book_no}&nbsp;&nbsp;&nbsp;{r.owner}</div>
        <div style={{ fontSize: lowerZipFs, fontWeight: 'bold',paddingLeft: '38mm', letterSpacing: '0.26em', marginTop: '0.5mm' }}>
          {info.office_zip ? formatZipSpaced(info.office_zip) : (zip || r.zip)}
        </div>
      </div>

    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
export default function EnvelopeTemplate({ records, size, officeInfo, showGaruda, garudaSize = 'normal' }: Props) {
  return (
    <div id="envelope-print-area">
      {records.map((r, i) => {
        const isLast = i === records.length - 1
        switch (size) {
          case 'A4':        return <A4Envelope key={i} r={r} info={officeInfo} showGaruda={showGaruda} garudaSize={garudaSize}/>
          case 'A4_FOLD':   return <A4Fold     key={i} r={r} info={officeInfo} showGaruda={showGaruda} garudaSize={garudaSize}/>
          case 'AR_BLUE':   return <ARBlue     key={i} r={r} info={officeInfo} showGaruda={showGaruda} isLast={isLast}/>
          case 'AR_YELLOW': return <ARYellow   key={i} r={r} info={officeInfo} showGaruda={showGaruda} isLast={isLast}/>
          default:          return <DL         key={i} r={r} info={officeInfo} showGaruda={showGaruda} garudaSize={garudaSize}/>
        }
      })}
    </div>
  )
}
