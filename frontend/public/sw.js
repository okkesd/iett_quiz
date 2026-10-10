const CACHE='son-durak-v7';
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const response=await fetch('/');
  if(!response.ok)throw new Error('Shell unavailable');
  await cache.put('/',response);
  const manifest=await fetch('/precache-assets.json',{cache:'reload'});
  if(!manifest.ok)throw new Error('Asset manifest unavailable');
  const assets=await manifest.json();
  await cache.addAll(['/theme.js','/site-info.css','/data/network.json','/favicon.svg','/manifest.webmanifest',...assets]);
 })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('son-durak-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||event.request.headers.has('Authorization')||/^\/(?:api|v1|health|auth)(?:\/|$)/.test(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(event.request);
   if(response.ok&&!response.headers.get('Cache-Control')?.includes('no-store'))await cache.put(event.request,response.clone());
   return response;
  }catch{
   // Vite adds Vary: Origin to static files. Precache requests lack the
   // module/font Origin header, but these public same-origin assets are identical.
   const cached=await cache.match(event.request,{ignoreVary:true});
   if(cached)return cached;
   if(event.request.mode==='navigate')return await cache.match('/')||Response.error();
   return Response.error();
  }
 })());
});
