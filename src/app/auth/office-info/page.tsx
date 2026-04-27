'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'

function MathCaptcha({ onVerify }: { onVerify: (ok: boolean) => void }) {
  const [a] = useState(() => Math.floor(Math.random() * 9) + 1)
  const [b] = useState(() => Math.floor(Math.random() * 9) + 1)
  const [ans, setAns] = useState('')
  const [checked, setChecked] = useState(false)
  const [ok, setOk] = useState(false)
  const verify = () => {
    const correct = parseInt(ans) === a + b
    setOk(correct)
    setChecked(true)
    onVerify(correct)
  }
  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
      <span className="text-xs font-bold text-slate-500">ยืนยันตัวตน: {a} + {b} = ?</span>
      <input
        value={ans}
        onChange={e => { setAns(e.target.value.replace(/\D/g, '')); setChecked(false); onVerify(false) }}
        className="w-12 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center font-bold"
        maxLength={2}
        placeholder="?"
      />
      <button type="button" onClick={verify}
        className="px-2 py-1 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300">
        ตรวจ
      </button>
      {checked && (
        <span className={`text-xs font-bold ${ok ? 'text-green-600' : 'text-red-500'}`}>{ok ? '✓' : '✗'}</span>
      )}
    </div>
  )
}

function OfficeInfoForm() {
  const router = useRouter()

  // Read account data stored by step 1
  const [account, setAccount] = useState<{ name: string; username: string; password: string; email: string } | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('reg_pending')
      if (raw) {
        setAccount(JSON.parse(raw))
      }
    } catch {}
    setReady(true)
  }, [])

  const [form, setForm] = useState({
    officeName: '',
    officeAddress: '',
    officeZip: '',
    licenseNo: '',
    postName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [captchaOk, setCaptchaOk] = useState(false)

  const lbl = 'block text-xs font-bold text-slate-500 mb-1'
  const inp = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

  const handleSubmit = async () => {
    if (!account) return
    if (!form.officeName || !form.officeAddress) {
      setError('กรุณากรอกชื่อสำนักงานและที่อยู่')
      return
    }
    if (!captchaOk) {
      setError('กรุณายืนยัน Captcha ก่อน')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: account.name,
          username: account.username,
          password: account.password,
          email: account.email,
          officeName: form.officeName,
          officeAddress: form.officeAddress,
          officeZip: form.officeZip,
          licenseNo: form.licenseNo,
          postName: form.postName,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setLoading(false)
        return
      }
      // Clear pending registration data
      try { sessionStorage.removeItem('reg_pending') } catch {}
      router.push('/?registered=1')
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">กำลังโหลด...</div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-sm w-full">
          <span className="material-icons text-4xl text-slate-300 mb-3 block">error_outline</span>
          <p className="text-slate-500 mb-4 font-bold">ไม่พบข้อมูลการสมัคร กรุณาเริ่มสมัครสมาชิกใหม่</p>
          <a href="/" className="inline-block mt-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">← กลับหน้าหลัก</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8" style={{ maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="text-center mb-6">
          <img src="/logo.png" alt="PostOffice Logo" className="w-16 h-16 mx-auto mb-3 rounded-full shadow-lg object-cover" />
          <h1 className="text-xl font-black text-slate-800">ข้อมูลสำนักงาน</h1>
          <p className="text-sm text-slate-400 mt-1">ขั้นตอนที่ 2 / 2 — กรอกข้อมูลสำนักงานของคุณ</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-2 rounded-full bg-green-400 flex-1" />
          <div className="h-2 rounded-full bg-blue-500 flex-1" />
          <span className="text-xs text-slate-400 font-bold ml-1">2/2</span>
        </div>

        {/* Account summary (read-only) */}
        <div className="mb-5 p-3 bg-green-50 border border-green-100 rounded-2xl">
          <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-2 flex items-center gap-1">
            <span>✓</span> ข้อมูลบัญชี (เสร็จแล้ว)
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-600">
            <span>👤 {account.name}</span>
            <span className="text-slate-400">@{account.username}</span>
            {account.email && <span className="text-slate-400">{account.email}</span>}
          </div>
        </div>

        {/* Office Info */}
        <div className="mb-5">
          <div className="text-xs font-bold text-blue-700 mb-4 flex items-center gap-1">
            🏢 ข้อมูลสำนักงาน <span className="text-red-400 ml-1">(จำเป็น)</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className={lbl}>ชื่อสำนักงาน *</label>
              <input
                value={form.officeName}
                onChange={e => setForm({ ...form, officeName: e.target.value })}
                className={inp}
                placeholder="เช่น สำนักงานที่ดินจังหวัดนครปฐม"
              />
            </div>
            <div>
              <label className={lbl}>ที่อยู่สำนักงาน *</label>
              <input
                value={form.officeAddress}
                onChange={e => setForm({ ...form, officeAddress: e.target.value })}
                className={inp}
                placeholder="เช่น เลขที่ 1 ถนนลำพยา ตำบลลำพยา อำเภอเมือง จ.นครปฐม"
              />
            </div>
            <div>
              <label className={lbl}>รหัสไปรษณีย์สำนักงาน</label>
              <input
                value={form.officeZip}
                onChange={e => setForm({ ...form, officeZip: e.target.value })}
                className={inp}
                placeholder="เช่น 73000"
                maxLength={5}
              />
            </div>
            <div>
              <label className={lbl}>เลขใบอนุญาต (ชำระค่าฝากส่งรายเดือน)</label>
              <input
                value={form.licenseNo}
                onChange={e => setForm({ ...form, licenseNo: e.target.value })}
                className={inp}
                placeholder="เช่น 12/2524"
              />
            </div>
            <div>
              <label className={lbl}>ฝากส่งไปรษณีย์</label>
              <input
                value={form.postName}
                onChange={e => setForm({ ...form, postName: e.target.value })}
                className={inp}
                placeholder="เช่น ไปรษณีย์สนามจันทร์"
              />
            </div>
          </div>
        </div>

        {/* CAPTCHA */}
        <div className="mb-4">
          <MathCaptcha onVerify={setCaptchaOk} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !captchaOk}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-blue-700 transition-all"
        >
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />กำลังสมัคร...</>
            : <>✓ สมัครสมาชิก</>
          }
        </button>

        <p className="text-center text-[10px] text-slate-400 mt-3">หลังสมัครต้องรอผู้ดูแลอนุมัติก่อน</p>

        <div className="text-center mt-3">
          <a href="/" className="text-xs text-slate-400 hover:text-slate-600 font-bold">← ย้อนกลับหน้าสมัครสมาชิก</a>
        </div>
      </div>
    </div>
  )
}

export default function OfficeInfoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">กำลังโหลด...</div>}>
      <OfficeInfoForm />
    </Suspense>
  )
}
