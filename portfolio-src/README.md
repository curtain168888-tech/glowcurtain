# 空間作品集 /portfolio/ — 產生器原始檔

`/portfolio/` 的網頁由這個資料夾產生（不會部署到網站，見根目錄 `.vercelignore`）。

| 檔案 | 內容 |
|---|---|
| `data.js` | 70 頁的所有資料：空間、案例文字、照片、窗簾特色、電動升級、聯絡方式 |
| `core.js` | 每一種頁面（封面、目錄、對照表、案例頁…）的版型與頁內連結 |
| `core.css` | 頁面版型（1400×1000 橫式，PDF 用同一份） |
| `web.css` | 網頁翻閱器外框、手機版直式排版 |
| `web.js` | 翻頁（StPageFlip）、目錄抽屜、返回、網址 #頁碼、GA4 事件 |
| `web_dims.json` | `portfolio/img/` 每張 WebP 的尺寸 |
| `build_web.js` | 產生 `portfolio/index.html`、`portfolio.css`、`portfolio.js` |

改文字或版型後執行：

```
node portfolio-src/build_web.js
```

- 閱讀模式：寬度 900px 以下＝手機版直式排版；電腦、平板橫放＝翻頁；螢幕太矮或網址加 `?view=scroll`＝整頁上下捲動。
- 每頁網址為 `/portfolio/#p頁碼`（例如 `#p45`），可直接分享到某一頁。
- 案例頁的「線上試算」會帶 `/?style=款式#quote`，首頁報價表會自動選好款式；電動升級頁帶 `/?motor=1#quote`。
- GA4 事件：`portfolio_open`、`portfolio_page`（停留 1.2 秒以上的頁）、`portfolio_cta`（quote／line／phone／ig／home）、`portfolio_toc`。
- 翻頁套件：StPageFlip（page-flip 2.0.7，MIT），檔案在 `portfolio/page-flip.browser.js`。
