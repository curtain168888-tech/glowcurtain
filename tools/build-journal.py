#!/usr/bin/env python3
"""織光手札產生器：python3 tools/build-journal.py
從 tools/journal_articles.py 的文章資料產生 /journal/<slug>/index.html，並重寫列表頁的文章卡片與 JSON-LD、sitemap。
產生後請再跑 node tools/sync-site-chrome.js（同步官網選單與頁尾）。"""
import re, json, html, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from journal_articles import ARTICLES, STYLES, CATS  # noqa: E402

SITE = 'https://www.glowcurtain.com.tw'
TEMPLATE = os.path.join(ROOT, 'tools', 'journal-template.html')  # 文章頁外框（head、header、footer）
esc = html.escape

def img_dims(name):
    from PIL import Image
    return Image.open(os.path.join(ROOT, 'journal', 'img', name)).size

def picture(name, alt, widths, sizes, lazy=True, cls=''):
    files = [f'{name}-{w}.webp' for w in widths]
    w0, h0 = img_dims(files[-1] if len(files) == 1 else files[0])
    srcset = ', '.join(f'/journal/img/{f} {img_dims(f)[0]}w' for f in files)
    big = files[0]
    s = f'<img src="/journal/img/{big}"'
    if len(files) > 1:
        s += f' srcset="{srcset}" sizes="{sizes}"'
    s += f' alt="{esc(alt)}" width="{w0}" height="{h0}"'
    if lazy: s += ' loading="lazy"'
    if cls: s += f' class="{cls}"'
    return s + '>'

def text_len(blocks):
    n = 0
    for b in blocks:
        for part in b[1:]:
            if isinstance(part, str): n += len(re.sub(r'<[^>]+>', '', part))
            elif isinstance(part, (list, tuple)):
                n += len(re.sub(r'<[^>]+>', '', json.dumps(part, ensure_ascii=False)))
    return n

def render_blocks(blocks):
    out = []; no = 0
    for b in blocks:
        k = b[0]
        if k == 'raw':
            out.append(b[1]); continue
        if k == 'h2':
            no += 1
            out.append(f'<h2 id="{b[1]}"><span class="no">{no:02d}</span>{b[2]}</h2>')
        elif k == 'p':
            out.append(f'<p>{b[1]}</p>')
        elif k in ('ol', 'ul'):
            out.append(f'<{k}>' + ''.join(f'<li>{x}</li>' for x in b[1]) + f'</{k}>')
        elif k == 'note':
            out.append(f'<p class="note">{b[1]}</p>')
        elif k == 'fig':  # ('fig', name, alt, caption, wide)
            wide = len(b) > 4 and b[4]
            ws = [1200, 700] if wide else [700]
            out.append(('<figure>' if wide else '<figure class="is-portrait">') + picture('art-' + b[1], b[2], ws, '(max-width:760px) 100vw, 680px') +
                       f'<figcaption>{b[3]}</figcaption></figure>')
        elif k == 'pair':  # ('pair', [(name, alt), (name, alt)], caption)
            imgs = ''.join(picture('art-' + n, a, [700], '') for n, a in b[1])
            out.append(f'<figure class="a-pair"><div class="pics">{imgs}</div><figcaption>{b[2]}</figcaption></figure>')
        elif k == 'split':  # ('split', p_html, name, alt)
            out.append(f'<div class="a-split"><p>{b[1]}</p><figure>{picture("art-" + b[2], b[3], [700], "")}</figure></div>')
        elif k == 'table':  # ('table', label, head[], rows[[th, td...]])
            head = ''.join(f'<th scope="col">{h or "<span class=\'sr-only\'>項目</span>"}</th>' for h in b[2])
            rows = ''.join('<tr><th scope="row">' + r[0] + '</th>' + ''.join(f'<td>{c}</td>' for c in r[1:]) + '</tr>' for r in b[3])
            out.append(f'<div class="a-table" tabindex="0" role="region" aria-label="{esc(b[1])}"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>')
        elif k == 'steps':  # ('steps', [(title, body_html)])
            out.append('<ol class="a-steps">' + ''.join(f'<li><span class="t">{t}</span><span class="d">{d}</span></li>' for t, d in b[1]) + '</ol>')
        else:
            raise ValueError(k)
    return '\n      '.join(out)

def toc(blocks):
    out = []
    for b in blocks:
        if b[0] == 'h2': out.append((b[1], re.sub(r'<[^>]+>', '', b[2])))
        elif b[0] == 'raw':
            for m in re.finditer(r'<h2 id="([^"]+)"><span class="no">[^<]*</span>(.*?)</h2>', b[1]): out.append((m.group(1), re.sub(r'<[^>]+>', '', m.group(2))))
    return out

def card(a, h='h3', with_ex=True):
    url = f'/journal/{a["slug"]}/'
    ex = f'\n          <p class="ex">{a["card_ex"]}</p>' if with_ex else ''
    meta = f'\n          <p class="meta">閱讀約 {a["mins"]} 分鐘</p>' if with_ex else ''
    return f'''      <li class="card" data-cat="{a["cat"]}">
        <a href="{url}">
          <div class="img"><img src="/journal/img/{a["card_img"]}" alt="{esc(a["card_alt"])}" width="800" height="600" loading="lazy"></div>
          <p class="cat">{CATS[a["cat"]]}</p>
          <{h}>{a["title_plain"]}</{h}>{ex}{meta}
        </a>
      </li>'''

def build_article(a, by_slug, tpl):
    url = f'{SITE}/journal/{a["slug"]}/'
    t = tpl
    title = f'{a["title_plain"]}｜織光手札'
    t = re.sub(r'<title[^>]*>.*?</title>', f'<title>{esc(title)}</title>', t, flags=re.S)
    t = re.sub(r'<meta name="description" content="[^"]*"[^>]*>', f'<meta name="description" content="{esc(a["desc"])}">', t)
    t = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', t)
    t = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', t)
    t = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{esc(title)}">', t)
    t = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{esc(a["dek"])}">', t)
    t = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{SITE}/journal/og-{a["slug"]}.jpg">', t)
    t = re.sub(r'<meta property="article:published_time" content="[^"]*">', f'<meta property="article:published_time" content="{a["date"]}">', t)
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BlogPosting", "@id": url + "#post", "headline": a["title_plain"], "description": a["desc"],
         "image": f'{SITE}/journal/og-{a["slug"]}.jpg', "datePublished": a["date"], "dateModified": a["date"],
         "inLanguage": "zh-Hant-TW", "mainEntityOfPage": url, "isPartOf": {"@id": f"{SITE}/journal/#blog"},
         "articleSection": CATS[a["cat"]],
         "author": {"@type": "Organization", "name": "織光窗簾 GlowCurtain", "url": SITE + "/"},
         "publisher": {"@type": "Organization", "name": "織光窗簾 GlowCurtain", "url": SITE + "/",
                       "logo": {"@type": "ImageObject", "url": f"{SITE}/images/logo-horizontal.png"}},
         "keywords": ",".join(a["tags"])},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "首頁", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "織光手札", "item": SITE + "/journal/"},
            {"@type": "ListItem", "position": 3, "name": a["crumb"], "item": url}]}]}
    t = re.sub(r'<script type="application/ld\+json">.*?</script>',
               lambda m: '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>', t, count=1, flags=re.S)
    cover_ws = sorted({int(re.search(r'-(\d+)\.webp$', f).group(1)) for f in os.listdir(os.path.join(ROOT, 'journal', 'img'))
                       if f.startswith(a['slug'] + '-cover-')}, reverse=True)
    cover = picture(a['slug'] + '-cover', a['cover_alt'], cover_ws, '(max-width:1264px) 100vw, 1200px', lazy=False)
    toc_items = ''.join(f'<li><a href="#{i}">{esc(n)}</a></li>' for i, n in toc(a['body1'] + a['body2']))
    styles = ''.join(f'''
        <a href="/quote/?style={k}" data-track="style_{k}">
          <img src="/journal/img/thumb-{k}-200.webp" alt="" width="200" height="200" loading="lazy">
          <span class="t"><span class="k">用這款試算</span><span class="n">{STYLES[k]}</span><span class="g">輸入寬高，線上估價 →</span></span>
        </a>''' for k in a['styles'])
    related = '\n'.join(card(by_slug[s], with_ex=False) for s in a['related'])
    tags = ''.join(f'<li>{esc(x)}</li>' for x in a['tags'])
    main = f'''<main>
<article>
  <header class="a-head">
    <div class="wrap">
      <nav class="crumbs" aria-label="麵包屑"><a href="/">首頁</a><span aria-hidden="true">›</span><a href="/journal/">織光手札</a><span aria-hidden="true">›</span><span aria-current="page">{CATS[a["cat"]]}</span></nav>
      <span class="kicker">{CATS[a["cat"]]}</span>
      <h1>{a["title_html"]}</h1>
      <p class="dek">{a["dek"]}</p>
      <p class="meta">{a.get("author", "織光規劃師")} · <time datetime="{a["date"]}">{a["date"].replace("-", ".")}</time> · 閱讀約 {a["mins"]} 分鐘</p>
    </div>
  </header>

  <div class="wrap">
    <figure class="a-cover">
      {cover}
      <figcaption>{a["cover_caption"]}</figcaption>
    </figure>
  </div>

  <div class="a-grid">
    <nav class="a-toc" aria-label="本文目錄">
      <span class="kicker">本文目錄</span>
      <ol>{toc_items}</ol>
    </nav>

    <div class="a-body">
      {render_blocks(a["body1"])}
    </div>
  </div>

  <div class="a-quote">
    <blockquote>
      <p>{a["quote"]}</p>
      <p class="by">— 織光規劃師</p>
    </blockquote>
  </div>

  <div class="a-cont">
    <div class="spacer" aria-hidden="true"></div>
    <div class="a-body">
      {render_blocks(a["body2"])}

      <div class="styles">{styles}
      </div>

      <div class="a-cta">
        <p class="kicker js-promo">官網預約限定 · 至 2026/12/31</p>
        <p class="h">{a.get("cta_h", "想知道你家的窗大概多少？輸入寬高就能線上估價，不用傳照片。")}</p>
        <p class="js-promo">立即預約現折 $2,000，選布簾贈高溫定型、選調光簾贈高規五金配件。</p>
        <div class="actions">
          <a class="btn btn-primary" href="{a.get("cta_quote", "/quote/")}" data-track="cta_quote">線上估價</a>
          <a class="btn btn-ghost" href="/quote/#booking" data-track="cta_booking">預約免費丈量</a>
        </div>
      </div>

      <ul class="tags" aria-label="標籤">{tags}</ul>
    </div>
  </div>
</article>

<section class="a-related" aria-labelledby="relTitle">
  <div class="wrap">
    <div class="sec-title"><h2 id="relTitle">延伸閱讀</h2><a class="more" href="/journal/">所有手札 →</a></div>
    <ul class="cards">
{related}
    </ul>
  </div>
</section>
</main>'''
    t = re.sub(r'<main>.*?</main>', lambda m: main, t, count=1, flags=re.S)
    t = re.sub(r"page: '[^']*'", f"page: '{a['slug']}'", t)
    os.makedirs(os.path.join(ROOT, 'journal', a['slug']), exist_ok=True)
    open(os.path.join(ROOT, 'journal', a['slug'], 'index.html'), 'w', encoding='utf-8').write(t)

def build_list():
    p = os.path.join(ROOT, 'journal', 'index.html'); s = open(p, encoding='utf-8').read()
    feat = next(a for a in ARTICLES if a.get('featured'))
    rest = [a for a in ARTICLES if not a.get('featured')]
    cards = '\n'.join(card(a) for a in rest)
    s = re.sub(r'(<ul class="cards" id="jCards">).*?(\n    </ul>)', lambda m: m.group(1) + '\n' + cards + m.group(2), s, count=1, flags=re.S)
    s = re.sub(r'<!-- 新增文章：.*?-->\n', '<!-- 文章卡片由 tools/build-journal.py 依 tools/journal_articles.py 產生，請勿手改 -->\n', s, flags=re.S)
    s = s.replace('<h2 id="listTitle">接下來的手札</h2><span class="kicker">COMING NEXT</span>', '<h2 id="listTitle">最新手札</h2><span class="kicker">LATEST</span>')
    s = s.replace('<p class="j-empty" id="jEmpty" hidden>這個分類的手札正在撰寫中，敬請期待。</p>', '<p class="j-empty" id="jEmpty" hidden>這個分類還沒有文章。</p>')
    s = s.replace('fabric-vs-dimming-cover-1600.webp', 'fabric-vs-dimming-cover-1300.webp').replace('fabric-vs-dimming-cover-1300.webp 1600w', 'fabric-vs-dimming-cover-1300.webp 1300w').replace('width="1600" height="900"', 'width="1300" height="731"')
    s = re.sub(r'<p class="meta"><time datetime="[^"]*">[^<]*</time> · 閱讀約 \d+ 分鐘</p>',
               f'<p class="meta"><time datetime="{feat["date"]}">{feat["date"].replace("-", ".")}</time> · 閱讀約 {feat["mins"]} 分鐘</p>', s, count=1)
    posts = [{"@type": "BlogPosting", "headline": a["title_plain"], "url": f'{SITE}/journal/{a["slug"]}/', "datePublished": a["date"]} for a in ARTICLES]
    def fix_ld(m):
        d = json.loads(m.group(1))
        for g in d['@graph']:
            if g.get('@type') == 'Blog': g['blogPost'] = posts
        return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + '</script>'
    s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', fix_ld, s, count=1, flags=re.S)
    open(p, 'w', encoding='utf-8').write(s)

def build_sitemap():
    p = os.path.join(ROOT, 'sitemap.xml'); s = open(p, encoding='utf-8').read()
    s = re.sub(r'  <url>\n    <loc>https://www\.glowcurtain\.com\.tw/journal/[^<]+/</loc>.*?</url>\n', '', s, flags=re.S)
    add = ''.join(f'''  <url>
    <loc>{SITE}/journal/{a["slug"]}/</loc>
    <lastmod>{a["date"]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
''' for a in ARTICLES)
    anchor = f'  <url>\n    <loc>{SITE}/portfolio/</loc>'
    s = s.replace(anchor, add + anchor, 1)
    open(p, 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    for a in ARTICLES:
        a['title_plain'] = re.sub(r'<br>', '', a['title_html'])
        a['mins'] = max(3, round((text_len(a['body1'] + a['body2']) + len(a['dek'])) / 400))
    by_slug = {a['slug']: a for a in ARTICLES}
    tpl = open(TEMPLATE, encoding='utf-8').read()
    for a in ARTICLES: build_article(a, by_slug, tpl)
    build_list(); build_sitemap()
    print('built', len(ARTICLES), 'articles:', ', '.join(f'{a["slug"]}({a["mins"]}min)' for a in ARTICLES))
