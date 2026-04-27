'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import { calcCheckDigit } from '@/lib/utils'

const REMEMBER_KEY = 'thpost_remember'
const SESSION_KEY  = 'thpost_session'
const PAGE_KEY     = 'thpost_page'
const htmlDateToThai = (s: string) => { if (!s) return ''; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}` }

type SessionUser = {
  name: string; username: string; role: 'global_admin' | 'admin' | 'user'; approved: boolean
  office_name: string; office_address: string; license_no: string; post_name: string
}
// helper: role ที่มีสิทธิ์ดูแลระบบ
const canManage = (role: string) => role === 'global_admin' || role === 'admin'
type ToastItem = { id: number; message: string; type: string }
type RecordRow = Record<string, string>

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl font-bold text-white text-sm animate-fadeIn
          ${t.type==='success'?'bg-success':t.type==='error'?'bg-primary':'bg-info'}`}>
          <span className="material-icons text-base">{t.type==='success'?'check_circle':t.type==='error'?'error':'info'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ── Auth Page ─────────────────────────────────────────────────────────────────

function AuthPage({ onLogin, addToast }: { onLogin:(u:SessionUser)=>void; addToast:(m:string,t?:string)=>void }) {
  const [tab,setTab]=useState<'login'|'register'>('login')
  const [lf,setLf]=useState({username:'',password:''})
  const [showPw,setShowPw]=useState(false)
  const [rm,setRm]=useState(false)
  const [rf,setRf]=useState({name:'',username:'',email:'',password:'',confirm:''})
  const [showRPw,setShowRPw]=useState(false)
  const [showRCf,setShowRCf]=useState(false)
  const [loading,setLoading]=useState(false)
  // Email login mode (vs username)
  const [loginMode,setLoginMode]=useState<'username'|'email'>('username')

  useEffect(()=>{ try{ const s=localStorage.getItem(REMEMBER_KEY); if(s){const p=JSON.parse(s);setLf({username:p.username||'',password:p.password||''});setRm(true)} }catch{} },[])

  useEffect(()=>{
    if(typeof window==='undefined')return
    const params=new URLSearchParams(window.location.search)
    const registered=params.get('registered')
    if(registered){
      addToast('สมัครสมาชิกสำเร็จ! รอการอนุมัติจากผู้ดูแลระบบ','success')
      setTab('login')
      window.history.replaceState({},'',window.location.pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const handleLogin=async()=>{
    if(!lf.username||!lf.password){addToast('กรุณากรอกข้อมูลให้ครบ','error');return}
    setLoading(true)
    try{
      const res=await api.login(lf.username,lf.password,loginMode)
      setLoading(false)
      if(res.error){addToast(res.error,'error');return}
      if(!res.approved){addToast('บัญชีของคุณรอการอนุมัติจากผู้ดูแลระบบ','warning');return}
      try{ if(rm)localStorage.setItem(REMEMBER_KEY,JSON.stringify(lf)); else localStorage.removeItem(REMEMBER_KEY) }catch{}
      onLogin(res); addToast('ยินดีต้อนรับ '+res.name,'success')
    }catch{setLoading(false);addToast('เกิดข้อผิดพลาด','error')}
  }

  const handleRegister=async()=>{
    if(!rf.name||!rf.username||!rf.password){addToast('กรุณากรอกข้อมูลให้ครบ','error');return}
    if(rf.password!==rf.confirm){addToast('รหัสผ่านไม่ตรงกัน','error');return}
    if(rf.password.length<6){addToast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร','error');return}
    setLoading(true)
    try{
      // Step 1: check username/email uniqueness via pre-registration
      const res=await api.registerStep1(rf.name,rf.username,rf.password,rf.email)
      setLoading(false)
      if(res.error){addToast(res.error,'error');return}
      // Step 2: store account data in sessionStorage (avoids putting password in URL), then redirect
      try{sessionStorage.setItem('reg_pending',JSON.stringify({name:rf.name,username:rf.username,password:rf.password,email:rf.email}))}catch{}
      window.location.href='/auth/office-info'
    }catch{setLoading(false);addToast('เกิดข้อผิดพลาด','error')}
  }

  const lbl='block text-xs font-bold text-slate-500 mb-1'
  return (
    <div className="auth-overlay">
      <div className="auth-card animate-fadeIn" style={{maxHeight:'90vh',overflowY:'auto'}}>
        {/* Logo */}
        <div className="text-center mb-5">
          <img src="/logo.png" alt="PostOffice Logo" className="w-24 h-24 mx-auto mb-3 rounded-full shadow-lg object-cover"/>
          <span className="text-primary font-black text-2xl font-display leading-none">PostOffice</span>
          <div className="text-[9px] text-secondary font-bold tracking-widest uppercase mt-1">ระบบบริหารจัดการงานไปรษณีย์</div>
        </div>
        <div className="flex rounded-xl overflow-hidden mb-5 p-1 bg-slate-100">
          <button onClick={()=>setTab('login')}    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab==='login'?'tab-active':'tab-inactive'}`}>เข้าสู่ระบบ</button>
          <button onClick={()=>setTab('register')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab==='register'?'tab-active':'tab-inactive'}`}>สมัครสมาชิก</button>
        </div>

        {tab==='login'?(
          <div className="space-y-4">
            {/* Login Mode Toggle */}
            <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button type="button" onClick={()=>setLoginMode('username')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${loginMode==='username'?'bg-white shadow text-secondary':'text-slate-400'}`}><span className="material-icons text-xs">person</span>ชื่อผู้ใช้</button>
              <button type="button" onClick={()=>setLoginMode('email')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-all ${loginMode==='email'?'bg-white shadow text-secondary':'text-slate-400'}`}><span className="material-icons text-xs">email</span>อีเมล</button>
            </div>
            <div><label className={lbl}>{loginMode==='email'?'อีเมล':'ชื่อผู้ใช้'}</label>
              <input value={lf.username} onChange={e=>setLf({...lf,username:e.target.value})} onKeyDown={e=>e.key==='Enter'&&handleLogin()} className="input-style text-sm" placeholder={loginMode==='email'?'email@example.com':'username'} autoComplete={loginMode==='email'?'email':'username'} type={loginMode==='email'?'email':'text'}/>
            </div>
            <div><label className={lbl}>รหัสผ่าน</label>
              <div className="pw-wrap">
                <input type={showPw?'text':'password'} value={lf.password} onChange={e=>setLf({...lf,password:e.target.value})} onKeyDown={e=>e.key==='Enter'&&handleLogin()} className="input-style text-sm" placeholder="••••••••" autoComplete="current-password"/>
                <button type="button" className="pw-eye" onClick={()=>setShowPw(!showPw)} tabIndex={-1}><span className="material-icons text-base">{showPw?'visibility_off':'visibility'}</span></button>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none" onClick={()=>setRm(v=>!v)}>
                <div className="toggle-track" style={{background:rm?'#002B5B':'#cbd5e1'}}><div className="toggle-thumb" style={{transform:rm?'translateX(16px)':'translateX(0)'}}/></div>
                <span className="text-xs font-bold text-slate-500">จดจำรหัสผ่าน</span>
              </label>
            </div>
            <button onClick={handleLogin} disabled={loading} className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 mt-2">
              {loading?<><div className="spinner"></div>กำลังเข้าสู่ระบบ...</>:<><span className="material-icons text-base">login</span>เข้าสู่ระบบ</>}
            </button>
          </div>
        ):(
          <div className="space-y-4">
            <div className="pb-4 border-b border-slate-100">
              <div className="text-xs font-bold text-secondary mb-3 flex items-center gap-1"><span className="material-icons text-xs">person</span>ข้อมูลบัญชี</div>
              <div className="space-y-3">
                <div><label className={lbl}>ชื่อ-นามสกุล</label><input value={rf.name} onChange={e=>setRf({...rf,name:e.target.value})} className="input-style text-sm" placeholder="ชื่อเต็ม"/></div>
                <div><label className={lbl}>ชื่อผู้ใช้</label><input value={rf.username} onChange={e=>setRf({...rf,username:e.target.value})} className="input-style text-sm" placeholder="username (ภาษาอังกฤษ)" autoComplete="username"/></div>
                <div><label className={lbl}>อีเมล <span className="font-normal text-slate-400">(ไม่บังคับ)</span></label><input type="email" value={rf.email} onChange={e=>setRf({...rf,email:e.target.value})} className="input-style text-sm" placeholder="email@example.com" autoComplete="email"/></div>
                <div><label className={lbl}>รหัสผ่าน</label>
                  <div className="pw-wrap"><input type={showRPw?'text':'password'} value={rf.password} onChange={e=>setRf({...rf,password:e.target.value})} className="input-style text-sm" placeholder="อย่างน้อย 6 ตัวอักษร" autoComplete="new-password"/>
                    <button type="button" className="pw-eye" onClick={()=>setShowRPw(!showRPw)} tabIndex={-1}><span className="material-icons text-base">{showRPw?'visibility_off':'visibility'}</span></button></div>
                </div>
                <div><label className={lbl}>ยืนยันรหัสผ่าน</label>
                  <div className="pw-wrap"><input type={showRCf?'text':'password'} value={rf.confirm} onChange={e=>setRf({...rf,confirm:e.target.value})} onKeyDown={e=>e.key==='Enter'&&handleRegister()} className="input-style text-sm" placeholder="••••••••" autoComplete="new-password"/>
                    <button type="button" className="pw-eye" onClick={()=>setShowRCf(!showRCf)} tabIndex={-1}><span className="material-icons text-base">{showRCf?'visibility_off':'visibility'}</span></button></div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <span className="material-icons text-sm mt-0.5">info</span>
              <span>ขั้นตอนถัดไป: หลังกรอกข้อมูลบัญชี คุณจะถูกพาไปกรอก <strong>ข้อมูลสำนักงาน</strong> ในหน้าถัดไป</span>
            </div>
            <button onClick={handleRegister} disabled={loading} className="w-full bg-secondary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
              {loading?<><div className="spinner"></div>กำลังตรวจสอบ...</>:<><span className="material-icons text-base">arrow_forward</span>ถัดไป: กรอกข้อมูลสำนักงาน</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
function AdminPanel({ currentUser, addToast, onClose }:{ currentUser:SessionUser; addToast:(m:string,t?:string)=>void; onClose:()=>void }) {
  const [users,setUsers]=useState<any[]>([])
  const [tab,setTab]=useState('users')
  const [editUser,setEditUser]=useState<any>(null)
  const [loading,setLoading]=useState(true)

  const refresh=useCallback(async()=>{
    setLoading(true)
    try{ const d=await api.getUsers(currentUser); setUsers(d||[]) }catch{addToast('โหลดผู้ใช้ไม่สำเร็จ','error')}
    setLoading(false)
  },[currentUser])

  useEffect(()=>{refresh()},[])

  const doAction=async(fn:()=>Promise<any>,msg:string)=>{
    try{ const r=await fn(); if(r.error){addToast(r.error,'error');return}; refresh();addToast(msg,'success') }
    catch{addToast('เกิดข้อผิดพลาด','error')}
  }

  const pending=users.filter(u=>!u.approved)
  return (
    <div className="fixed inset-0 bg-black/50 z-[9000] flex items-start justify-center pt-10 px-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl mb-10 animate-fadeIn overflow-hidden">
        <div className="bg-secondary text-white p-6 flex justify-between items-center">
          <div><h2 className="text-xl font-bold font-display flex items-center gap-2"><span className="material-icons">admin_panel_settings</span>แผงผู้ดูแลระบบ</h2>
            <p className="text-blue-200 text-xs mt-1">จัดการผู้ใช้งานและสิทธิ์เข้าถึง</p></div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><span className="material-icons">close</span></button>
        </div>
        <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          {[{key:'users',label:'ผู้ใช้ทั้งหมด',icon:'people',count:users.length},{key:'pending',label:'รออนุมัติ',icon:'pending',count:pending.length}].map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${tab===t.key?'border-primary text-primary':'border-transparent text-slate-400'}`}>
              <span className="material-icons text-base">{t.icon}</span>{t.label}
              {t.count>0&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${t.key==='pending'&&t.count>0?'bg-primary text-white':'bg-slate-200 text-slate-600'}`}>{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="p-6">
          {loading&&<div className="text-center py-10 text-slate-400"><div className="spinner" style={{borderTopColor:'#94a3b8',borderColor:'rgba(148,163,184,.3)',margin:'0 auto 8px'}}></div>โหลดข้อมูล...</div>}
          {!loading&&tab==='pending'&&(
            <div>{pending.length===0?<div className="text-center py-10 text-slate-400"><span className="material-icons text-4xl block mb-2">check_circle</span>ไม่มีรายการรออนุมัติ</div>:
              <div className="space-y-3">{pending.map(u=>(
                <div key={u.username} className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 rounded-2xl">
                  <div><p className="font-bold text-slate-800 dark:text-white">{u.name}</p>
                    <p className="text-xs text-slate-400">@{u.username}{u.office_name&&` · ${u.office_name}`}</p></div>
                  <div className="flex gap-2">
                    <button onClick={()=>doAction(()=>api.approveUser(u.username,currentUser),'อนุมัติผู้ใช้แล้ว')} className="flex items-center gap-1 px-4 py-2 bg-success text-white text-xs font-bold rounded-xl"><span className="material-icons text-xs">check</span>อนุมัติ</button>
                    <button onClick={()=>{if(confirm('ยืนยันลบ?'))doAction(()=>api.deleteUser(u.username,currentUser),'ลบผู้ใช้แล้ว')}} className="flex items-center gap-1 px-3 py-2 bg-primary text-white text-xs font-bold rounded-xl"><span className="material-icons text-xs">delete</span></button>
                  </div>
                </div>
              ))}</div>}
            </div>
          )}
          {!loading&&tab==='users'&&(
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 text-[10px] uppercase font-bold">
                <tr><th className="px-4 py-3 text-left">ชื่อ / ผู้ใช้</th><th className="px-4 py-3">สำนักงาน</th><th className="px-4 py-3">บทบาท</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">จัดการ</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {users.map(u=>(
                  <tr key={u.username} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3"><div className="font-bold text-slate-800 dark:text-white">{u.name}</div><div className="text-xs text-slate-400 font-mono">@{u.username}</div></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.office_name||'-'}</td>
                    <td className="px-4 py-3 text-center">
                      {u.role==='global_admin'?<span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">global admin</span>:
                        <select value={u.role} onChange={e=>doAction(()=>api.changeUserRole(u.username,e.target.value,currentUser),'เปลี่ยนบทบาทแล้ว')} className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 bg-white dark:bg-slate-700 dark:text-white">
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          {currentUser.role==='global_admin'&&<option value="global_admin">global admin</option>}
                        </select>}
                    </td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 text-[10px] font-bold rounded-full ${u.approved?'bg-green-100 text-success':'bg-yellow-100 text-warning'}`}>{u.approved?'อนุมัติแล้ว':'รออนุมัติ'}</span></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={()=>setEditUser({...u})} className="p-1.5 hover:bg-blue-50 text-blue-400 rounded-lg" title="แก้ไข"><span className="material-icons text-sm">edit</span></button>
                        {u.approved?<button onClick={()=>doAction(()=>api.revokeUser(u.username,currentUser),'ระงับผู้ใช้แล้ว')} className="p-1.5 hover:bg-yellow-50 text-warning rounded-lg"><span className="material-icons text-sm">block</span></button>:
                          <button onClick={()=>doAction(()=>api.approveUser(u.username,currentUser),'อนุมัติผู้ใช้แล้ว')} className="p-1.5 hover:bg-green-50 text-success rounded-lg"><span className="material-icons text-sm">check_circle</span></button>}
                        {u.username!=='admin'&&<button onClick={()=>{if(confirm('ยืนยันลบผู้ใช้ '+u.username+'?'))doAction(()=>api.deleteUser(u.username,currentUser),'ลบผู้ใช้แล้ว')}} className="p-1.5 hover:bg-red-50 text-primary rounded-lg"><span className="material-icons text-sm">delete</span></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
      {editUser&&(
        <div className="fixed inset-0 bg-black/60 z-[9100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fadeIn">
            <h3 className="font-bold text-secondary dark:text-white mb-4 font-display">แก้ไขข้อมูลผู้ใช้</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-bold text-slate-400 mb-1 block">ชื่อ-นามสกุล</label><input value={editUser.name} onChange={e=>setEditUser({...editUser,name:e.target.value})} className="input-style text-sm"/></div>
              <div><label className="text-xs font-bold text-slate-400 mb-1 block">รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label><input type="password" placeholder="••••••••" onChange={e=>setEditUser({...editUser,_newPw:e.target.value})} className="input-style text-sm"/></div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={()=>setEditUser(null)} className="px-4 py-2 text-sm font-bold text-slate-400 border border-slate-200 dark:border-slate-600 rounded-xl">ยกเลิก</button>
              <button onClick={()=>doAction(()=>api.editUser(editUser.username,editUser.name,editUser._newPw||'',currentUser),'แก้ไขข้อมูลแล้ว').then(()=>setEditUser(null))} className="px-4 py-2 text-sm font-bold bg-secondary text-white rounded-xl">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────
function Header({ setPage, darkMode, setDarkMode, currentUser, onLogout, onAdminPanel }:any) {
  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 sticky top-0 z-50 h-20 flex items-center shadow-sm">
      <div className="max-w-7xl mx-auto px-4 w-full flex justify-between items-center">
        <div className="flex items-center cursor-pointer gap-4" onClick={()=>setPage('home')}>
          <img src="/logo.png" alt="PostOffice" className="w-14 h-14 rounded-full object-cover shadow"/>
          <div className="flex flex-col border-r border-slate-200 pr-4">
            <span className="text-primary font-bold text-lg leading-none font-display">PostOffice</span>
            <span className="text-[9px] text-secondary dark:text-blue-400 font-semibold tracking-widest uppercase">ระบบบริหารจัดการงานไปรษณีย์</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-1">
            {[{key:'register',icon:'edit_note',label:'ลงทะเบียน'},{key:'queue',icon:'print',label:'พิมพ์ / ติดตาม'},{key:'track',icon:'search',label:'ค้นหา'}].map(item=>(
              <button key={item.key} onClick={()=>setPage(item.key)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-secondary transition-all">
                <span className="material-icons text-sm">{item.icon}</span>{item.label}
              </button>
            ))}
            {/* LINE Chat Button */}
            <a href="https://line.me/R/ti/p/@815cmnav" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all" style={{background:'#06C755'}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
              LINE
            </a>
          </nav>
          {canManage(currentUser?.role||'')&&<button onClick={onAdminPanel} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-primary hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-red-100 dark:border-red-800"><span className="material-icons text-sm">admin_panel_settings</span>{currentUser?.role==='global_admin'?'Global Admin':'Admin'}</button>}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-full border border-slate-100 dark:border-slate-600">
            <span className="material-icons text-slate-400 text-sm">person</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 max-w-[80px] truncate">{currentUser?.name}</span>
          </div>
          <button onClick={onLogout} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-slate-400 hover:text-primary"><span className="material-icons text-base">logout</span></button>
          <button onClick={()=>setDarkMode(!darkMode)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"><span className="material-icons text-slate-400 text-base">{darkMode?'light_mode':'dark_mode'}</span></button>
        </div>
      </div>
    </header>
  )
}

// ── Home Page ─────────────────────────────────────────────────────────────────
function HomePage({ setPage }:{ setPage:(p:string)=>void }) {
  return (
    <div className="animate-fadeIn py-16 text-center max-w-5xl mx-auto px-4">
      <div className="flex flex-col items-center mb-8">
        <img src="/logo.png" alt="PostOffice" className="w-24 h-24 rounded-full shadow-xl mb-4 object-cover"/>
        <h2 className="text-4xl font-extrabold text-secondary dark:text-white mb-2 font-display">ระบบบริหารจัดการงานไปรษณีย์</h2>
        <p className="text-slate-400">สำนักงานที่ดินจังหวัดนครปฐม</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[{page:'register',icon:'edit_note',bg:'bg-red-50',ic:'text-primary',btn:'bg-primary',label:'ลงทะเบียนหนังสือ'},
          {page:'queue',icon:'print',bg:'bg-blue-50',ic:'text-secondary',btn:'bg-secondary',label:'พิมพ์ / ติดตาม'},
          {page:'track',icon:'search',bg:'bg-green-50',ic:'text-success',btn:'bg-success',label:'ค้นหาหนังสือ'}].map(item=>(
          <div key={item.page} onClick={()=>setPage(item.page)} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-50 dark:border-slate-700 cursor-pointer hover:scale-[1.02] transition-all">
            <div className={`w-20 h-20 ${item.bg} rounded-full flex items-center justify-center mx-auto mb-6`}><span className={`material-icons ${item.ic} text-4xl`}>{item.icon}</span></div>
            <h3 className="text-xl font-bold text-secondary dark:text-white mb-6 font-display">{item.label}</h3>
            <div className={`${item.btn} text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm`}><span className="material-icons text-base">arrow_forward</span>เข้าใช้งาน</div>
          </div>
        ))}
      </div>
      {/* LINE Button on Home */}
      <a href="https://line.me/R/ti/p/@815cmnav" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:opacity-90" style={{background:'#06C755'}}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
        สอบถามผ่าน LINE
      </a>
    </div>
  )
}

// ── Address Dropdowns ─────────────────────────────────────────────────────────
function AddressDropdowns({ locations, form, setForm, disabled }:any) {
  const provinces    = useMemo(() => Array.from(new Set<string>(locations.map((l:any)=>l.province?.trim()).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,'th')), [locations])
  const districts    = useMemo(() => Array.from(new Set<string>(locations.filter((l:any)=>l.province?.trim()===form.Province).map((l:any)=>l.district?.trim()).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,'th')), [locations,form.Province])
  const subDistricts = useMemo(() => Array.from(new Set<string>(locations.filter((l:any)=>l.province?.trim()===form.Province&&l.district?.trim()===form.District).map((l:any)=>l.subDistrict?.trim()).filter(Boolean) as string[])).sort((a,b)=>a.localeCompare(b,'th')), [locations,form.Province,form.District])

  // เมื่อ SubDistrict เปลี่ยน ให้ดึง zip จาก locations
  useEffect(()=>{
    if(!form.SubDistrict)return
    const loc=locations.find((l:any)=>l.province?.trim()===form.Province&&l.district?.trim()===form.District&&l.subDistrict?.trim()===form.SubDistrict)
    if(loc)setForm((p:any)=>({...p,Zip:String(loc.zipCode)}))
  },[form.SubDistrict])

  // เพิ่ม option ที่มีค่าจาก land_office แม้ไม่อยู่ใน list (เช่น district ที่ยังไม่ match)
  const districtOpts = useMemo(()=>{
    const opts = [...districts]
    if(form.District && !opts.includes(form.District)) opts.unshift(form.District)
    return opts
  },[districts, form.District])
  const subDistrictOpts = useMemo(()=>{
    const opts = [...subDistricts]
    if(form.SubDistrict && !opts.includes(form.SubDistrict)) opts.unshift(form.SubDistrict)
    return opts
  },[subDistricts, form.SubDistrict])

  const lbl='block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  const selCls=`input-style text-sm ${disabled?'disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed opacity-70':''}`
  return (
    <div className="space-y-3">
      <div><label className={lbl}>จังหวัด</label>
        <select value={form.Province}
          onChange={e=>setForm((p:any)=>({...p,Province:e.target.value,District:'',SubDistrict:'',Zip:''}))}
          disabled={disabled} className={selCls}>
          <option value="">— เลือกจังหวัด —</option>
          {provinces.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div><label className={lbl}>อำเภอ</label>
        <select value={form.District}
          onChange={e=>setForm((p:any)=>({...p,District:e.target.value,SubDistrict:'',Zip:''}))}
          disabled={disabled||!form.Province} className={selCls}>
          <option value="">— เลือกอำเภอ —</option>
          {districtOpts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div><label className={lbl}>ตำบล</label>
        <select value={form.SubDistrict}
          onChange={e=>setForm((p:any)=>({...p,SubDistrict:e.target.value}))}
          disabled={disabled||!form.District} className={selCls}>
          <option value="">— เลือกตำบล —</option>
          {subDistrictOpts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div><label className={lbl}>รหัสไปรษณีย์</label>
        <input value={form.Zip} onChange={e=>setForm((p:any)=>({...p,Zip:e.target.value}))} disabled={disabled}
          className={`input-style text-sm font-mono tracking-widest ${disabled?'disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed opacity-70':''}`} placeholder="xxxxx"/>
      </div>
    </div>
  )
}

// ── Land Office + History Autocomplete ───────────────────────────────────────
function LandOfficeAutocomplete({ value, onChange, onSelect, onSelectHistory, disabled, currentUser }:any) {
  const [landSuggestions,setLandSuggestions]=useState<any[]>([])
  const [historySuggestions,setHistorySuggestions]=useState<any[]>([])
  const [show,setShow]=useState(false)
  const [timer,setTimer]=useState<any>(null)
  const wrapRef=useRef<HTMLDivElement>(null)

  useEffect(()=>{
    const handler=(e:MouseEvent)=>{ if(wrapRef.current&&!wrapRef.current.contains(e.target as Node))setShow(false) }
    document.addEventListener('mousedown',handler)
    return()=>document.removeEventListener('mousedown',handler)
  },[])

  const handleChange=(v:string)=>{
    onChange(v)
    if(timer)clearTimeout(timer)
    if(!v.trim()){setLandSuggestions([]);setHistorySuggestions([]);setShow(false);return}
    const t=setTimeout(async()=>{
      try{
        const [landData,histData]=await Promise.allSettled([
          api.searchLandOffices(v),
          api.searchRecord(v, currentUser?.username||'', currentUser?.role||'user', currentUser?.office_name||''),
        ])
        const lands=landData.status==='fulfilled'&&Array.isArray(landData.value)?landData.value:[]
        // deduplicate history by department name
        const rawHist=histData.status==='fulfilled'&&Array.isArray(histData.value)?histData.value:[]
        const seen=new Set<string>()
        const hist=rawHist.filter((r:any)=>{
          const dept=r['__ถึง']||''
          if(!dept||seen.has(dept))return false
          seen.add(dept); return true
        })
        setLandSuggestions(lands)
        setHistorySuggestions(hist)
        setShow(lands.length>0||hist.length>0)
      }catch{}
    },250)
    setTimer(t)
  }

  const pickLand=(item:any)=>{ onSelect(item); setLandSuggestions([]); setHistorySuggestions([]); setShow(false) }
  const pickHistory=(r:any)=>{ onSelectHistory(r); setLandSuggestions([]); setHistorySuggestions([]); setShow(false) }

  const hasAny=landSuggestions.length>0||historySuggestions.length>0

  return (
    <div ref={wrapRef} className="relative">
      <input value={value} onChange={e=>handleChange(e.target.value)} onFocus={()=>{ if(hasAny)setShow(true) }}
        disabled={disabled} className="input-style text-sm" placeholder="พิมพ์ชื่อสำนักงานที่ดิน หรือชื่อหน่วยงาน..." autoComplete="off"/>
      {show&&hasAny&&(
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl max-h-72 overflow-y-auto">
          {/* ── ประวัติจาก records ── */}
          {historySuggestions.length>0&&(
            <>
              <div className="px-4 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 flex items-center gap-1">
                <span className="material-icons text-xs">history</span>เคยส่งแล้ว
              </div>
              {historySuggestions.slice(0,5).map((r:any,i:number)=>(
                <button key={'h'+i} type="button" onClick={()=>pickHistory(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-slate-700 text-xs border-b border-slate-50 dark:border-slate-700 last:border-0">
                  <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                    <span className="material-icons text-xs text-amber-500">bookmark</span>
                    {r['__ถึง']}
                  </div>
                  <div className="text-slate-400 pl-4">
                    {[r['__ที่'],r['__ตำบล']&&`ต.${r['__ตำบล']}`,r['__อำเภอ'],r['__จังหวัด'],r['__รหัสไปรษณีย์']].filter(Boolean).join(' ')}
                  </div>
                </button>
              ))}
            </>
          )}
          {/* ── สำนักงานที่ดิน ── */}
          {landSuggestions.length>0&&(
            <>
              <div className="px-4 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 flex items-center gap-1">
                <span className="material-icons text-xs">business</span>สำนักงานที่ดิน
              </div>
              {landSuggestions.map((item:any,i:number)=>(
                <button key={'l'+i} type="button" onClick={()=>pickLand(item)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-slate-700 text-xs border-b border-slate-50 dark:border-slate-700 last:border-0">
                  <div className="font-bold text-slate-800 dark:text-white">{item.office_name}</div>
                  <div className="text-slate-400">{item.address} ต.{item.sub_district} {item.district} จ.{item.province} {item.zip}</div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Register Page ─────────────────────────────────────────────────────────────
const EMPTY_FORM={Type:'ธรรมดา',BookNo:'',Recipient:'',Department:'',Address:'',SubDistrict:'',District:'',Province:'',Zip:'',Owner:'',Quantity:1}

function RegisterPage({ setPage, locations, refresh, addToast, currentUser }:any) {
  const [form,setForm]=useState<any>({...EMPTY_FORM})
  const [loading,setLoading]=useState(false)
  const [locked,setLocked]=useState(false)
  const [editMode,setEditMode]=useState(false)
  const [savedId,setSavedId]=useState<number|null>(null)
  const [excelLoading,setExcelLoading]=useState(false)
  const fileRef=useRef<HTMLInputElement>(null)

  const isDisabled=locked&&!editMode

  // load past record by department to autofill address fields
  const fillFromHistory=useCallback(async(dept:string)=>{
    if(!dept||dept.trim().length<2)return
    try{
      const data=await api.searchRecord(dept.trim(),currentUser.username,currentUser.role,currentUser.office_name)
      if(Array.isArray(data)&&data.length>0){
        const r=data[0]
        // ดึงเฉพาะช่องที่ยังว่างอยู่ (ไม่ทับข้อมูลที่ผู้ใช้พิมพ์เอง)
        setForm((p:any)=>({
          ...p,
          Address:     p.Address     || r['__ที่']            || '',
          SubDistrict: p.SubDistrict || r['__ตำบล']          || '',
          District:    p.District    || r['__อำเภอ']         || '',
          Province:    p.Province    || r['__จังหวัด']       || '',
          Zip:         p.Zip         || r['__รหัสไปรษณีย์'] || '',
        }))
      }
    }catch{}
  },[currentUser])

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    if(!form.BookNo.trim()){addToast('กรุณากรอกเลขที่หนังสือ','error');return}
    setLoading(true)
    try{
      if(editMode&&savedId){
        const res=await api.editRecord(savedId,{...form,BookNo:form.BookNo})
        if(res.success){setLocked(true);setEditMode(false);refresh();addToast('แก้ไขข้อมูลเรียบร้อย!','success')}
        else addToast(res.error||'เกิดข้อผิดพลาด','error')
      } else {
        const res=await api.saveRecord({...form,BookFullNo:form.BookNo,username:currentUser.username})
        if(res.success){
          setLocked(true)
          if(res.id)setSavedId(res.id)
          refresh()
          addToast('บันทึกเรียบร้อย!','success')
        } else addToast(res.error||'เกิดข้อผิดพลาด','error')
      }
    }catch{addToast('เกิดข้อผิดพลาด','error')}
    setLoading(false)
  }

  const handleNew=()=>{ setForm({...EMPTY_FORM}); setLocked(false); setEditMode(false); setSavedId(null) }
  const handleEdit=()=>setEditMode(true)

  const handleExcel=async(e:React.ChangeEvent<HTMLInputElement>)=>{
    const file=e.target.files?.[0]; if(!file)return
    setExcelLoading(true)
    try{
      const XLSX=await import('xlsx')
      const buf=await file.arrayBuffer()
      const wb=XLSX.read(buf,{type:'array'})
      const ws=wb.Sheets[wb.SheetNames[0]]
      const raw:any[]=XLSX.utils.sheet_to_json(ws,{defval:''})
      if(!raw.length){addToast('ไม่พบข้อมูลในไฟล์','error');setExcelLoading(false);return}
      const rows=raw.map(r=>({
        Recipient:   r['ชื่อผู้รับ']    ||r['recipient']   ||'',
        Department:  r['ถึง']           ||r['department']  ||'',
        Address:     r['ที่อยู่']        ||r['address']     ||'',
        SubDistrict: r['ตำบล']          ||r['sub_district']||'',
        District:    r['อำเภอ']         ||r['district']    ||'',
        Province:    r['จังหวัด']       ||r['province']    ||'',
        Zip:         String(r['รหัสไปรษณีย์']||r['zip']||''),
        Owner:       r['เจ้าของเรื่อง'] ||r['owner']       ||'',
        BookNo:      String(r['เลขที่หนังสือ']||r['book_no']||''),
        Quantity:    Number(r['จำนวน']  ||r['quantity']    ||1),
        Type:        r['ประเภท']        ||r['type']        ||'ธรรมดา',
      })).filter(r=>r.Recipient||r.BookNo)
      if(!rows.length){addToast('ไม่พบแถวข้อมูลที่ถูกต้อง — ตรวจสอบหัวตาราง Excel','error');setExcelLoading(false);return}
      const res=await api.saveBulkRecords(rows,currentUser.username)
      if(res.success){refresh();addToast(`นำเข้า ${res.count} รายการเรียบร้อย!`,'success')}
      else addToast(res.error||'เกิดข้อผิดพลาด','error')
    }catch(err){addToast('อ่านไฟล์ไม่ได้: '+String(err),'error')}
    setExcelLoading(false)
    if(fileRef.current)fileRef.current.value=''
  }

  const lbl='block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1'
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fadeIn">
      <button onClick={()=>setPage('home')} className="flex items-center gap-1 text-slate-400 hover:text-primary mb-5 font-bold text-sm"><span className="material-icons text-base">arrow_back</span>ย้อนกลับ</button>
      <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
        <h2 className="text-2xl font-bold text-secondary dark:text-white font-display flex items-center gap-2"><span className="material-icons text-primary">edit_note</span>ลงทะเบียนหนังสือ</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {locked&&(
            <>
              <button type="button" onClick={handleNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-secondary hover:opacity-90 transition-all">
                <span className="material-icons text-base">add_circle</span>เพิ่มใหม่
              </button>
              {!editMode&&(
                <button type="button" onClick={handleEdit} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-warning hover:opacity-90 transition-all">
                  <span className="material-icons text-base">edit</span>แก้ไข
                </button>
              )}
            </>
          )}
          <a href="/form-template.xlsx" download="ฟอร์มนำเข้าข้อมูล.xlsx" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-all cursor-pointer">
            <span className="material-icons text-base">download</span>ดาวน์โหลดฟอร์ม
          </a>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleExcel} className="hidden" id="excel-upload"/>
          <label htmlFor="excel-upload" className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all ${excelLoading?'bg-slate-400':'bg-success hover:opacity-90'}`}>
            {excelLoading?<><div className="spinner"></div>กำลังนำเข้า...</>:<><span className="material-icons text-base">upload_file</span>นำเข้า Excel</>}
          </label>
        </div>
      </div>

      {locked&&!editMode&&(
        <div className="mb-5 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl font-bold flex items-center gap-2 text-sm">
          <span className="material-icons text-base">lock</span>
          บันทึกเรียบร้อยแล้ว — กด <strong>เพิ่มใหม่</strong> เพื่อกรอกรายการถัดไป หรือ <strong>แก้ไข</strong> เพื่อแก้ไขข้อมูล
        </div>
      )}
      {editMode&&(
        <div className="mb-5 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-xl font-bold flex items-center gap-2 text-sm">
          <span className="material-icons text-base">edit_note</span>กำลังแก้ไขข้อมูล — บันทึกเมื่อแก้ไขเสร็จ
        </div>
      )}

      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
        <span className="material-icons text-sm mt-0.5">info</span>
        <span>ดาวน์โหลดฟอร์ม <strong>กรอกรายละเอียด</strong> ชื่อผู้รับ , ถึง , ที่อยู่ , ตำบล , อำเภอ , จังหวัด , รหัสไปรษณีย์ , เจ้าของเรื่อง , เลขที่หนังสือ , จำนวน , ประเภท  ลงในฟอร์มให้เรียบร้อยค่อยอัพโหลดไฟล์ excel</span>
      </div>

      <form onSubmit={submit} className="glass-card p-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-6 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase">ประเภท</span>
            <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-full flex">
              {['ธรรมดา','EMS'].map(t=>(
                <button key={t} type="button" disabled={isDisabled} onClick={()=>setForm({...form,Type:t})} className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${form.Type===t?'bg-white dark:bg-slate-700 text-secondary shadow-sm':'text-slate-400'} disabled:opacity-60`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">เลขที่หนังสือ</span>
            <input value={form.BookNo} onChange={e=>setForm({...form,BookNo:e.target.value})} disabled={isDisabled} className="input-style text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed" placeholder="เช่น นฐ 0020.1/1234" required/>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
          <div className="space-y-4">
            <div><label className={lbl}>ชื่อผู้รับ *</label>
              <input value={form.Recipient} onChange={e=>setForm({...form,Recipient:e.target.value})} disabled={isDisabled} className="input-style text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed" placeholder="ระบุชื่อ-นามสกุล" required/>
            </div>
            <div><label className={lbl}>ถึง (ตำแหน่ง/หน่วยงาน)</label>
              <LandOfficeAutocomplete
                value={form.Department}
                disabled={isDisabled}
                currentUser={currentUser}
                onChange={(v:string)=>{ setForm((p:any)=>({...p,Department:v})) }}
                onSelect={(item:any)=>{
                  setForm((p:any)=>({
                    ...p,
                    Department:  item.office_name,
                    Address:     item.address,
                    Province:    item.province,
                    District:    item.district,
                    SubDistrict: item.sub_district,
                    Zip:         item.zip,
                  }))
                }}
                onSelectHistory={(r:any)=>{
                  setForm((p:any)=>({
                    ...p,
                    Department:  r['__ถึง']           || p.Department,
                    Address:     r['__ที่']            || p.Address,
                    SubDistrict: r['__ตำบล']          || p.SubDistrict,
                    District:    r['__อำเภอ']         || p.District,
                    Province:    r['__จังหวัด']       || p.Province,
                    Zip:         r['__รหัสไปรษณีย์'] || p.Zip,
                  }))
                }}
              />
            </div>
            <div><label className={lbl}>บ้านเลขที่ / ที่อยู่</label>
              <input value={form.Address} onChange={e=>setForm({...form,Address:e.target.value})} disabled={isDisabled} className="input-style text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed" placeholder="ระบุที่อยู่"/>
            </div>
            <div><label className={lbl}>เจ้าของเรื่อง</label>
              <input value={form.Owner} onChange={e=>setForm({...form,Owner:e.target.value})} disabled={isDisabled} className="input-style text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed" placeholder="ชื่อเจ้าหน้าที่"/>
            </div>
            <div><label className={lbl}>จำนวน (ฉบับ)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={form.Quantity} onChange={e=>setForm({...form,Quantity:parseInt(e.target.value)})} disabled={isDisabled} className="w-20 input-style text-sm disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed" min={1}/>
                <span className="text-slate-400 text-sm font-bold">PSC.</span>
              </div>
            </div>
          </div>
          <AddressDropdowns locations={locations} form={form} setForm={setForm} disabled={isDisabled}/>
        </div>
        <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
          <button type="button" onClick={()=>setPage('home')} className="px-6 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-400">ยกเลิก</button>
          <div className="flex gap-3">
            {!isDisabled&&(
              <button type="submit" disabled={loading} className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-60">
                {loading?<><div className="spinner"></div>{editMode?'กำลังแก้ไข...':'บันทึก...'}</>:<><span className="material-icons text-base">{editMode?'save':'save'}</span>{editMode?'บันทึกการแก้ไข':'บันทึก'}</>}
              </button>
            )}
            <button type="button" onClick={()=>setPage('queue')} className="bg-success text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2">ถัดไป<span className="material-icons text-base">arrow_forward</span></button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ── Queue Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE=20
function QueuePage({ setPage, addToast, currentUser }:any) {
  const [showManual,setShowManual]=useState(false)
  const [dateFrom,setDateFrom]=useState('')
  const [dateTo,setDateTo]=useState('')
  const [ownerFilter,setOwnerFilter]=useState('')
  const [records,setRecords]=useState<RecordRow[]>([])
  const [loadingData,setLoadingData]=useState(false)
  const [selected,setSelected]=useState<Set<number>>(new Set())
  const [paperSize,setPaperSize]=useState('DL')
  const [trackingData,setTrackingData]=useState<Record<number,any>>({})
  const [trackPrefix,setTrackPrefix]=useState('ER')
  const [startNum,setStartNum]=useState('12340001')
  const [currentPage,setCurrentPage]=useState(1)
  const [tagFilter,setTagFilter]=useState('all')
  const [excelExporting,setExcelExporting]=useState(false)
  const [sortBy,setSortBy]=useState<string>('date_desc') // NEW: sort state
  const [deleting,setDeleting]=useState(false) // NEW: delete state
  const inputRefs=useRef<Record<number,HTMLInputElement>>({})

  const clearFilters=()=>{setDateFrom('');setDateTo('');setOwnerFilter('');setTagFilter('all')}

  const loadRecords=useCallback(async()=>{
    setLoadingData(true)
    try{
      const from=dateFrom?htmlDateToThai(dateFrom):''; const to=dateTo?htmlDateToThai(dateTo):''
      const data=await api.getRecords({from,to,owner:ownerFilter.trim(),username:currentUser.username,role:currentUser.role,officeName:currentUser.office_name})
      setRecords(Array.isArray(data)?data:[]);setSelected(new Set());setCurrentPage(1)
    }catch{addToast('โหลดข้อมูลไม่สำเร็จ','error')}
    setLoadingData(false)
  },[dateFrom,dateTo,ownerFilter,currentUser])

  useEffect(()=>{loadRecords()},[])
  useEffect(()=>{setCurrentPage(1);setSelected(new Set())},[tagFilter])

  const filteredRecords=useMemo(()=>{
    if(tagFilter==='all')return records
    if(tagFilter==='tagged')return records.filter(r=>!!r['__เลขแท็กER'])
    if(tagFilter==='untagged')return records.filter(r=>!r['__เลขแท็กER'])
    return records
  },[records,tagFilter])

  // NEW: sorted records
  const sortedRecords=useMemo(()=>{
    const arr=[...filteredRecords]
    switch(sortBy){
      case 'type_asc':  return arr.sort((a,b)=>(a['__ประเภท']||'').localeCompare(b['__ประเภท']||'','th'))
      case 'type_desc': return arr.sort((a,b)=>(b['__ประเภท']||'').localeCompare(a['__ประเภท']||'','th'))
      case 'owner_asc': return arr.sort((a,b)=>(a['__เจ้าของเรื่อง']||'').localeCompare(b['__เจ้าของเรื่อง']||'','th'))
      case 'owner_desc':return arr.sort((a,b)=>(b['__เจ้าของเรื่อง']||'').localeCompare(a['__เจ้าของเรื่อง']||'','th'))
      case 'date_asc':  return arr.sort((a,b)=>(a['__วันที่']||'').localeCompare(b['__วันที่']||''))
      case 'date_desc': return arr.sort((a,b)=>(b['__วันที่']||'').localeCompare(a['__วันที่']||''))
      case 'tag_asc':   return arr.sort((a,b)=>(a['__เลขแท็กER']||'').localeCompare(b['__เลขแท็กER']||''))
      case 'tag_desc':  return arr.sort((a,b)=>(b['__เลขแท็กER']||'').localeCompare(a['__เลขแท็กER']||''))
      default: return arr
    }
  },[filteredRecords,sortBy])

  // NEW: delete selected records
  const deleteSelected=useCallback(async()=>{
    if(!selected.size){addToast('กรุณาเลือกรายการก่อน','info');return}
    if(!confirm(`ยืนยันลบ ${selected.size} รายการ?`))return
    setDeleting(true)
    try{
      const ids=Array.from(selected) as number[]
      const res=await api.deleteRecords(ids,currentUser)
      if(res?.error){addToast(res.error,'error')}
      else{addToast(`ลบ ${selected.size} รายการแล้ว`,'success');loadRecords()}
    }catch{addToast('ลบไม่สำเร็จ','error')}
    setDeleting(false)
  },[selected,currentUser,loadRecords])

  const totalPages=Math.max(1,Math.ceil(sortedRecords.length/PAGE_SIZE))
  const pagedRecords=sortedRecords.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE)

  const toggleRow=(id:number)=>{const n=new Set(selected);n.has(id)?n.delete(id):n.add(id);setSelected(n)}
  const selectAll=()=>setSelected(new Set(sortedRecords.map((r:any)=>r.rowId)))
  const selectPage=()=>setSelected(prev=>{const n=new Set(prev);pagedRecords.forEach((r:any)=>n.add(r.rowId));return n})
  const clearAll=()=>setSelected(new Set())

  const autoFill=()=>{
    const base=parseInt(startNum)||0
    const nd:Record<number,any>={}
    Array.from(selected).forEach((rowId,i)=>{nd[rowId]={prefix:trackPrefix.toUpperCase().substring(0,2).padEnd(2,'X'),num8:String(base+i).padStart(8,'0').substring(0,8),cd:trackingData[rowId]?.cd||''}})
    setTrackingData(prev=>({...prev,...nd}))
  }

  const getTrackParts=(r:any)=>{
    const t=trackingData[r.rowId]; let prefix,num8,cd
    if(t!==undefined){prefix=t.prefix||trackPrefix;num8=t.num8||'';cd=t.cd!==undefined?t.cd:''}
    else{let stored=String(r['__เลขแท็กER']||'').trim();if(stored.toUpperCase().endsWith('TH'))stored=stored.slice(0,-2);if(stored.length>=3){prefix=stored.substring(0,2);const digits=stored.substring(2);num8=digits.length>=9?digits.substring(0,8):digits.padStart(9,'0').substring(0,8);cd=digits.length>=9?digits.substring(8,9):''}else{prefix=trackPrefix;num8='';cd=''}}
    const isComplete=num8.length===8&&cd.length===1
    const full=isComplete?`${prefix.toUpperCase().padEnd(2,'X')}${num8}${cd}TH`:''
    return{prefix,num8,cd,isComplete,full}
  }

  const saveTracking=async()=>{
    const updates=Array.from(selected).map(rowId=>{const t=trackingData[rowId]||{};if(!t.num8||t.num8.length<1)return null;const p=(t.prefix||trackPrefix).toUpperCase().substring(0,2).padEnd(2,'X');const n=String(t.num8).replace(/\D/g,'').padStart(8,'0').substring(0,8);const c=String(t.cd||'').replace(/\D/g,'').substring(0,1);return{rowId,trackingER:p+n+c+'TH',trackingTH:''}}).filter(Boolean) as any[]
    if(!updates.length){addToast('ยังไม่มีเลขแท็กให้บันทึก','info');return}
    try{await api.updateTracking(updates);loadRecords();addToast('บันทึกเลขแท็ก '+updates.length+' รายการ','success')}catch{addToast('บันทึกไม่สำเร็จ','error')}
  }

  const handleNum8KeyDown=(e:React.KeyboardEvent<HTMLInputElement>,rowId:number,rowIndex:number)=>{
    if(e.key!=='Enter'&&e.key!=='Tab')return;e.preventDefault();const nextIdx=rowIndex+1;if(nextIdx>=pagedRecords.length)return
    const nextRowId=(pagedRecords[nextIdx] as any).rowId;const cur=trackingData[rowId]||{}
    const curNum8=String(cur.num8||'').replace(/\D/g,'').padStart(8,'0').substring(0,8)
    const nextNum8=String(parseInt(curNum8)+1).padStart(8,'0').substring(0,8)
    setTrackingData(prev=>({...prev,[nextRowId]:{prefix:cur.prefix||trackPrefix,num8:nextNum8,cd:prev[nextRowId]?.cd||''}}))
    setTimeout(()=>{const el=inputRefs.current[nextRowId];if(el){el.focus();el.select()}},30)
  }

  const handlePrint=(type:string)=>{
    if(!selected.size){addToast('กรุณาเลือกรายการก่อน','info');return}
    const rowIds=Array.from(selected) as number[]
    const sizeMap:Record<string,'DL'|'A4'|'A4_FOLD'|'AR_YELLOW'|'AR_BLUE'>={
      envelope:paperSize==='A4'?'A4':paperSize==='A4FOLD'?'A4_FOLD':'DL',
      envelope_fold:'A4_FOLD', ar_yellow:'AR_YELLOW', ar_blue:'AR_BLUE',
    }
    api.openEnvelopePrint(rowIds,sizeMap[type]||'DL',currentUser.username)
    addToast('เปิดหน้าพิมพ์แล้ว ('+rowIds.length+' รายการ)','success')
  }

  const handleExportPostalExcel=async()=>{
    if(!selected.size){addToast('กรุณาเลือกรายการก่อน','info');return}
    const rowIds=Array.from(selected) as number[]
    if(rowIds.length>20){addToast('เลือกได้สูงสุด 20 รายการ','error');return}
    setExcelExporting(true)
    try{
      // ใช้ ExcelJS เพื่อรักษา styles/borders/fonts ของ template ทั้งหมด
      const ExcelJS=await import('exceljs')
      const res=await fetch('/postal-template.xlsx')
      if(!res.ok)throw new Error('ไม่พบไฟล์ template')
      const buf=await res.arrayBuffer()

      const wb=new ExcelJS.Workbook()
      await wb.xlsx.load(buf)
      const ws=wb.worksheets[0]

      const selectedRecs=filteredRecords.filter((r:any)=>rowIds.includes(r.rowId)).slice(0,20)

      // fetch user profile
      let profile:any={}
      try{const p=await fetch(`/api/users/profile?username=${encodeURIComponent(currentUser.username)}`);profile=await p.json()}catch{}

      // helper: set cell value เฉพาะ value ไม่แตะ style
      const setCell=(addr:string,val:string)=>{
        const cell=ws.getCell(addr)
        cell.value=val
      }

      // fill office info
      if(profile.office_name){setCell('L2',profile.office_name);setCell('A39',profile.office_name);setCell('B38',profile.office_name)}
      if(profile.license_no) setCell('L3',profile.license_no)
      if(profile.post_name)  setCell('L4',profile.post_name)

      // fill data rows 8–27
      selectedRecs.forEach((r:any,i:number)=>{
        const row=8+i
        const name=r['__ชื่อผู้รับ']||''
        const dept=r['__ถึง']||''
        const recipientText=dept?`${name} ${dept}`:name
        const province=r['__จังหวัด']||''
        const bookNo=r['__เลขที่หนังสือ']||''
        // tracking number
        let tag=String(r['__เลขแท็กER']||'').trim()
        if(!tag){
          const t=trackingData[r.rowId]
          if(t?.num8?.length===8&&t?.cd?.length===1)
            tag=`${(t.prefix||'ER').toUpperCase().padEnd(2,'X')}${t.num8}${t.cd}TH`
        }
        setCell(`B${row}`,recipientText)  // B:D merged — ชื่อผู้รับ
        setCell(`E${row}`,province)       // E — จังหวัด (ปลายทาง)
        setCell(`F${row}`,tag)            // F:K merged — เลขแท็ก
        setCell(`M${row}`,bookNo)         // M — เลขที่หนังสือ
      })

      const out=await wb.xlsx.writeBuffer()
      const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a');a.href=url;a.download='ใบนำส่งไปรษณีย์.xlsx';a.click()
      URL.revokeObjectURL(url)
      addToast('ดาวน์โหลดใบนำส่งไปรษณีย์แล้ว','success')
    }catch(err){addToast('สร้างไฟล์ไม่ได้: '+String(err),'error')}
    setExcelExporting(false)
  }

  const taggedCount=useMemo(()=>records.filter((r:any)=>!!r['__เลขแท็กER']).length,[records])
  const untaggedCount=useMemo(()=>records.filter((r:any)=>!r['__เลขแท็กER']).length,[records])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-secondary dark:text-white font-display">พิมพ์หนังสือ</h2>
          <p className="text-slate-400 text-sm mt-1">เลือกรายการ → กรอกเลขแท็ก → Enter รันต่ออัตโนมัติ</p>
        </div>
        <div className="bg-white dark:bg-slate-800 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 items-center shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">กระดาษ</span>
            <div className="flex gap-0.5">
              {[{key:'DL',label:'DL'},{key:'A4',label:'A4'},{key:'A4FOLD',label:'A4 พับหลัง'}].map(s=>(
                <button key={s.key} onClick={()=>setPaperSize(s.key)} className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${paperSize===s.key?'bg-secondary text-white':'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{s.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">เลขเริ่มต้น</span>
            <div className="tr-wrap">
              <input value={trackPrefix} onChange={e=>setTrackPrefix(e.target.value.replace(/[^a-zA-Z]/g,'').toUpperCase().substring(0,2))} className="tr-pre-inp" maxLength={2} placeholder="ER"/>
              <input value={startNum} onChange={e=>setStartNum(e.target.value.replace(/\D/g,'').substring(0,8))} className="tr-inp" style={{width:'76px'}} placeholder="12340001" maxLength={8}/>
              <span className="tr-suf">TH</span>
            </div>
            <button onClick={autoFill} className="px-2.5 py-1 bg-info text-white text-xs font-bold rounded-lg flex items-center gap-1"><span className="material-icons text-xs">auto_fix_high</span>อัตโนมัติ</button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="glass-card p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <span className="material-icons text-primary text-base self-center">filter_list</span>
          <span className="font-bold text-secondary dark:text-white text-sm self-center">กรองข้อมูล</span>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">วันที่บันทึก</span>
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="input-style w-36 text-sm"/>
              <span className="text-slate-400 text-xs font-bold">—</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="input-style w-36 text-sm"/>
            </div>
          </div>
          {canManage(currentUser.role)&&(
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">เจ้าของเรื่อง</span>
              <div className="relative"><span className="material-icons absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm">person_search</span>
                <input value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadRecords()} className="input-style pl-8 text-sm w-40" placeholder="พิมพ์ชื่อ..."/></div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">สถานะแท็ก</span>
            <div className="tag-switch">
              <button className={`tag-sw-btn ${tagFilter==='all'?'active-all':''}`} onClick={()=>setTagFilter('all')}>ทั้งหมด {records.length>0&&<span className="ml-1 opacity-75">({records.length})</span>}</button>
              <button className={`tag-sw-btn ${tagFilter==='tagged'?'active-tagged':''}`} onClick={()=>setTagFilter('tagged')}><span className="inline-flex items-center gap-0.5"><span className="material-icons" style={{fontSize:'11px'}}>check_circle</span>บันทึกแท็กแล้ว {records.length>0&&<span className="ml-1 opacity-75">({taggedCount})</span>}</span></button>
              <button className={`tag-sw-btn ${tagFilter==='untagged'?'active-none':''}`} onClick={()=>setTagFilter('untagged')}><span className="inline-flex items-center gap-0.5"><span className="material-icons" style={{fontSize:'11px'}}>schedule</span>ยังไม่บันทึกแท็ก {records.length>0&&<span className="ml-1 opacity-75">({untaggedCount})</span>}</span></button>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end">
            <button onClick={loadRecords} disabled={loadingData} className="flex items-center gap-1 bg-secondary text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-60">
              {loadingData?<><div className="spinner"></div>โหลด...</>:<><span className="material-icons text-xs">search</span>ค้นหา</>}
            </button>
            <button onClick={clearFilters} className="text-xs text-slate-400 hover:text-primary font-bold flex items-center gap-0.5 px-2 py-2"><span className="material-icons text-xs">clear</span>ล้าง</button>
          </div>
          <span className="ml-auto text-xs text-slate-400 self-center">แสดง <span className="font-bold text-primary">{pagedRecords.length}</span> / <span className="font-bold text-secondary">{sortedRecords.length}</span> รายการ</span>
        </div>
      </div>

      {/* Operation Manual */}
      <div className="glass-card mb-6">
        <button onClick={()=>setShowManual(v=>!v)} className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors rounded-2xl">
          <span className="flex items-center gap-2 font-bold text-secondary dark:text-white text-sm">
            <span className="material-icons text-primary text-base">menu_book</span>
            คู่มือปฏิบัติงาน — พิมพ์หนังสือ
          </span>
          <span className="material-icons text-slate-400 text-sm transition-transform" style={{transform:showManual?'rotate(180deg)':'rotate(0deg)'}}>expand_more</span>
        </button>
        {showManual&&(
          <div className="px-5 pb-5 animate-fadeIn">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-secondary text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">1</span>
                  <span className="font-bold text-secondary dark:text-white text-sm">กรองและเลือกข้อมูล</span>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-1.5"><span className="material-icons text-primary text-xs mt-0.5">arrow_right</span>กรองข้อมูลตามวันที่และเจ้าของเรื่อง</li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-primary text-xs mt-0.5">arrow_right</span>กดปุ่ม <strong>ค้นหา</strong> เพื่อโหลดรายการ</li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-primary text-xs mt-0.5">arrow_right</span>เลือกรายการที่ต้องการพิมพ์ (คลิกที่แถว)</li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-primary text-xs mt-0.5">arrow_right</span>ใช้ปุ่ม <strong>หน้านี้</strong> หรือ <strong>ทั้งหมด</strong> เพื่อเลือกหลายรายการ</li>
                </ul>
              </div>
              {/* Step 2 */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-100 dark:border-green-800">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-success text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">2</span>
                  <span className="font-bold text-secondary dark:text-white text-sm">ใส่เลขแท็กและพิมพ์</span>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-1.5"><span className="material-icons text-success text-xs mt-0.5">arrow_right</span>ใส่ตัวอักษร 2 ตัวแรก (เช่น <strong>ER</strong>) และเลขเริ่มต้น 8 หลัก</li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-success text-xs mt-0.5">arrow_right</span>กด <strong>อัตโนมัติ</strong> เพื่อเติมเลขต่อเนื่อง หรือกรอกทีละช่อง</li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-success text-xs mt-0.5">arrow_right</span>กด <strong>Enter/Tab</strong> เพื่อข้ามไปแถวถัดไปอัตโนมัติ</li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-success text-xs mt-0.5">arrow_right</span>กด <strong>บันทึกแท็ก</strong> ก่อนพิมพ์ทุกครั้ง</li>
                </ul>
              </div>
              {/* Step 3 */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-warning text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">3</span>
                  <span className="font-bold text-secondary dark:text-white text-sm">เลือกขนาดกระดาษ</span>
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                  <li className="flex items-start gap-1.5"><span className="material-icons text-warning text-xs mt-0.5">arrow_right</span><span><strong>DL</strong> = ซองพับ 3 (100×220 มม.)</span></li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-warning text-xs mt-0.5">arrow_right</span><span><strong>A4</strong> = ซอง A4 / ซอง A3 (210×297 มม.)</span></li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-warning text-xs mt-0.5">arrow_right</span><span><strong>A4 พับหลัง</strong> = พิมพ์หลังจดหมาย</span></li>
                  <li className="flex items-start gap-1.5"><span className="material-icons text-warning text-xs mt-0.5">arrow_right</span><span>ใบตอบรับ <strong>สีเหลือง/สีฟ้า</strong> = A6 (105×148 มม.)</span></li>
                </ul>
              </div>
            </div>
            {/* Printer settings note */}
            <div className="mt-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-icons text-slate-500 text-sm">print</span>
                <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">การตั้งค่าเครื่องปริ้น</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-300 mb-1">ขั้นตอน:</p>
                  <ol className="space-y-1 list-decimal list-inside">
                    <li>กดปุ่มพิมพ์ → หน้าต่างพิมพ์จะเปิดใน tab ใหม่</li>
                    <li>กด Ctrl+P (หรือ ⌘+P บน Mac) เพื่อพิมพ์</li>
                    <li>คลิก <strong>More settings</strong> ในหน้าต่างพิมพ์</li>
                    <li>เลือก <strong>Paper size</strong> ให้ตรงกับซองที่ใส่</li>
                  </ol>
                </div>
                <div>
                  <p className="font-bold text-slate-600 dark:text-slate-300 mb-1">ขนาดกระดาษที่ต้องเลือก:</p>
                  <ul className="space-y-1">
                    <li>• ซอง A4 → <strong>A4 (210×297 มม.)</strong></li>
                    <li>• ซองพับ 3 → <strong>DL (100×220 มม.) หรือ ซองจดหมาย #10 (105×241 มม.)</strong></li>
                    <li>• ใบตอบรับ AR → <strong>A6 (105×148 มม.)</strong></li>
                  </ul>
                </div>
              </div>
              <p className="text-[10px] text-primary font-bold mt-2 flex items-center gap-1">
                <span className="material-icons text-xs">warning</span>
                หน้าถัดไปสำคัญมาก — ตรวจสอบขนาดกระดาษทุกครั้งก่อนพิมพ์
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card shadow-xl mb-8">
        <div className="p-5 border-b border-slate-50 dark:border-slate-700 flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
          <h3 className="font-bold text-secondary dark:text-white flex items-center gap-2 font-display">
            <span className="material-icons text-primary text-base">list_alt</span>รายชื่อผู้รับ
            <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">{sortedRecords.length}</span>
          </h3>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="material-icons text-slate-400 text-sm">sort</span>
              <select value={sortBy} onChange={e=>{setSortBy(e.target.value);setCurrentPage(1)}} className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 dark:text-white font-bold text-slate-600">
                <option value="date_desc">วันที่ ↓ ล่าสุด</option>
                <option value="date_asc">วันที่ ↑ เก่าสุด</option>
                <option value="type_asc">ประเภท ก-ฮ</option>
                <option value="type_desc">ประเภท ฮ-ก</option>
                <option value="owner_asc">เจ้าของเรื่อง ก-ฮ</option>
                <option value="owner_desc">เจ้าของเรื่อง ฮ-ก</option>
                <option value="tag_asc">เลขแท็ก ↑</option>
                <option value="tag_desc">เลขแท็ก ↓</option>
              </select>
            </div>
            <button onClick={selectPage} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">หน้านี้</button>
            <button onClick={selectAll}  className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">ทั้งหมด</button>
            <button onClick={clearAll}   className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-full">ล้าง</button>
            <button onClick={saveTracking} className="px-3 py-1.5 bg-success text-white text-xs font-bold rounded-full flex items-center gap-1"><span className="material-icons text-xs">save</span>บันทึกแท็ก</button>
            {/* Delete Button */}
            {selected.size>0&&(
              <button onClick={deleteSelected} disabled={deleting} className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-full flex items-center gap-1 disabled:opacity-60">
                {deleting?<><div className="spinner"></div>ลบ...</>:<><span className="material-icons text-xs">delete</span>ลบ ({selected.size})</>}
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-8"></th><th className="px-3 py-4">#</th>
                <th className="px-3 py-4">ชื่อผู้รับ / ถึง</th><th className="px-3 py-4">เลขที่หนังสือ</th>
                <th className="px-3 py-4">จังหวัด</th><th className="px-3 py-4">ประเภท</th>
                <th className="px-3 py-4">เจ้าของเรื่อง</th><th className="px-3 py-4">วันที่</th>
                <th className="px-3 py-4" style={{minWidth:'260px'}}>เลขแท็ก (13 ตัว)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {pagedRecords.map((r:any,rowIndex:number)=>{
                const isSelected=selected.has(r.rowId)
                const {prefix,num8,cd,isComplete,full}=getTrackParts(r)
                const hasExisting=!!r['__เลขแท็กER']
                return (
                  <tr key={r.rowId} onClick={()=>toggleRow(r.rowId)} className={`cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isSelected?'bg-blue-50 dark:bg-blue-900/20':''}`}>
                    <td className="p-4"><div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected?'bg-secondary border-secondary':'border-slate-200'}`}>{isSelected&&<span className="material-icons text-white text-xs">check</span>}</div></td>
                    <td className="px-3 py-4 text-center text-xs text-slate-400">{(currentPage-1)*PAGE_SIZE+rowIndex+1}</td>
                    <td className="px-3 py-4"><div className="font-bold text-slate-800 dark:text-white text-xs">{r['__ชื่อผู้รับ']}</div>{r['__ถึง']&&<div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-[180px]" title={r['__ถึง']}>{r['__ถึง']}</div>}{r['__ที่อยู่สำนักงาน']&&<div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[180px]" title={r['__ที่อยู่สำนักงาน']}>{r['__ที่อยู่สำนักงาน']}</div>}</td>
                    <td className="px-3 py-4 text-xs font-mono text-slate-600 dark:text-slate-300">{r['__เลขที่หนังสือ']}</td>
                    <td className="px-3 py-4 text-xs text-center">{r['__จังหวัด']}</td>
                    <td className="px-3 py-4 text-xs text-center"><span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${r['__ประเภท']==='EMS'?'bg-red-100 text-primary':'bg-slate-100 text-slate-500'}`}>{r['__ประเภท']||'ธรรมดา'}</span></td>
                    <td className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">{r['__เจ้าของเรื่อง']}</td>
                    <td className="px-3 py-4 text-xs text-slate-400 whitespace-nowrap">{r['__วันที่']}</td>
                    <td className="px-3 py-4" onClick={e=>e.stopPropagation()}>
                      <div className="tr-wrap">
                        <input value={prefix} onChange={e=>{const v=e.target.value.replace(/[^a-zA-Z]/g,'').toUpperCase().substring(0,2);setTrackingData(prev=>({...prev,[r.rowId]:{...prev[r.rowId],prefix:v,num8:prev[r.rowId]?.num8||num8,cd:prev[r.rowId]?.cd||cd}}))}} className="tr-pre-inp" maxLength={2}/>
                        <input ref={el=>{if(el)inputRefs.current[r.rowId]=el}} value={num8}
                          onChange={e=>{const v=e.target.value.replace(/\D/g,'').substring(0,8);const autocd=v.length===8?calcCheckDigit(v):'';setTrackingData(prev=>({...prev,[r.rowId]:{...prev[r.rowId],prefix:prev[r.rowId]?.prefix||prefix,num8:v,cd:autocd||prev[r.rowId]?.cd||''}}))}}
                          onKeyDown={e=>handleNum8KeyDown(e,r.rowId,rowIndex)} className="tr-inp" style={{width:'72px'}} maxLength={8} placeholder="12340001"/>
                        <input value={cd} onChange={e=>{const v=e.target.value.replace(/\D/g,'').substring(0,1);setTrackingData(prev=>({...prev,[r.rowId]:{...prev[r.rowId],prefix:prev[r.rowId]?.prefix||prefix,num8:prev[r.rowId]?.num8||num8,cd:v}}))}} className="tr-inp" style={{width:'22px',background:'#f0fdf4',color:'#166534',fontWeight:700}} maxLength={1}/>
                        <span className="tr-suf">TH</span>
                      </div>
                      {isComplete&&<div className="text-[10px] font-mono text-success mt-1 font-bold">{full}</div>}
                      {hasExisting&&!isComplete&&<div className="text-[10px] font-mono text-info mt-1 truncate">{r['__เลขแท็กER']}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages>1&&(
          <div className="p-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs text-slate-400">หน้า {currentPage} / {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} disabled={currentPage===1} className="px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-lg disabled:opacity-40"><span className="material-icons text-xs">chevron_left</span></button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{const pg=Math.max(1,Math.min(totalPages-4,currentPage-2))+i;return(<button key={pg} onClick={()=>setCurrentPage(pg)} className={`px-3 py-1 text-xs font-bold rounded-lg ${pg===currentPage?'bg-secondary text-white':'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{pg}</button>)})}
              <button onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-700 rounded-lg disabled:opacity-40"><span className="material-icons text-xs">chevron_right</span></button>
            </div>
          </div>
        )}
      </div>

      {selected.size>0&&(
        <div className="glass-card p-5 mb-6 animate-fadeIn">
          <h3 className="font-bold text-secondary dark:text-white text-sm mb-4 flex items-center gap-2"><span className="material-icons text-primary text-base">print</span>พิมพ์ / บันทึก PDF ({selected.size} รายการ)</h3>
          <div className="flex flex-wrap gap-3">
            {[{key:'envelope',color:'bg-secondary',icon:'mail',label:'ซองจดหมาย'},
              {key:'ar_yellow',color:'bg-yellow-500',icon:'assignment',label:'ใบตอบรับ สีเหลือง'},
              {key:'ar_blue',color:'bg-blue-400',icon:'assignment',label:'ใบตอบรับ สีฟ้า'}].map(({key,color,icon,label})=>(
              <button key={key} onClick={()=>handlePrint(key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all ${color}`}>
                <span className="material-icons text-base">{icon}</span>{label}
              </button>
            ))}
            <button onClick={handleExportPostalExcel} disabled={excelExporting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 transition-all">
              {excelExporting?<><div className="spinner"></div>กำลังสร้าง...</>:<><span className="material-icons text-base">table_view</span>ใบนำส่งไปรษณีย์</>}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">ระบบจะเปิดหน้าพิมพ์ใน tab ใหม่ — กด Ctrl+P หรือ ⌘+P เพื่อพิมพ์หรือบันทึกเป็น PDF</p>
        </div>
      )}
    </div>
  )
}

// ── Track Page ────────────────────────────────────────────────────────────────
function TrackPage({ addToast, currentUser }:any) {
  const [query,setQuery]=useState('')
  const [results,setResults]=useState<RecordRow[]|null>(null)
  const [loading,setLoading]=useState(false)
  const [selected,setSelected]=useState<any>(null)
  const [copied,setCopied]=useState(false)

  const doSearch=async()=>{
    if(!query.trim())return;setLoading(true)
    try{const data=await api.searchRecord(query.trim(),currentUser.username,currentUser.role,currentUser.office_name);setResults(Array.isArray(data)?data:[]);setSelected(null)}
    catch{addToast('ค้นหาไม่สำเร็จ','error')}
    setLoading(false)
  }

  const getTracking=(r:any)=>{const er=r['__เลขแท็กER']||'';if(!er)return'-';if(er.toUpperCase().endsWith('TH'))return er;if(/^\d{1,8}$/.test(er))return'ER'+er.padStart(8,'0')+'TH';return er}
  const hasTag=(r:any)=>!!r['__เลขแท็กER']
  const handleCopy=(r:any)=>{navigator.clipboard.writeText(getTracking(r)).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}
  const handleTrackPost=(r:any)=>window.open('https://track.thailandpost.co.th/?trackNumber='+getTracking(r),'_blank')
  const sColor=(r:any)=>hasTag(r)?'text-success':'text-warning'
  const sIcon=(r:any)=>hasTag(r)?'local_shipping':'schedule'
  const sLabel=(r:any)=>hasTag(r)?'จัดส่งแล้ว':'รอจัดส่ง'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn space-y-6">
      <h2 className="text-2xl font-bold text-secondary dark:text-white font-display flex items-center gap-2"><span className="material-icons text-primary">search</span>ค้นหาหนังสือ</h2>
      <div className="glass-card p-5">
        <div className="flex gap-3">
          <div className="relative flex-1"><span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-base">search</span>
            <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()} className="input-style pl-10 text-sm" placeholder="ค้นหาด้วยเลขที่หนังสือ, ชื่อผู้รับ, เลขแท็ก, เจ้าของเรื่อง..."/></div>
          <button onClick={doSearch} disabled={loading} className="bg-secondary text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-60">
            {loading?<><div className="spinner"></div>ค้นหา...</>:<><span className="material-icons text-sm">search</span>ค้นหา</>}
          </button>
        </div>
      </div>
      {results!==null&&results.length>0&&(
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 flex justify-between">
            <span className="font-bold text-secondary dark:text-white text-sm">ผลการค้นหา</span>
            <span className="text-xs text-slate-400">{results.length} รายการ</span>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-400 text-[10px] font-bold uppercase">
              <tr><th className="px-5 py-3 text-left">ชื่อผู้รับ / จังหวัด</th><th className="px-5 py-3">เลขที่หนังสือ</th><th className="px-5 py-3">เจ้าของเรื่อง</th><th className="px-5 py-3">วันที่</th><th className="px-5 py-3">สถานะ</th><th className="px-5 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {results.map((r:any)=>(
                <tr key={r.rowId} onClick={()=>setSelected(selected?.rowId===r.rowId?null:r)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all">
                  <td className="px-5 py-4"><div className="font-bold text-xs">{r['__ชื่อผู้รับ']}</div><div className="text-[10px] text-slate-400">{r['__จังหวัด']}</div></td>
                  <td className="px-5 py-4 text-xs font-mono">{r['__เลขที่หนังสือ']}</td>
                  <td className="px-5 py-4 text-xs text-slate-500">{r['__เจ้าของเรื่อง']}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">{r['__วันที่']}</td>
                  <td className="px-5 py-4"><span className={`flex items-center gap-1 font-bold text-xs ${sColor(r)}`}><span className="material-icons text-xs">{sIcon(r)}</span>{sLabel(r)}</span></td>
                  <td className="px-5 py-4"><span className="material-icons text-slate-300 text-sm">{selected?.rowId===r.rowId?'expand_less':'expand_more'}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
      {selected&&(
        <div className="grid md:grid-cols-2 gap-6 animate-fadeIn">
          <div className="glass-card">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50"><h3 className="font-bold text-secondary dark:text-white text-sm flex items-center gap-1"><span className="material-icons text-primary text-base">info</span>ข้อมูลรายการ</h3></div>
            <div className="p-6 space-y-3">
              {[['เลขที่หนังสือ',selected['__เลขที่หนังสือ']],['เจ้าของเรื่อง',selected['__เจ้าของเรื่อง']],['ประเภทบริการ',selected['__ประเภท']],['จำนวน',selected['__จำนวน']],['วันที่บันทึก',selected['__วันที่']]].map(([label,val])=>(
                <div key={label} className="flex justify-between border-b border-slate-50 dark:border-slate-700 pb-2.5"><span className="text-slate-400 text-xs">{label}:</span><span className="font-bold dark:text-white text-sm">{val}</span></div>
              ))}
              <div className="border-b border-slate-50 dark:border-slate-700 pb-2.5">
                <div className="flex justify-between items-start mb-2"><span className="text-slate-400 text-xs">เลขแท็กกิ้ง:</span><span className="font-bold dark:text-white text-sm font-mono tracking-wide">{getTracking(selected)}</span></div>
                {hasTag(selected)&&<div className="flex gap-2 justify-end mt-2">
                  <button onClick={()=>handleCopy(selected)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"><span className="material-icons text-xs">{copied?'check':'content_copy'}</span>{copied?'คัดลอกแล้ว':'คัดลอก'}</button>
                  <button onClick={()=>handleTrackPost(selected)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all shadow-sm hover:opacity-90" style={{background:'linear-gradient(135deg,#EE2D24,#b91c1c)'}}><span className="material-icons text-xs">local_shipping</span>ตรวจสอบที่ไปรษณีย์ไทย<span className="material-icons text-xs">open_in_new</span></button>
                </div>}
                {!hasTag(selected)&&<p className="text-right text-[10px] text-warning mt-1">ยังไม่มีเลขแท็ก</p>}
              </div>
              <div className="flex justify-between pt-1"><span className="text-slate-400 text-xs">สถานะ:</span><span className={`font-bold flex items-center gap-1 text-xs ${sColor(selected)}`}><span className="material-icons text-xs">{sIcon(selected)}</span>{sLabel(selected)}</span></div>
            </div>
          </div>
          <div className="glass-card">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50"><h3 className="font-bold text-secondary dark:text-white text-sm flex items-center gap-1"><span className="material-icons text-primary text-base">person</span>ข้อมูลผู้รับ</h3></div>
            <div className="p-6 space-y-3">
              {[['ชื่อผู้รับ',selected['__ชื่อผู้รับ']],['ตำแหน่ง/หน่วยงาน',selected['__ถึง']||'-'],['ที่อยู่',selected['__ที่']||'-'],['ตำบล',selected['__ตำบล']||'-'],['อำเภอ',selected['__อำเภอ']||'-'],['จังหวัด',selected['__จังหวัด']||'-']].map(([label,val])=>(
                <div key={label}><div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</div><div className="bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl font-bold dark:text-white text-sm">{val}</div></div>
              ))}
              <div><div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">รหัสไปรษณีย์</div><div className="bg-slate-50 dark:bg-slate-700/50 px-3 py-2 rounded-xl font-bold font-mono text-xl dark:text-white zip-display">{selected['__รหัสไปรษณีย์']}</div></div>
            </div>
          </div>
        </div>
      )}
      {results!==null&&results.length===0&&<div className="glass-card p-14 text-center animate-fadeIn"><span className="material-icons text-5xl text-slate-200 mb-3 block">search_off</span><p className="text-slate-400 font-bold">ไม่พบข้อมูลที่ค้นหา</p></div>}
    </div>
  )
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  // ── restore session + page จาก sessionStorage เมื่อ refresh ─────────────
  // ต้องเริ่มต้นด้วย null/'home' เสมอ (server ไม่มี sessionStorage)
  // แล้วค่อย restore ใน useEffect เพื่อหลีกเลี่ยง hydration mismatch
  const [currentUser,setCurrentUser]=useState<SessionUser|null>(null)
  const [page,setPageState]=useState('home')
  const [darkMode,setDarkMode]=useState(false)
  const [locations,setLocations]=useState<any[]>([])
  const [toasts,setToasts]=useState<ToastItem[]>([])
  const [showAdmin,setShowAdmin]=useState(false)

  // restore session + page จาก sessionStorage หลัง client mount เท่านั้น
  useEffect(()=>{
    try{const s=sessionStorage.getItem(SESSION_KEY);if(s)setCurrentUser(JSON.parse(s))}catch{}
    try{const p=sessionStorage.getItem(PAGE_KEY);if(p)setPageState(p)}catch{}
  },[])

  useEffect(()=>{document.documentElement.classList.toggle('dark',darkMode)},[darkMode])

  // บันทึก session ทุกครั้งที่ currentUser เปลี่ยน
  useEffect(()=>{
    try{
      if(currentUser)sessionStorage.setItem(SESSION_KEY,JSON.stringify(currentUser))
      else sessionStorage.removeItem(SESSION_KEY)
    }catch{}
  },[currentUser])

  // wrapper setPage ที่บันทึก page ลง sessionStorage ด้วย
  const setPage=useCallback((p:string)=>{
    setPageState(p)
    try{sessionStorage.setItem(PAGE_KEY,p)}catch{}
  },[])

  const addToast=useCallback((message:string,type='info')=>{
    const id=Date.now();setToasts(prev=>[...prev,{id,message,type}]);setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)),4000)
  },[])

  const loadLocations=useCallback(async()=>{
    try{
      const data=await api.getLocationData()
      if(data?.error){console.error('locations API error:',data.error);addToast('โหลดข้อมูลที่อยู่ไม่สำเร็จ: '+data.error,'error');return}
      setLocations(data||[])
    }catch(e){console.error('loadLocations failed:',e);addToast('โหลดข้อมูลที่อยู่ไม่สำเร็จ','error')}
  },[])

  useEffect(()=>{if(currentUser&&locations.length===0)loadLocations()},[currentUser])

  const handleLogin=(user:SessionUser)=>setCurrentUser(user)
  const handleLogout=()=>{
    setCurrentUser(null)
    setPage('home')
    try{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(PAGE_KEY)}catch{}
    addToast('ออกจากระบบแล้ว','info')
  }

  if(!currentUser)return(<><AuthPage onLogin={handleLogin} addToast={addToast}/><Toast toasts={toasts}/></>)

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <Header setPage={setPage} darkMode={darkMode} setDarkMode={setDarkMode} currentUser={currentUser} onLogout={handleLogout} onAdminPanel={()=>setShowAdmin(true)}/>
      <main className="flex-grow">
        {page==='home'     &&<HomePage     setPage={setPage}/>}
        {page==='register' &&<RegisterPage setPage={setPage} locations={locations} refresh={loadLocations} addToast={addToast} currentUser={currentUser}/>}
        {page==='queue'    &&<QueuePage    setPage={setPage} addToast={addToast} currentUser={currentUser}/>}
        {page==='track'    &&<TrackPage    setPage={setPage} addToast={addToast} currentUser={currentUser}/>}
      </main>
      <footer className="py-8 border-t border-slate-100 dark:border-slate-800 text-center text-slate-400 text-[9px] uppercase tracking-widest font-bold">© 2026 ระบบจัดการส่งจดหมาย — PostOffice</footer>
      <Toast toasts={toasts}/>
      {showAdmin&&canManage(currentUser?.role||'')&&<AdminPanel currentUser={currentUser} addToast={addToast} onClose={()=>setShowAdmin(false)}/>}
    </div>
  )
}
