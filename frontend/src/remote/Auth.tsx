import { useState, type FormEvent } from 'react';
import { BusFront } from 'lucide-react';
import { authClient } from './api';
export default function Auth({recovery=false,onRecovered}:{recovery?:boolean;onRecovered:()=>void}){
 const [mode,setMode]=useState<'login'|'signup'|'reset'>('login');
 const [email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function submit(event:FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');
  try{
   const auth=authClient().auth;
   if(recovery){const {error}=await auth.updateUser({password});if(error)throw error;onRecovered();}
   else if(mode==='login'){const {error}=await auth.signInWithPassword({email,password});if(error)throw error;}
   else if(mode==='signup'){
    const {data,error}=await auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname+location.search}});
    if(error)throw error;if(!data.session)setMessage('E-posta adresine gelen bağlantıyla hesabını doğrula, ardından giriş yap.');
   }else{
    const {error}=await auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
    if(error)throw error;setMessage('Hesabın varsa şifre yenileme bağlantısı e-posta adresine gönderildi.');
   }
  }catch(err){setError((err as Error).message);}finally{setBusy(false);}
 }
 return <main className="auth-page"><section className="info-card auth-card"><BusFront size={36}/><h1>Son Durak</h1><p>{recovery?'Yeni şifreni belirle.':'İstanbul’u keşfet, yolculuğunu hesabında sakla.'}</p>
  {!recovery&&<div className="quick-side" role="group" aria-label="Hesap işlemi"><button aria-pressed={mode==='login'} onClick={()=>{setMode('login');setError('');setMessage('');}}>Giriş yap</button><button aria-pressed={mode==='signup'} onClick={()=>{setMode('signup');setError('');setMessage('');}}>Hesap oluştur</button></div>}
  <form onSubmit={event=>void submit(event)}>
   {!recovery&&<label>E-posta<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
   {(mode!=='reset'||recovery)&&<label>{recovery?'Yeni şifre':'Şifre'}<input type="password" autoComplete={mode==='signup'||recovery?'new-password':'current-password'} required minLength={mode==='signup'||recovery?8:undefined} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
   {error&&<p className="notice error" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
   <button className="primary" disabled={busy}>{busy?'Lütfen bekle…':recovery?'Şifreyi kaydet':mode==='signup'?'Hesap oluştur':mode==='reset'?'Yenileme bağlantısı gönder':'Giriş yap'}</button>
  </form>
  {!recovery&&<button className="text-button" onClick={()=>{setMode('reset');setError('');setMessage('');}}>Şifremi unuttum</button>}
 </section></main>;
}
