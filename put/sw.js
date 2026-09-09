const CACHE='put-shell-v4';
const ASSETS=['./manifest.json'];
const APP_STYLE='<style id="put-app-hardening">html,body,body *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,textarea,[contenteditable="true"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}img{-webkit-user-drag:none;user-drag:none}</style>';
const INSTALL_UI=`<style id="put-install-style">#putInstall{display:none;align-items:center;gap:11px;padding:11px 13px;border:1px solid var(--line,#34392d);border-radius:16px;background:var(--panel,#1a1d17);color:var(--muted,#aaa997);font-size:12px;line-height:1.35}#putInstall.show{display:flex}#putInstall strong{display:block;color:var(--ink,#f4f0df);font-size:13px;margin-bottom:1px}#putInstall .share{color:var(--accent,#d6f36a);font-weight:850;white-space:nowrap}#putInstall button{margin-left:auto;width:32px;height:32px;border:0;border-radius:10px;background:transparent;color:var(--muted,#aaa997);font-size:18px;flex:0 0 auto}</style>`;
const INSTALL_CARD=`<aside id="putInstall" aria-label="Install PUT"><div><strong>Keep PUT on your phone</strong><span class="share">Share ↑</span> → Add to Home Screen</div><button id="putInstallClose" aria-label="Dismiss install tip">×</button></aside>`;
const INSTALL_SCRIPT=`<script id="put-install-script">(()=>{const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);const safari=/Safari/.test(navigator.userAgent)&&!/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);if(ios&&safari&&!standalone&&!localStorage.getItem('put-install-tip-dismissed')){const card=document.getElementById('putInstall');if(card)card.classList.add('show')}const close=document.getElementById('putInstallClose');if(close)close.onclick=()=>{document.getElementById('putInstall')?.classList.remove('show');localStorage.setItem('put-install-tip-dismissed','1')}})();<\/script>`;

function hardenHtml(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  return response.text().then(html=>{
    if(!html.includes('put-app-hardening'))html=html.replace('</head>',APP_STYLE+'</head>');
    if(!html.includes('put-install-style'))html=html.replace('</head>',INSTALL_UI+'</head>');
    if(!html.includes('id="putInstall"'))html=html.replace('<main class="shell">','<main class="shell">'+INSTALL_CARD);
    if(!html.includes('put-install-script'))html=html.replace('</body>',INSTALL_SCRIPT+'</body>');
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  });
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const isNavigation=event.request.mode==='navigate';
  if(isNavigation){
    event.respondWith(fetch(event.request).then(async response=>{const hardened=await hardenHtml(response);const copy=hardened.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return hardened}).catch(async()=>hardenHtml(await caches.match('./index.html'))));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request)));
});
