import { lazy, Suspense } from 'react';
const LocalApp=lazy(()=>import('./LocalApp'));
const ServerApp=lazy(()=>import('./remote/ServerApp'));
export default function App(){
 return <Suspense fallback={<main className="loading"><h1>Son Durak</h1><p>Hazırlanıyor…</p></main>}>
  {import.meta.env.VITE_API_BASE_URL?<ServerApp/>:<LocalApp/>}
 </Suspense>;
}
