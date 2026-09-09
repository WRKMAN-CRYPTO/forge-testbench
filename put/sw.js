const CACHE='put-shell-v3';
const ASSETS=['./manifest.json'];
const APP_STYLE='<style id="put-app-hardening">html,body,body *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,textarea,[contenteditable="true"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}img{-webkit-user-drag:none;user-drag:none}</style>';

function hardenHtml(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  return response.text().then(html=>{
    if(!html.includes('put-app-hardening'))html=html.replace('</head>',APP_STYLE+'</head>');
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  });
}

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  const isNavigation=event.request.mode==='navigate';

  if(isNavigation){
    event.respondWith(
      fetch(event.request)
        .then(async response=>{
          const hardened=await hardenHtml(response);
          const copy=hardened.clone();
          caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
          return hardened;
        })
        .catch(async()=>{
          const cached=await caches.match('./index.html');
          return hardenHtml(cached);
        })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});
