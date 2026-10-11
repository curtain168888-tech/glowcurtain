/* 織光窗簾 空間作品集（橫式）— 頁面產生器；資料在 data.js（由 build.py 產生） */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad2 = n => String(n).padStart(2, '0');
const TYPE = Object.fromEntries(DATA.types.map(t => [t.key, t]));
Object.entries(DATA.extraTypes).forEach(([k, v]) => { TYPE[k] = { key: k, zh: v.zh, en: v.en, extra: true }; });
const SPACE = Object.fromEntries(DATA.spaces.map(s => [s.id, s]));
let NAV = {};
// 頁內連結：href 讓 PDF 可點；data-goto 給翻頁器用
const L = (n, inner, cls = '', attrs = '') => `<a class="goto${cls ? ' ' + cls : ''}" data-goto="${n}" href="#p${n}"${attrs}>${inner}</a>`;
const ICON_BOLT = '<svg viewBox="0 0 12 16" width="11" height="15" aria-hidden="true"><path d="M7.2 0 0 9.2h4.6L3.6 16 12 6.2H7.1z"/></svg>';
const ICON_IX = '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><rect x="1" y="1" width="5" height="5"/><rect x="8" y="1" width="5" height="5"/><rect x="1" y="8" width="5" height="5"/><rect x="8" y="8" width="5" height="5"/></svg>';

function plan() {
  const pages = [{ kind: 'cover' }, { kind: 'intro' }, { kind: 'toc' }, { kind: 'matrix' }, { kind: 'guide' }, { kind: 'motor' }, { kind: 'motor2' }];
  DATA.types.forEach((t, i) => pages.push({ kind: 'feat', t, num: i + 1 }));
  DATA.spaces.forEach((s, i) => {
    pages.push({ kind: 'div', space: s, num: i + 1 });
    DATA.cases[s.id].forEach((c, j) => pages.push({ kind: 'case', space: s, num: i + 1, c, j }));
  });
  pages.push({ kind: 'process' }, { kind: 'back' });
  pages.forEach((p, i) => p.no = i + 1);
  return pages;
}

function photo(idx, opts = {}) {
  const m = DATA.photos[idx];
  if (!m) return '';
  const cap = opts.cap === false || !m.label ? '' : `<span class="cap">${esc(m.label)}</span>`;
  const tag = opts.tag ? `<span class="tag">${esc(opts.tag)}</span>` : '';
  const pos = opts.pos ? ` style="object-position:${opts.pos}"` : '';
  return `<div class="ph${opts.cls ? ' ' + opts.cls : ''}"><img src="${m.src}" alt="${esc((opts.alt || '') + (m.label ? '・' + m.label : ''))}" loading="lazy" decoding="async"${pos}>${cap}${tag}</div>`;
}

function run(p, left, o = {}) {
  const nv = (n, t, cls) => p.no === n ? `<span class="nv on${cls}" aria-current="page">${t}</span>` : L(n, t, 'nv' + cls);
  return `<header class="run${o.dark ? ' dark' : ''}"><span class="crumbs">${left}</span>
    <nav class="pnav" aria-label="快速導覽">${nv(NAV.toc, ICON_IX + '目錄', ' nv-ix')}${nv(NAV.matrix, '對照表', '')}${o.pno === false ? '' : `<span class="pno">${pad2(p.no)}</span>`}</nav></header>`;
}

function render(p, all) {
  const first = (pred) => (all.find(pred) || {}).no;
  const divOf = id => first(x => x.kind === 'div' && x.space.id === id);
  const caseOf = (id, type) => first(x => x.kind === 'case' && x.space.id === id && x.c.type === type);
  const featOf = k => NAV.feat[k];
  const motorBadge = (txt) => L(NAV.motor, `${ICON_BOLT}<span>${txt || '可加價升級電動'}</span><i>p.${pad2(NAV.motor)}</i>`, 'mbadge');
  const nCases = new Set(Object.values(DATA.photos).map(m => m.case).filter(c => c && !/^(未分類|工廠|高溫)/.test(c))).size;
  const nPhotos = Object.keys(DATA.photos).length;

  switch (p.kind) {
    case 'cover': return `<section class="pg pg-cover">
      ${photo(DATA.cover, { cap: false, alt: '客廳一布一紗' })}<div class="cv-light"></div>${run(p, '', { pno: false, dark: true })}
      <div class="cv-panel">
        <div class="cv-mark"><span class="cv-zh">織光窗簾</span><span class="cv-en">GLOWCURTAIN</span></div>
        <div class="cv-title"><p class="eyebrow">Portfolio 2026</p><h1>空間<br>作品集</h1>
          <p class="cv-sub">先選空間，再挑窗簾。</p></div>
        <div class="cv-foot"><span>全台服務</span><span>免費到府丈量</span><span>${DATA.contact.site}</span></div>
      </div></section>`;

    case 'intro': return `<section class="pg pg-intro">${run(p, '<b>關於織光</b>')}
      <div class="intro-txt">
        <p class="eyebrow">About</p><h2>讓光線，溫柔穿透</h2>
        <p class="lead">織光窗簾深耕窗飾設計多年，以透明誠信與專業規劃為本。從丈量、選料到安裝，依照每扇窗的方位、用途與家人的作息，挑出最合適的款式。</p>
        <div class="facts">
          <div><b>全台</b><span>服務範圍</span></div><div><b>免費</b><span>到府丈量</span></div>
          <div><b>11 種</b><span>窗簾款式</span></div>${L(NAV.motor, `<b>電動</b><span>每款都能加價升級</span>`, 'fact-link')}
        </div>
        <div class="howto">
          <div><b>1　先找空間</b><p>依空間分成 ${DATA.spaces.length} 章，從客廳到商業空間，先翻到你要佈置的地方。</p></div>
          <div><b>2　再看種類</b><p>每章依窗簾種類分頁，看實際案例，了解為什麼適合這個空間。</p></div>
          <div><b>3　拿頁碼詢價</b><p>看到喜歡的，記下頁碼告訴業務，就能以同款式估價。</p></div>
        </div>
        <nav class="sp-index"><span class="eyebrow">空間索引</span><div>${DATA.spaces.map((s, i) => `${L(divOf(s.id), `<i>${pad2(i + 1)}</i>${s.zh}<em class="pno">p.${pad2(divOf(s.id))}</em>`)}`).join('')}</div></nav>
      </div>
      <div class="intro-ph">${photo(DATA.intro[0], { alt: '布簾細節' })}${photo(DATA.intro[1], { alt: '一布一紗細節' })}</div></section>`;

    case 'toc': {
      const rows = DATA.spaces.map((s, i) => {
        const d = divOf(s.id);
        const cs = all.filter(x => x.kind === 'case' && x.space.id === s.id);
        const chips = cs.map(x => L(x.no, `${TYPE[x.c.type].zh}${x.c.title === '換裝前後' ? '・換裝前後' : ''}<i>${pad2(x.no)}</i>`, 'ix-t', ` title="${esc(x.c.title)}"`)).join('');
        return `<div class="ix-row">${L(d, `${photo(DATA.heroes[s.id], { cap: false, alt: s.zh })}<span class="n">${pad2(i + 1)}</span><span class="nm"><b>${s.zh}</b><small>${s.en}</small></span><span class="pg-n">p.${pad2(d)}</span>`, 'ix-sp')}
          <div class="ix-types">${chips}</div></div>`;
      }).join('');
      const quick = [['空間 × 窗簾對照表', 'matrix'], ['窗簾種類一覽', 'guide'], ['服務流程', 'process'], ['聯絡我們', 'back']]
        .map(([t, k]) => { const n = first(x => x.kind === k); return L(n, `${t}<i>${pad2(n)}</i>`, 'ix-q'); }).join('');
      const fchips = DATA.types.map(t => L(featOf(t.key), `${t.zh.replace('／仿木百葉', '')}<i>${pad2(featOf(t.key))}</i>`, 'ix-t')).join('');
      const frow = `<div class="ix-row ix-feat">${L(featOf(DATA.types[0].key), `<span class="ix-ico">${ICON_IX}</span><span class="n">—</span><span class="nm"><b>窗簾特色</b><small>Features</small></span><span class="pg-n">p.${pad2(featOf(DATA.types[0].key))}</span>`, 'ix-sp')}
          <div class="ix-types">${fchips}</div></div>`;
      const motor = L(NAV.motor, `<span class="mb-ico">${ICON_BOLT}</span><span class="mb-t"><b>可加價升級電動窗簾</b><small>每一種窗簾都能升級，高窗、大面窗一鍵開合</small></span><i>p.${pad2(NAV.motor)}</i>`, 'ix-motor');
      return `<section class="pg pg-toc">${run(p, '<b>目錄</b>')}
        <div class="ix-head"><div><h2>目錄</h2><p>點空間看整章；點窗簾種類，直接翻到案例頁。每一頁右上角都能回到這裡。</p></div><div class="ix-right">${motor}<nav class="ix-quick">${quick}</nav></div></div>
        <div class="ix-rows">${frow}${rows}</div></section>`;
    }

    case 'matrix': {
      const head = DATA.types.map(t => `<th>${t.zh.replace('／仿木百葉', '')}<small>${t.en.split(' ')[0]}</small></th>`).join('');
      const rows = DATA.spaces.map(s => `<tr><th>${s.zh}<small>${s.en.toUpperCase()}</small></th>${DATA.types.map(t => {
        const v = s.matrix[t.key], cls = v === '●' ? 's-top' : v === '○' ? 's-ok' : 's-no';
        const note = DATA.notes[s.id + '|' + t.key];
        const pg = caseOf(s.id, t.key);
        const inner = `<span class="sym">${v === '–' ? '—' : v}</span>${note ? `<span class="nt">${note}</span>` : ''}`;
        return `<td class="${cls}">${pg ? L(pg, `${inner}<em>p.${pad2(pg)}</em>`, 'has') : inner}</td>`;
      }).join('')}</tr>`).join('');
      return `<section class="pg pg-matrix">${run(p, '<b>空間 × 窗簾對照表</b>')}
        <div class="mx-head"><div><p class="eyebrow">Space × Style</p><h2>這個空間，適合哪種窗簾？</h2></div>
        <p>依官網 11 種窗簾整理。標示頁碼的格子，本冊收錄了實際案例，點一下就能翻到該頁。</p></div>
        <table class="mx"><colgroup><col class="c0">${DATA.types.map(()=>"<col>").join("")}</colgroup><thead><tr><th></th>${head}</tr></thead><tbody>${rows}</tbody></table>
        <div class="mx-legend"><span><b>●</b>首選</span><span><b class="o">○</b>適合</span><span><b class="x">—</b>不建議</span><span><em>p.00</em>有案例照片</span></div></section>`;
    }

    case 'guide': {
      const items = DATA.types.map(t => {
        const where = all.filter(x => x.kind === 'case' && x.c.type === t.key);
        const uniq = [...new Map(where.map(w => [w.space.id, w])).values()];
        const ph = DATA.guide[t.key] != null ? photo(DATA.guide[t.key], { cap: false, alt: t.zh }) : `<div class="ph g-ph-none">案例照片<br>待補</div>`;
        return `<div class="g-item">${ph}<div class="g-txt"><h4>${L(featOf(t.key), `${t.zh}<small>${t.en}</small>`, 'g-feat')}</h4><p>${t.desc}</p>
          <p class="g-in">${uniq.length ? '案例：' + uniq.map(w => L(w.no, `${w.space.zh} p.${pad2(w.no)}`)).join('、') : '本冊尚無案例'}</p></div></div>`;
      }).join('');
      const roman = first(x => x.kind === 'case' && x.c.type === 'roman');
      return `<section class="pg pg-guide">${run(p, '<b>窗簾種類一覽</b>')}<h2>窗簾種類一覽</h2>
        <div class="guide">${items}<div class="g-other"><h4>其他款式</h4>
        <p>官網分類以外，本冊也收錄${L(roman, `羅馬簾（p.${pad2(roman)}）`)}。穿透簾的案例以直立式為主。</p>
        <p>每一種窗簾都能${L(NAV.motor, '加價升級電動（p.' + pad2(NAV.motor) + '）')}。</p></div></div></section>`;
    }

    case 'feat': {
      const t = p.t, f = DATA.features[t.key];
      const best = DATA.spaces.filter(s => s.matrix[t.key] === '●');
      const ok = DATA.spaces.filter(s => s.matrix[t.key] === '○');
      const cases = all.filter(x => x.kind === 'case' && x.c.type === t.key);
      const feats = f.feats.map((x, i) => `<li><span class="n">${pad2(i + 1)}</span><div><b>${x.t}</b><p>${x.d}</p></div></li>`).join('');
      const [a, b, c] = f.photos;
      return `<section class="pg pg-feat">${run(p, `<b>窗簾特色</b><i>／</i>${pad2(p.num)} ${t.zh}`)}
        <div class="feat-txt">
          <p class="eyebrow">Features ${pad2(p.num)} / ${pad2(DATA.types.length)}</p>
          <h2>${t.zh}<small>${t.en}</small></h2>
          <p class="feat-tag">${f.tag}</p>
          <ol class="feat-list">${feats}</ol>
          ${f.note ? `<p class="feat-note"><b>小提醒</b>${f.note}</p>` : ''}
          <div class="feat-meta">
            <div><span class="k">最適合</span><span class="v">${best.map(s => L(divOf(s.id), s.zh)).join('、') || '—'}</span></div>
            ${ok.length ? `<div><span class="k">也適合</span><span class="v">${ok.map(s => L(divOf(s.id), s.zh)).join('、')}</span></div>` : ''}
            <div><span class="k">看案例</span><span class="v">${cases.length ? cases.map(x => L(x.no, `${x.space.zh} p.${pad2(x.no)}`)).join('、') : '—'}</span></div>
          </div>
          ${motorBadge('可加價升級電動｜' + f.motor)}
        </div>
        <div class="feat-ph">${photo(a, { alt: t.zh, cls: 'big' })}${photo(b, { alt: t.zh })}${photo(c, { alt: t.zh })}</div></section>`;
    }

    case 'motor': {
      const M = DATA.motor;
      const ben = M.benefits.map((x, i) => `<div class="mb-card"><span class="n">${pad2(i + 1)}</span><b>${x.t}</b><p>${x.d}</p></div>`).join('');
      return `<section class="pg pg-motor">${run(p, `<b>電動升級</b>`)}
        <div class="mo-txt">
          <p class="eyebrow">${ICON_BOLT} Motorized Upgrade</p>
          <h2>加價升級<br>電動窗簾</h2>
          <p class="lead">每一種窗簾都能升級電動。高窗、大面窗、厚重的遮光布，按一下就能開合，不必再踮腳拉、用力拉。</p>
          <div class="mb-grid">${ben}</div>
          <div class="mo-types"><span class="k">這些款式都能升級・點了看特色</span><div>${DATA.types.map(t => L(featOf(t.key), t.zh.replace('／仿木百葉', ''))).join('')}</div></div>
          <div class="mo-cta"><b>官網線上估價，可直接選「電動升級」一起試算</b><p>電機數量依窗簾款式與單開、雙開而定；電機與操作方式由專人在丈量時說明。</p></div>
        </div>
        <div class="mo-ph">${photo(M.photos[0], { alt: '電動窗簾情境', cls: 'wide' })}${photo(M.photos[1], { alt: '電動窗簾情境' })}${photo(M.photos[2], { alt: '電動窗簾情境' })}</div></section>`;
    }

    case 'motor2': {
      const M = DATA.motor;
      const groups = M.groups.map(g => `<div class="mg"><b>${ICON_BOLT}${g.t}</b><div class="mg-types">${g.types.map(k => L(featOf(k), TYPE[k].zh.replace('／仿木百葉', ''))).join('')}</div></div>`).join('');
      const scenes = M.scenes.map(x => `<div class="sc">${photo(x.photo, { cap: false, alt: x.t })}<b>${x.t}</b><p>${x.d}</p></div>`).join('');
      return `<section class="pg pg-motor2">${run(p, `<b>電動升級</b><i>／</i>款式與情境`)}
        <div class="m2-head"><div><p class="eyebrow">${ICON_BOLT} Which & Where</p><h2>每一種窗簾，都能升級電動</h2></div>
          <p>官網估價的「電動升級」選項依下面的電機數量計算；一布一紗有兩道軌道，電機數量加倍。</p></div>
        <div class="m2-groups">${groups}</div>
        <h3 class="m2-sub">哪些窗最適合電動？</h3>
        <div class="m2-scenes">${scenes}</div></section>`;
    }

    case 'div': {
      const s = p.space;
      const list = all.filter(x => x.kind === 'case' && x.space.id === s.id)
        .map(x => L(x.no, `<b>${TYPE[x.c.type].zh}<span>${esc(x.c.title)}</span></b><i>p.${pad2(x.no)}</i>`)).join('');
      const hero = DATA.heroes[s.id];
      return `<section class="pg pg-div">${photo(hero, { alt: s.zh })}${run(p, '', { dark: true })}
        <div class="div-panel"><span class="div-n">${pad2(p.num)}</span><div><h2>${s.zh}</h2><p class="div-en">${s.en}</p></div>
          <p class="div-intro">${s.intro}</p><div class="chips">${s.needs.map(n => `<span>${n}</span>`).join('')}</div>
          <div class="div-list">${list}</div></div></section>`;
    }

    case 'case': {
      const c = p.c, s = p.space, t = TYPE[c.type];
      const ph = c.photos.slice(0, 5);
      const tags = c.title === '換裝前後' ? ['換裝前', '換裝後'] : [];
      const labels = [...new Set(ph.map(i => DATA.photos[i].label).filter(Boolean))];
      const grid = ph.map((i, k) => photo(i, { tag: tags[k], alt: `${s.zh}${t.zh}` })).join('');
      const ft = featOf(c.type);
      const typeLabel = ft ? L(ft, `<b>${t.zh}</b><span class="eyebrow">${t.en}</span><em class="ft-link">特色 p.${pad2(ft)}</em>`, 'case-type') : `<div class="case-type"><b>${t.zh}</b><span class="eyebrow">${t.en}</span></div>`;
      const gcls = c.lay === 'w' ? `gw${ph.length}` : `g${ph.length}`;
      return `<section class="pg pg-case">${run(p, `${L(divOf(s.id), `${pad2(p.num)} ${s.zh}`, 'crumb')}<i>／</i><b>${t.zh}</b>`)}
        <div class="case-txt">${typeLabel}
          <h3>${esc(c.title)}</h3><p class="body">${esc(c.body)}</p>
          <div class="chips">${c.points.map(x => `<span>${esc(x)}</span>`).join('')}</div>
          <div class="case-foot">${motorBadge()}${labels.length ? `<dl class="case-where"><dt>案例</dt><dd>${labels.map(esc).join('<br>')}</dd></dl>` : ''}</div></div>
        <div class="case-grid ${gcls}">${grid}</div></section>`;
    }

    case 'process': return `<section class="pg pg-process">${run(p, '<b>服務流程</b>')}
      <div><p class="eyebrow">How we work</p><h2>從估價到安裝</h2></div>
      <ol class="steps">${DATA.process.map((s, i) => `<li><span class="n">${pad2(i + 1)}</span><b>${s.title}</b><p>${s.body}</p></li>`).join('')}</ol>
      <div class="proc-ph">${[DATA.process[2].photo, DATA.process[4].photo, ...DATA.processExtra].map((i, k) =>
        photo(i, { cap: false, tag: ['挑選布樣', '到府安裝', '現場調整', '細部整理'][k] })).join('')}</div></section>`;

    case 'back': {
      const C = DATA.contact;
      const row = (k, title, url, text) => `<div class="qr-row"><div class="qr">${DATA.qr[k]}</div><a href="${url}" target="_blank" rel="noopener"><b>${title}</b><span>${text}</span></a></div>`;
      return `<section class="pg pg-back">${run(p, '', { dark: true })}
        <div class="bk-l"><div class="cv-mark"><span class="cv-zh">織光窗簾</span><span class="cv-en">GLOWCURTAIN</span></div>
          <div style="display:flex;flex-direction:column;gap:22px"><h2>為你的窗，<br>挑對<em>一種光</em>。</h2>
          <p class="lead">看到喜歡的案例，記下頁碼告訴我們。全台服務，免費到府丈量。</p></div>
          <div class="bk-tel"><span>專人諮詢　${C.name}</span><b>${C.phone}</b></div></div>
        <div class="bk-r">
          ${row('site', '官網線上估價', 'https://www.' + C.site, C.site + '　輸入寬 × 高即可試算')}
          ${row('line', 'LINE 預約丈量', 'https://' + C.line, C.line)}
          ${row('ig', '更多作品', 'https://www.' + C.ig + '/', '@glowcurtain')}
        </div></section>`;
    }
  }
}

function renderAll() {
  const pages = plan();
  NAV = { toc: pages.find(p => p.kind === 'toc').no, matrix: pages.find(p => p.kind === 'matrix').no, motor: pages.find(p => p.kind === 'motor').no,
    feat: Object.fromEntries(pages.filter(p => p.kind === 'feat').map(p => [p.t.key, p.no])) };
  return { pages, html: pages.map(p => render(p, pages).replace('<section class="pg', `<section id="p${p.no}" class="pg`)) };
}
