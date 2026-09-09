const CACHE='put-shell-v5';
const ASSETS=['./manifest.json'];
const APP_STYLE='<style id="put-app-hardening">html,body,body *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,textarea,[contenteditable="true"]{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}img{-webkit-user-drag:none;user-drag:none}</style>';
const INSTALL_UI=`<style id="put-install-style">#putInstall{display:none;align-items:center;gap:11px;padding:11px 13px;border:1px solid var(--line,#34392d);border-radius:16px;background:var(--panel,#1a1d17);color:var(--muted,#aaa997);font-size:12px;line-height:1.35}#putInstall.show{display:flex}#putInstall .copy{min-width:0;flex:1}#putInstall strong{display:block;color:var(--ink,#f4f0df);font-size:13px;margin-bottom:1px}#putInstall .route{color:var(--accent,#d6f36a);font-weight:850}#putInstallAction{display:none;flex:0 0 auto;height:34px;padding:0 11px;border:1px solid var(--accent,#d6f36a);border-radius:10px;background:var(--accent,#d6f36a);color:#171911;font-size:12px;font-weight:900}#putInstallAction.show{display:block}#putInstallClose{margin-left:auto;width:32px;height:32px;border:0;border-radius:10px;background:transparent;color:var(--muted,#aaa997);font-size:18px;flex:0 0 auto}</style>`;
const INSTALL_CARD=`<aside id="putInstall" aria-label="Install PUT"><div class="copy"><strong id="putInstallTitle">Keep PUT on your phone</strong><span id="putInstallRoute" class="route">Install PUT</span></div><button id="putInstallAction" type="button">INSTALL</button><button id="putInstallClose" aria-label="Dismiss install tip">×</button></aside>`;
const INSTALL_SCRIPT=`<script id="put-install-script">(()=>{const card=document.getElementById('putInstall');const route=document.getElementById('putInstallRoute');const action=document.getElementById('putInstallAction');const close=document.getElementById('putInstallClose');const dismissed='put-install-tip-dismissed';const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;const ios=/iPhone|iPad|iPod/.test(navigator.userAgent);let installPrompt=null;function hide(){card?.classList.remove('show')}function show(){if(card&&!isStandalone()&&!localStorage.getItem(dismissed))card.classList.add('show')}function setFallback(){if(!route)return;if(ios){route.textContent='Share ↑ → Add to Home Screen'}else{route.textContent='Browser menu → Install app / Add to Home Screen'}action?.classList.remove('show');show()}window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if(route)route.textContent='Install PUT as an app';action?.classList.add('show');show()});action?.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();const result=await installPrompt.userChoice.catch(()=>null);if(result&&result.outcome==='accepted'){hide()}installPrompt=null;action.classList.remove('show')});window.addEventListener('appinstalled',()=>{hide();installPrompt=null});close?.addEventListener('click',()=>{hide();localStorage.setItem(dismissed,'1')});if(!isStandalone())setTimeout(()=>{if(!installPrompt)setFallback()},700)})();<\/script>`;

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
