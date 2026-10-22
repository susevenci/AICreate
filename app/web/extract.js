/**
 * extract.js — 半自动提取器（在平台页面上运行，由书签加载）
 *
 * 原则：
 *   - 只读当前页面已经渲染出来的可见内容，不翻页、不遍历、不发请求
 *   - 不伪装、不改指纹、不绕验证码
 *   - 提取结果交给用户确认，再由工作台的 source.import 落盘
 *
 * 平台选择器会随改版失效，这里采用「链接模式 + 邻近文本」的保守策略：
 * 抓不到就给 0，不猜。
 */
(function () {
  const SITES = [
    { name: 'B站', host: /bilibili\.com$/, id: /\/video\/(BV[0-9A-Za-z]+)/ },
    { name: '小红书', host: /xiaohongshu\.com$/, id: /\/(?:explore|note|discovery\/item)\/([0-9a-zA-Z]+)/ },
    { name: '抖音', host: /douyin\.com$/, id: /\/video\/(\d+)/ },
    { name: '快手', host: /kuaishou\.com$/, id: /\/short-video\/([0-9A-Za-z_-]+)/ },
  ];

  const UNIT = { 万: 10000, w: 10000, 亿: 100000000 };

  function toNumber(raw) {
    if (!raw) return 0;
    const m = String(raw).match(/([\d.]+)\s*([万亿w])?/i);
    if (!m) return 0;
    const base = Number(m[1]);
    if (!Number.isFinite(base)) return 0;
    const unit = UNIT[(m[2] || '').toLowerCase()] || 1;
    return Math.round(base * unit);
  }

  function pick(text, labels) {
    for (const label of labels) {
      const re = new RegExp('([\\d.]+\\s*[万亿w]?)\\s*' + label);
      const m = text.match(re);
      if (m) return toNumber(m[1]);
    }
    return 0;
  }

  function parseStats(text) {
    return {
      views: pick(text, ['播放', '观看', '浏览']),
      likes: pick(text, ['点赞', '赞']),
      comments: pick(text, ['评论']),
      shares: pick(text, ['分享', '转发']),
    };
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  }

  function csvCell(value) {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  const site = SITES.find((s) => s.host.test(location.hostname));
  if (!site) {
    alert('当前页面不在支持列表：B站 / 小红书 / 抖音 / 快手');
    return;
  }

  const rows = new Map();

  for (const a of document.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') || '';
    const m = href.match(site.id);
    if (!m) continue;
    const id = m[1];
    if (rows.has(id)) continue;
    let url = href;
    try {
      url = new URL(href, location.origin).href;
    } catch (e) {
      // 保留原始 href
    }
    const card = a.closest('li, article, section, div') || a;
    const text = clean(card.innerText || '');
    const title = clean(a.getAttribute('title') || a.innerText || document.title);
    rows.set(id, {
      platform: site.name,
      platformId: id,
      title,
      url,
      author: '',
      ...parseStats(text),
      publishedAt: '',
    });
  }

  // 详情页（单条）：从 URL 取 id，标题用页面标题
  const single = location.href.match(site.id);
  if (rows.size === 0 && single) {
    const text = clean(document.body.innerText || '').slice(0, 500);
    rows.set(single[1], {
      platform: site.name,
      platformId: single[1],
      title: clean(document.title).replace(/\s*[-_|].*$/, ''),
      url: location.href,
      author: '',
      ...parseStats(text),
      publishedAt: '',
    });
  }

  if (rows.size === 0) {
    alert('没有在当前页面识别到可提取的作品。请在列表页或作品详情页再试一次。');
    return;
  }

  const header = ['platform', 'platformId', 'title', 'url', 'author', 'views', 'likes', 'comments', 'shares', 'publishedAt'];
  const lines = [header.join(',')];
  for (const row of rows.values()) {
    lines.push(header.map((k) => csvCell(row[k])).join(','));
  }
  const csv = lines.join('\n');

  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;inset:5% 10%;z-index:2147483647;background:#0e1211;color:#e8eeeb;border:1px solid #2a3634;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;font:13px/1.5 system-ui';
  const head = document.createElement('div');
  head.textContent = `已提取 ${rows.size} 条（${site.name}）· 复制后粘贴到工作台「对标 → 导入提取结果」`;
  const area = document.createElement('textarea');
  area.value = csv;
  area.style.cssText = 'flex:1;background:#151c1a;color:#dfe9e4;border:1px solid #2a3634;border-radius:8px;padding:10px;font:12px/1.5 monospace';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:10px;justify-content:flex-end';
  const copy = document.createElement('button');
  copy.textContent = '复制 CSV';
  copy.style.cssText = 'background:#d9f99d;color:#1a2718;border:0;border-radius:8px;padding:8px 14px;cursor:pointer;font-weight:600';
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(csv);
      copy.textContent = '已复制';
    } catch (e) {
      area.select();
      document.execCommand('copy');
      copy.textContent = '已复制';
    }
  };
  const close = document.createElement('button');
  close.textContent = '关闭';
  close.style.cssText = 'background:transparent;color:#93a29d;border:1px solid #2a3634;border-radius:8px;padding:8px 14px;cursor:pointer';
  close.onclick = () => box.remove();
  bar.append(copy, close);
  box.append(head, area, bar);
  document.body.appendChild(box);
})();
