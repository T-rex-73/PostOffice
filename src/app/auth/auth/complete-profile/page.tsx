'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function CompleteProfileForm() {
  const params = useSearchParams()
  const router = useRouter()
  const email = params.get('email') || ''
  const googleName = params.get('name') || ''

  const [form, setForm] = useState({
    name: googleName,
    officeName: '', officeAddress: '', officeZip: '',
    licenseNo: '', postName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const lbl = 'block text-xs font-bold text-slate-500 mb-1'
  const inp = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

  const handleSubmit = async () => {
    if (!form.name || !form.officeName || !form.officeAddress) {
      setError('กรุณากรอกข้อมูลให้ครบ'); return
    }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGoogleUser: true,
          googleEmail: email,
          name: form.name,
          officeName: form.officeName,
          officeAddress: form.officeAddress,
          officeZip: form.officeZip,
          licenseNo: form.licenseNo,
          postName: form.postName,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      // สำเร็จ — redirect กลับ home พร้อมข้อความ
      router.push('/?google_registered=1')
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fadeIn" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg width="32" height="32" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.5 1.2 8.9 3.2l6.6-6.6C35.5 2.5 30.1 0 24 0 14.7 0 6.8 5.4 2.9 13.3l7.7 6C12.4 13.5 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z" />
              <path fill="#FBBC05" d="M10.6 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.7-6C1.1 16.5 0 20.1 0 24s1.1 7.5 2.9 10.7l7.7-6z" />
              <path fill="#34A853" d="M24 48c6.1 0 11.2-2 14.9-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.4 2.2-6.3 0-11.6-4.2-13.4-9.9l-7.7 6C6.8 42.6 14.7 48 24 48z" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-800">ลงทะเบียนด้วย Google</h1>
          <p className="text-sm text-slate-400 mt-1">กรุณากรอกข้อมูลสำนักงานเพื่อสมัครสมาชิก</p>
          <div className="mt-2 px-3 py-1.5 bg-blue-50 rounded-xl inline-flex items-center gap-2 text-xs text-blue-600 font-bold">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
            {email}
          </div>
        </div>

        {/* ข้อมูลบัญชี */}
        <div className="mb-5 pb-5 border-b border-slate-100">
          <div className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1">
            <span>👤</span> ข้อมูลบัญชี
          </div>
          <div>
            <label className={lbl}>ชื่อ-นามสกุล *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className={inp} placeholder="ชื่อเต็ม" />
          </div>
        </div>

        {/* ข้อมูลสำนักงาน */}
        <div className="mb-5">
          <div className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1">
            <span>🏢</span> ข้อมูลสำนักงาน <span className="text-red-400">(จำเป็น)</span>
          </div>
          <div className="space-y-3">
            <div>
              <label className={lbl}>ชื่อสำนักงาน *</label>
              <input value={form.officeName} onChange={e => setForm({ ...form, officeName: e.target.value })}
                className={inp} placeholder="เช่น สำนักงานที่ดินจังหวัดนครปฐม" />
            </div>
            <div>
              <label className={lbl}>ที่อยู่สำนักงาน *</label>
              <input value={form.officeAddress} onChange={e => setForm({ ...form, officeAddress: e.target.value })}
                className={inp} placeholder="เช่น เลขที่ 1 ถนนลำพยา ตำบลลำพยา อำเภอเมือง จ.นครปฐม" />
            </div>
            <div>
              <label className={lbl}>รหัสไปรษณีย์สำนักงาน</label>
              <input value={form.officeZip} onChange={e => setForm({ ...form, officeZip: e.target.value })}
                className={inp} placeholder="เช่น 73000" maxLength={5} />
            </div>
            <div>
              <label className={lbl}>เลขใบอนุญาต (ชำระค่าฝากส่งรายเดือน)</label>
              <input value={form.licenseNo} onChange={e => setForm({ ...form, licenseNo: e.target.value })}
                className={inp} placeholder="เช่น 12/2524" />
            </div>
            <div>
              <label className={lbl}>ฝากส่งไปรษณีย์</label>
              <input value={form.postName} onChange={e => setForm({ ...form, postName: e.target.value })}
                className={inp} placeholder="เช่น ไปรษณีย์สนามจันทร์" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-blue-700 transition-all">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>กำลังสมัคร...</>
            : <>✓ สมัครสมาชิก</>
          }
        </button>
        <p className="text-center text-[10px] text-slate-400 mt-3">หลังสมัครต้องรอผู้ดูแลอนุมัติก่อน</p>
        <div className="text-center mt-3">
          <a href="/" className="text-xs text-slate-400 hover:text-slate-600 font-bold">← ย้อนกลับ</a>
        </div>
      </div>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">กำลังโหลด...</div>}>
      <CompleteProfileForm />
    </Suspense>
  )
}
