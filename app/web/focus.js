/**
 * focus.js — 首页番茄钟（25 分钟一段）
 *
 * 状态存 localStorage，刷新不丢；结束调用 focus.log 写入专注日志。
 * 只在首页存在 #focus-toggle 时启动。
 */

const KEY = 'workbench.focus';
const TOTAL = 25 * 60;

const toggle = document.getElementById('focus-toggle');
const clock = document.getElementById('focus-clock');
const state = document.getElementById('focus-state');

function readState() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

function writeState(value) {
  if (value) localStorage.setItem(KEY, JSON.stringify(value));
  else localStorage.removeItem(KEY);
}

function render(remaining, running) {
  const m = String(Math.floor(Math.max(remaining, 0) / 60)).padStart(2, '0');
  const s = String(Math.max(remaining, 0) % 60).padStart(2, '0');
  clock.textContent = `${m}:${s}`;
  toggle.textContent = running ? '暂停' : remaining < TOTAL ? '继续' : '开始专注';
}

async function logSession() {
  try {
    await fetch('/api/skills/focus.log/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: 25 }),
    });
    state.textContent = '已记录一段 25 分钟专注';
  } catch {
    state.textContent = '记录失败，稍后可在计划页手动补记';
  }
}

if (toggle && clock) {
  let saved = readState();
  let remaining = saved ? Math.min(saved.remaining, TOTAL) : TOTAL;
  let running = false;
  let timer = null;

  render(remaining, running);

  const tick = () => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(timer);
      timer = null;
      running = false;
      writeState(null);
      remaining = TOTAL;
      render(remaining, false);
      logSession();
      return;
    }
    writeState({ remaining, at: Date.now() });
    render(remaining, true);
  };

  toggle.addEventListener('click', () => {
    if (running) {
      clearInterval(timer);
      timer = null;
      running = false;
      render(remaining, false);
      return;
    }
    running = true;
    render(remaining, true);
    timer = setInterval(tick, 1000);
  });
}
