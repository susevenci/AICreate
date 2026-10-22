/**
 * app.js — 前端交互（无框架）
 *
 * 唯一通道：所有功能入口都调用 POST /api/skills/:id/run。
 * 本文件不拼业务参数、不做校验，只负责：收集表单/按钮参数 → 调 Skill → 处理结果或报错。
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function api(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload ?? {}),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || (body && body.ok === false)) {
    const message = body?.error?.message || `请求失败（HTTP ${res.status}）`;
    const details = body?.error?.details;
    const suffix =
      Array.isArray(details) && details.length
        ? '\n' + details.map((d) => `· ${d.message || d}`).join('\n')
        : '';
    throw new Error(message + suffix);
  }
  return body?.data ?? null;
}

function runSkill(id, params) {
  return api(`/api/skills/${encodeURIComponent(id)}/run`, params);
}

function showError(anchor, message) {
  const host = anchor.parentElement || document.body;
  const existing = host.querySelector(':scope > .error');
  if (existing) existing.remove();
  const box = document.createElement('div');
  box.className = 'error';
  box.textContent = message;
  anchor.insertAdjacentElement('beforebegin', box);
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => box.remove(), 9000);
}

function setBusy(button, busy, label) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label || '处理中…';
    button.disabled = true;
    return;
  }
  button.textContent = button.dataset.label || button.textContent;
  button.disabled = false;
}

/** 动作型 Skill 执行完后：优先用后端给的 redirect，其次回到当前页 */
function goAfter(result) {
  const isSetup = !document.querySelector('.topbar');
  const fallback = isSetup ? '/' : window.location.pathname + window.location.search;
  window.location.href = result?.redirect || fallback;
}

/* ------------------------------------------------------------ 表单 → Skill */

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-skill]');
  if (!form) return;
  event.preventDefault();

  const submit = form.querySelector('button[type="submit"]');
  const params = Object.fromEntries(new FormData(form).entries());
  setBusy(submit, true);

  try {
    const result = await runSkill(form.dataset.skill, params);
    goAfter(result);
  } catch (err) {
    showError(form, err.message);
  } finally {
    setBusy(submit, false);
  }
});

/* ------------------------------------------------------------ 按钮 → Skill */

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-skill]');
  if (!button || button.tagName === 'FORM') return;
  if (!button.dataset.params && button.dataset.run !== 'prompt') return;
  event.preventDefault();

  const card = button.closest('article[data-skill]');
  let params = {};
  if (button.dataset.params) {
    try {
      params = JSON.parse(button.dataset.params);
    } catch {
      showError(button, '按钮参数格式错误，请检查 data-params。');
      return;
    }
  } else if (card) {
    card.querySelectorAll('[data-param]').forEach((input) => {
      params[input.dataset.param] = input.value;
    });
  }

  setBusy(button, true);

  try {
    const result = await runSkill(button.dataset.skill, params);
    if (button.dataset.run === 'prompt') {
      const pre = card.querySelector('.prompt-out');
      pre.hidden = false;
      pre.textContent = result.prompt;
      attachCopy(pre, result);
      return;
    }
    goAfter(result);
  } catch (err) {
    showError(button, err.message);
  } finally {
    setBusy(button, false);
  }
});

function attachCopy(pre, result) {
  const card = pre.closest('article[data-skill]');
  if (card.querySelector('[data-copy]')) return;
  const bar = document.createElement('div');
  bar.className = 'draft-foot';
  const copy = document.createElement('button');
  copy.className = 'primary';
  copy.textContent = '复制指令';
  copy.dataset.copy = '1';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(result.prompt);
      copy.textContent = '已复制';
      window.setTimeout(() => {
        copy.textContent = '复制指令';
      }, 1600);
    } catch {
      showError(copy, '浏览器拒绝访问剪贴板，请手动选择上方文本复制。');
    }
  });
  const meta = document.createElement('span');
  meta.className = 'muted small';
  meta.textContent = `Skill v${result.version} · 产物写入 01-收件箱/_ai-output/`;
  bar.append(copy, meta);
  pre.insertAdjacentElement('afterend', bar);
}
