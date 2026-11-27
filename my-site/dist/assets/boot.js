// Resolve appearance before the first paint. The module control only manages
// the menu and persists later choices.
try {
  const choices = ['system', 'nocturne', 'daylight', 'parchment', 'instrument'];
  const saved = localStorage.getItem('bassel-portfolio-theme');
  const choice = choices.includes(saved) ? saved : 'system';
  const theme = choice === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'daylight' : 'nocturne') : choice;
  document.documentElement.dataset.themeChoice = choice;
  document.documentElement.dataset.theme = choices.includes(theme) && theme !== 'system' ? theme : 'nocturne';
} catch {}
// The loader and the scroll-entry shortcut belong to the homepage only. The
// project routes share the appearance boot above without inheriting intro state.
const isHome = !/\/project(?:\/|$)/.test(location.pathname);
if (isHome) {
  const skipIntro = location.hash === '#fields';
  if (skipIntro) {
    document.documentElement.dataset.entry = 'fields';
    // The chapter owns this destination; native restoration can otherwise
    // overwrite it after pageshow with a half-finished zoom position.
    history.scrollRestoration = 'manual';
  }
  else document.documentElement.dataset.intro='loading';
  window.__homeIntroBoot={skip:skipIntro,startedAt:performance.now(),fail(){
    if(!document.documentElement.dataset.intro)return;
    document.documentElement.dataset.intro='error';
    const overlay=document.querySelector('#home-loader');
    if(overlay){overlay.setAttribute('role','group');overlay.setAttribute('aria-label',document.documentElement.lang==='ar'?'تعذّر التحميل':'Loading failed');}
    const message=document.querySelector('.loader-error');if(message)message.hidden=false;
  }};
  if (!skipIntro) window.__homeIntroBoot.watchdog=setTimeout(()=>window.__homeIntroBoot.fail(),30000);
}
