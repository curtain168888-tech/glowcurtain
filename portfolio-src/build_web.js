// 作品集網頁版：把 70 頁預先輸出成 HTML（SEO 可讀、沒有 JS 也能看），圖片換成 WebP srcset。
// 用法：node portfolio-src/build_web.js（預設輸出到 ../portfolio）
// 文字、版型改 data.js / core.js / core.css / web.css / web.js 後重跑即可；照片已輸出在 portfolio/img（尺寸記在 web_dims.json）
const fs = require('fs'), vm = require('vm'), path = require('path'), crypto = require('crypto');
const SRC = __dirname, OUT = process.argv[2] || path.join(__dirname, '..', 'portfolio');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');

const ctx = {}; vm.createContext(ctx);
vm.runInContext(read('data.js') + read('core.js') + ';this.R = renderAll(); this.D = DATA; this.T = TYPE; this.NAVX = NAV;', ctx);
const { pages, html } = ctx.R, D = ctx.D, TYPE = ctx.T, NAV = ctx.NAVX;
const DIMS = JSON.parse(read('web_dims.json'));
const N = pages.length;
const pad2 = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SITE = 'https://www.glowcurtain.com.tw';
const LINE = 'https://' + D.contact.line;
const SITE_TYPES = new Set(D.types.map(t => t.key));
const short = k => TYPE[k].zh.replace('／仿木百葉', '');

const label = p => {
  if (p.kind === 'case') return `${p.space.zh}・${TYPE[p.c.type].zh}`;
  if (p.kind === 'div') return p.space.zh;
  if (p.kind === 'feat') return `窗簾特色・${p.t.zh}`;
  return { cover: '封面', intro: '關於織光', toc: '目錄', matrix: '空間 × 窗簾對照表', guide: '窗簾種類一覽', motor: '電動升級', motor2: '電動升級・款式與情境', process: '服務流程', back: '聯絡我們' }[p.kind];
};
// 每頁對應的線上試算款式（官網報價有的款式才帶參數）
const styleOf = p => p.kind === 'case' ? (SITE_TYPES.has(p.c.type) ? p.c.type : '') : p.kind === 'feat' ? p.t.key : (p.kind === 'motor' || p.kind === 'motor2') ? 'motor' : '';
const quoteHref = s => s === 'motor' ? '/?motor=1#quote' : s ? `/?style=${s}#quote` : '/#quote';

const SIZES = {
  big: '(max-width: 899px) 100vw, 900px',
  small: '(max-width: 599px) 50vw, (max-width: 899px) 34vw, 520px',
  tiny: '(max-width: 899px) 120px, 200px',
};

function images(h, p) {
  const cg = h.indexOf('class="case-grid');
  let firstDone = false;
  return h.replace(/<div class="ph([^"]*)"><img src="img\/p(\d+)\.jpg" alt="([^"]*)" loading="lazy" decoding="async"((?: style="[^"]*")?)>/g,
    (m, cls, i, alt, style, off) => {
      const dm = DIMS[i];
      if (!dm) throw new Error('no dims for photo ' + i);
      let role = 'small';
      if (p.kind === 'cover' || p.kind === 'div' || /\b(big|wide)\b/.test(cls)) role = 'big';
      else if (p.kind === 'case' && cg >= 0 && off > cg && !firstDone) { role = 'big'; firstDone = true; }
      else if (p.kind === 'toc' || p.kind === 'guide') role = 'tiny';
      const [lw, lh] = dm.l, pt = lh > lw * 1.05;
      const srcset = `img/p${i}-s.webp ${dm.s[0]}w, img/p${i}-m.webp ${dm.m[0]}w, img/p${i}.webp ${lw}w`;
      const load = p.no === 1 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
      return `<div class="ph${cls}${pt ? ' is-pt' : ''}"><img src="img/p${i}.webp" srcset="${srcset}" sizes="${SIZES[role]}" width="${lw}" height="${lh}" alt="${alt}" ${load} decoding="async"${style}>`;
    });
}

function webOnly(h, p) {
  if (p.kind === 'matrix') {
    h = h.replace('<table class="mx">', '<p class="mx-hint" aria-hidden="true">← 左右滑動，看全部 11 種窗簾 →</p><div class="mx-wrap"><table class="mx">').replace('</table>', '</table></div>');
  }
  if (p.kind === 'back') {
    const C = D.contact, tel = C.phone.replace(/\D/g, '');
    h = h.replace(`<b>${C.phone}</b>`, `<a href="tel:${tel}" data-cta="phone"><b>${C.phone}</b></a>`)
      .replace(`<a href="https://www.${C.site}" target="_blank" rel="noopener">`, '<a href="/#quote" data-cta="quote">')
      .replace(`<a href="https://${C.line}" target="_blank" rel="noopener">`, `<a href="https://${C.line}" target="_blank" rel="noopener" data-cta="line">`)
      .replace(`<a href="https://www.${C.ig}/" target="_blank" rel="noopener">`, `<a href="https://www.${C.ig}/" target="_blank" rel="noopener" data-cta="ig">`);
  }
  const s = styleOf(p);
  if (s) {
    const main = s === 'motor' ? '試算電動升級' : `用「${short(s)}」線上試算`;
    const cta = `<div class="web-cta"><a class="wc-main" href="${quoteHref(s)}" data-cta="quote">${main}<span aria-hidden="true">→</span></a><a class="wc-line" href="${LINE}" target="_blank" rel="noopener" data-cta="line">LINE 詢問・預約丈量</a></div>`;
    const k = h.lastIndexOf('</section>');
    h = h.slice(0, k) + cta + h.slice(k);
  }
  return h;
}

const pageHtml = pages.map((p, i) => `<div class="page" data-no="${p.no}">${webOnly(images(html[i], p), p)}</div>`).join('\n');
const META = pages.map(p => ({ l: label(p), s: styleOf(p) }));

// 目錄抽屜（預先輸出，沒有 JS 也能點）
const A = (n, inner) => `<a class="goto" data-goto="${n}" href="#p${n}">${inner}</a>`;
const first = k => pages.find(x => x.kind === k).no;
const feats = pages.filter(x => x.kind === 'feat');
let drawer = [['目錄', 'toc'], ['空間 × 窗簾對照表', 'matrix'], ['窗簾種類一覽', 'guide']].map(([t, k]) =>
  `<li class="ch">${A(first(k), `<span class="n">—</span><span>${t}</span><span class="pnum">${pad2(first(k))}</span>`)}</li>`).join('');
drawer += `<li class="ch hl">${A(NAV.motor, `<span class="n">⚡</span><span>加價升級電動窗簾</span><span class="pnum">${pad2(NAV.motor)}</span>`)}</li>`;
drawer += `<li class="ch">${A(feats[0].no, `<span class="n">—</span><span>窗簾特色</span><span class="pnum">${pad2(feats[0].no)}</span>`)}
  <ul class="sub">${feats.map(p => `<li>${A(p.no, `<span></span><span><span class="t">${p.t.zh}</span></span><span class="pnum">${pad2(p.no)}</span>`)}</li>`).join('')}</ul></li>`;
drawer += D.spaces.map((s, i) => {
  const dv = pages.find(p => p.kind === 'div' && p.space.id === s.id);
  const cs = pages.filter(p => p.kind === 'case' && p.space.id === s.id);
  return `<li class="ch">${A(dv.no, `<span class="n">${pad2(i + 1)}</span><span>${s.zh}</span><span class="pnum">${pad2(dv.no)}</span>`)}
  <ul class="sub">${cs.map(p => `<li>${A(p.no, `<span></span><span><span class="t">${TYPE[p.c.type].zh}</span>　${esc(p.c.title)}</span><span class="pnum">${pad2(p.no)}</span>`)}</li>`).join('')}</ul></li>`;
}).join('');
drawer += `<li class="ch">${A(first('process'), `<span class="n">—</span><span>服務流程・聯絡</span><span class="pnum">${pad2(first('process'))}</span>`)}</li>`;

// 靜態檔版本號（內容雜湊），避免快取舊檔
const css = read('core.css') + '\n' + read('web.css');
fs.writeFileSync(path.join(OUT, 'portfolio.css'), '/* 織光窗簾 空間作品集（網頁翻閱版）— 頁面版型 core.css ＋ 翻閱器／手機版 web.css，由 build_web.js 產生 */\n' + css);
fs.copyFileSync(path.join(SRC, 'web.js'), path.join(OUT, 'portfolio.js'));
const ver = f => crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 8);
const V = { css: ver('portfolio.css'), js: ver('portfolio.js'), pf: ver('page-flip.browser.js') };

const spacesTxt = D.spaces.map(s => s.zh).join('、');
const TITLE = '空間作品集｜織光窗簾 GlowCurtain';
const DESC = `織光窗簾空間作品集：${spacesTxt}的窗簾實際安裝案例。先選空間、再挑窗簾，捲簾、百葉、調光簾、風琴簾、穿透簾、片簾、布簾、紗簾、蛇形簾、一布一紗，每款都能加價升級電動窗簾。線上翻閱，看到喜歡的款式直接線上試算。`;
const URL = SITE + '/portfolio/';
const OG = SITE + '/portfolio/og.jpg';
const ld = [
  { '@context': 'https://schema.org', '@type': 'CollectionPage', name: '織光窗簾 空間作品集', url: URL, inLanguage: 'zh-Hant-TW', description: DESC,
    primaryImageOfPage: OG, isPartOf: { '@type': 'WebSite', name: '織光窗簾 GlowCurtain', url: SITE + '/' },
    publisher: { '@type': 'Organization', name: '織光窗簾 GlowCurtain', url: SITE + '/' } },
  { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: '空間作品集', item: URL }] },
];

const ICON_IX = '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><rect x="1" y="1" width="5" height="5"/><rect x="8" y="1" width="5" height="5"/><rect x="1" y="8" width="5" height="5"/><rect x="8" y="8" width="5" height="5"/></svg>';

const out = `<!DOCTYPE html>
<html lang="zh-Hant" data-mode="reflow">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-6PKFR414KT"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-6PKFR414KT');
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${URL}">
<meta name="theme-color" content="#232E36">
<link rel="icon" type="image/x-icon" href="/images/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:type" content="website">
<meta property="og:url" content="${URL}">
<meta property="og:image" content="${OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="zh_TW">
<meta property="og:site_name" content="織光窗簾 GlowCurtain">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${TITLE}">
<meta name="twitter:description" content="${DESC}">
<meta name="twitter:image" content="${OG}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script>
/* 決定閱讀模式（在畫面出現前）：寬 900 以下＝手機版排版；電腦、平板橫放＝翻頁；螢幕太矮或 ?view=scroll＝整頁上下捲動 */
(function(){var d=document.documentElement,w=window.innerWidth,h=window.innerHeight,
f=w>=900&&Math.min((w-120)/1400,(h-120)/1000)>=0.5,v=/[?&]view=scroll\\b/.test(location.search);
d.setAttribute('data-mode',w<900?'reflow':(f&&!v)?'flip':'scroll');d.setAttribute('data-canflip',f?'1':'0');})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+TC:wght@600&display=swap">
<link rel="stylesheet" href="portfolio.css?v=${V.css}">
</head>
<body>
<a class="skip goto" data-goto="3" href="#p3">跳到目錄</a>
<header class="tb" id="tb">
  <a class="tb-brand" href="/" data-cta="home" aria-label="回織光窗簾首頁"><b>織光窗簾</b><span>空間作品集</span></a>
  <div class="tb-mid">
    <button class="tb-btn round" id="prev" type="button" aria-label="上一頁">‹</button>
    <div class="tb-where" id="where" aria-live="polite"><b>01<i>/</i>${N}</b><span>封面</span></div>
    <button class="tb-btn round" id="next" type="button" aria-label="下一頁">›</button>
  </div>
  <div class="tb-tools">
    <button class="tb-btn" id="back" type="button" hidden></button>
    <a class="tb-btn hide-sm" id="view" href="?view=scroll" hidden>捲動閱讀</a>
    <button class="tb-btn hide-sm" id="fs" type="button" hidden>全螢幕</button>
    <button class="tb-btn" id="toc-open" type="button" aria-controls="toc" aria-expanded="false">${ICON_IX}<span>目錄</span></button>
    <a class="tb-btn tb-cta" id="cta" href="/#quote" data-cta="quote">線上試算</a>
  </div>
</header>
<main class="stage" id="stage" aria-label="織光窗簾 空間作品集">
  <button class="side side-prev" id="sprev" type="button" aria-label="上一頁">‹</button>
  <div class="fit" id="fit"><div class="book" id="book">
${pageHtml}
  </div></div>
  <button class="side side-next" id="snext" type="button" aria-label="下一頁">›</button>
  <p class="fb-loading" id="loading">作品集載入中…</p>
</main>
<div class="scrub" id="scrub"><span>01</span><input type="range" id="rng" min="1" max="${N}" value="1" aria-label="拖曳跳頁"><span>${N}</span></div>
<p class="pf-note">照片皆為織光窗簾實際施工案例，版權所有，請勿轉載。<a href="/">回官網首頁</a></p>
<nav class="actbar" aria-label="預約與估價"><a href="${LINE}" target="_blank" rel="noopener" data-cta="line">LINE 預約丈量</a><a class="primary" id="cta2" href="/#quote" data-cta="quote">線上試算報價</a></nav>
<div class="scrim" id="scrim" hidden></div>
<aside class="drawer" id="toc" hidden aria-label="作品集目錄">
  <div class="dr-head"><h2>目錄</h2><button class="tb-btn round" id="toc-close" type="button" aria-label="關閉目錄">×</button></div>
  <ul class="dr-list">${drawer}</ul>
  <p class="dr-hint">電腦：點頁面右側往後翻、左側往前翻，或用鍵盤方向鍵。平板：左右滑動翻頁。點頁面上的頁碼、窗簾種類會直接跳頁，跳頁後按上方「返回」回到原頁。</p>
</aside>
<script type="application/json" id="pf-meta">${JSON.stringify(META)}</script>
<script>window.PF_LIB='page-flip.browser.js?v=${V.pf}';</script>
<script src="portfolio.js?v=${V.js}" defer></script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), out);
console.log('pages', N, 'index.html', Math.round(out.length / 1024) + 'KB', V);
