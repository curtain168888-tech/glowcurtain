// 官網 header（選單）／footer 同步到其他頁面：從首頁 index.html 擷取，寫進各頁的標記區塊。
// 用法：node tools/sync-site-chrome.js
// 首頁的選單或頁尾改了以後執行一次，優惠活動頁與織光手札就會跟首頁一致。
// （空間作品集 /portfolio/ 由 portfolio-src/build_web.js 用同一套方式擷取，首頁改了也要重跑那支。）
//
// 各頁需要的標記（內容整段由本腳本產生，請勿手改）：
//   <head> 內、頁面自己的 <style> 之前：<!-- SITE-CHROME-HEAD --> … <!-- /SITE-CHROME-HEAD -->
//   <body> 開頭：<!-- SITE-HEADER --> … <!-- /SITE-HEADER -->
//   頁尾：      <!-- SITE-FOOTER --> … <!-- /SITE-FOOTER -->
//   </body> 前：<!-- SITE-MENU-JS --> … <!-- /SITE-MENU-JS -->
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const HOME = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// 要同步的頁面；current：在選單上標示為目前所在的連結
const TARGETS = [
  { file: 'promo/index.html', current: '/promo/', ariaCurrent: true },
  { file: 'promo/resident-share/index.html', current: '/promo/', ariaCurrent: false },
  { file: 'journal/index.html', current: '/journal/', ariaCurrent: true },
  { file: 'journal/fabric-vs-dimming/index.html', current: '/journal/', ariaCurrent: false },
  { file: 'journal/bedroom-curtains/index.html', current: '/journal/', ariaCurrent: false },
  { file: 'journal/motorized-curtains/index.html', current: '/journal/', ariaCurrent: false },
  { file: 'journal/heat-setting/index.html', current: '/journal/', ariaCurrent: false },
  { file: 'journal/honeycomb-shades/index.html', current: '/journal/', ariaCurrent: false },
  { file: 'journal/living-room-windows/index.html', current: '/journal/', ariaCurrent: false },
  { file: 'journal/quote-to-install/index.html', current: '/journal/', ariaCurrent: false },
];

const grab = (re, what) => { const m = HOME.match(re); if (!m) throw new Error('首頁找不到 ' + what); return m[0]; };
const chromeHtml = h => h
  .replace(/\s+data-cid(?:-alt)?="[^"]*"/g, '')                 // data-cid 只留在首頁，避免對照表重複
  .replace(/(<a\b[^>]*?\s)href="#([^"]+)"/g, '$1href="/#$2"');   // 首頁錨點改成回首頁的連結（不動 <use href="#icon">）
const header = chromeHtml(grab(/<header class="site" id="siteHeader">[\s\S]*?<\/header>/, 'header'))
  .replace(/(<img class="logo-mark"[^>]*>)/, '<a class="logo-home" href="/" aria-label="回織光窗簾首頁">$1</a>');
const footer = chromeHtml(grab(/<footer id="contact">[\s\S]*?<\/footer>/, 'footer'));
const PROMO_END = (HOME.match(/window\.GC_PROMO_END = '([^']+)'/) || [])[1] || '';

// 首頁 CSS：讀全部 <style>，只取 :root 變數與 header／footer 用到的規則（含 @media 內的）
const homeCss = Array.from(HOME.matchAll(/<style>([\s\S]*?)<\/style>/g), m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
function cssBlocks(text) {
  const out = []; let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i); if (open < 0) break;
    const sel = text.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < text.length && depth) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
    out.push({ sel, body: text.slice(open + 1, j - 1) }); i = j;
  }
  return out;
}
const WANT = /(^|[\s,>+~])(:root|header\.site|\.nav-inner|\.logo(?!-)|\.logo-mark|\.logo-home|nav\.links|\.nav-cta|\.menu-toggle|footer|\.footer-|\.flogo|\.ig-link|\.wrap\b)/;
const pickRules = blocks => blocks.filter(b => !b.sel.startsWith('@') && WANT.test(b.sel) && !/intro/.test(b.sel)).map(b => `${b.sel}{${b.body.trim()}}`);
const chromeCss = cssBlocks(homeCss).map(b => {
  if (b.sel.startsWith('@media')) { const inner = pickRules(cssBlocks(b.body)); return inner.length ? `${b.sel}{\n${inner.join('\n')}\n}` : ''; }
  if (b.sel.startsWith('@')) return '';
  return pickRules([b]).join('');
}).filter(Boolean).join('\n');

const BASE_CSS = `header.site, footer{ font-family:var(--font-base); line-height:1.7; -webkit-font-smoothing:antialiased; color:var(--ink); }
header.site *, footer *{ box-sizing:border-box; }
header.site img, footer img{ max-width:100%; display:block; }
header.site a, footer a{ color:inherit; }
header.site button{ font-family:inherit; }`;
const AFTER_CSS = `.logo-mark{ opacity:1; transform:none; }
.logo-home{ display:block; min-width:0; }
nav.links a.is-current{ color:var(--gold-deep); }
nav.links a.is-current::after{ width:100%; }
.promo-ended .js-promo{ display:none !important; }
footer h3{ letter-spacing:0.01em; }`;

const HEAD_BLOCK = `<!-- SITE-CHROME-HEAD -->
<!-- 官網 header／footer 樣式：tools/sync-site-chrome.js 從首頁擷取，請改首頁後重跑，勿手改 -->
<script>try { if (${JSON.stringify(PROMO_END)} && Date.now() > Date.parse(${JSON.stringify(PROMO_END)})) document.documentElement.classList.add('promo-ended'); } catch (e) {}</script>
<style>
${BASE_CSS}
${chromeCss}
${AFTER_CSS}
</style>
<!-- /SITE-CHROME-HEAD -->`;
const MENU_JS = `<!-- SITE-MENU-JS -->
<script>
  // 官網選單：手機／窄螢幕（960px 以下）漢堡選單開合，與首頁相同
  (function(){
    var h = document.getElementById('siteHeader'), t = document.getElementById('menuToggle'), n = document.getElementById('navLinks');
    if (!h || !t || !n) return;
    function set(open){ h.classList.toggle('nav-open', open); t.setAttribute('aria-expanded', String(open)); }
    t.addEventListener('click', function(){ set(!h.classList.contains('nav-open')); });
    Array.prototype.forEach.call(n.querySelectorAll('a'), function(a){ a.addEventListener('click', function(){ set(false); }); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape') set(false); });
    window.addEventListener('resize', function(){ if (window.innerWidth > 960) set(false); });
  })();
</script>
<!-- /SITE-MENU-JS -->`;

function put(html, name, content, file) {
  const re = new RegExp(`<!-- ${name} -->[\\s\\S]*?<!-- /${name} -->`);
  if (!re.test(html)) throw new Error(`${file} 找不到標記 <!-- ${name} -->`);
  return html.replace(re, () => content);
}

for (const t of TARGETS) {
  const fp = path.join(ROOT, t.file);
  let html = fs.readFileSync(fp, 'utf8');
  const cur = `<a class="nav-promo" href="${t.current}">`;
  let hdr = header;
  if (hdr.includes(cur)) hdr = hdr.replace(cur, `<a class="nav-promo is-current" href="${t.current}"${t.ariaCurrent ? ' aria-current="page"' : ''}>`);
  else hdr = hdr.replace(`<a href="${t.current}">`, `<a href="${t.current}" class="is-current"${t.ariaCurrent ? ' aria-current="page"' : ''}>`);
  html = put(html, 'SITE-CHROME-HEAD', HEAD_BLOCK, t.file);
  html = put(html, 'SITE-HEADER', `<!-- SITE-HEADER -->\n${hdr}\n<!-- /SITE-HEADER -->`, t.file);
  html = put(html, 'SITE-FOOTER', `<!-- SITE-FOOTER -->\n${footer}\n<!-- /SITE-FOOTER -->`, t.file);
  html = put(html, 'SITE-MENU-JS', MENU_JS, t.file);
  fs.writeFileSync(fp, html);
  console.log('synced', t.file);
}
