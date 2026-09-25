/**
 * 博客写作台 —— 单文件离线版
 *
 * 设计目标：
 *  1. 双击就能用，不需要服务器、不需要命令行
 *  2. 写的内容实时保存在浏览器 localStore，关掉再打开还在
 *  3. 「上传到博客」直接调 GitHub API 提交，GitHub Actions 自动部署上线
 *
 * 关键实现说明：
 *  - GitHub REST API 支持跨域（预检允许 PUT + Authorization），
 *    所以 file:// 打开的页面也能直接提交，无需任何后端。
 *  - marked 会把公式里的 _ 和 * 当成强调语法渲染坏，
 *    因此渲染前先把公式抽成占位符、渲染后再放回（与博客构建时同一做法）。
 *  - file:// 下的 localStorage 在个别浏览器可能被禁用，全部读写都做了兜底。
 */

'use strict';

// ================================================================ 常量

const STORE_POSTS = 'blogwriter.posts.v1';
const STORE_SETTINGS = 'blogwriter.settings.v1';
const STORE_CURRENT = 'blogwriter.current.v1';

const DEFAULT_SETTINGS = {
  owner: 'ChrysanthBlossom',
  repo: 'ChrysanthBlossom.github.io',
  branch: 'main',
  token: ''
};

const SITE_URL = 'https://chrysanthblossom.github.io/';

// ================================================================ 状态

const state = {
  posts: [],
  currentId: null,
  settings: { ...DEFAULT_SETTINGS },
  storageOk: true,
  dirty: false,
  busy: false
};

const $ = id => document.getElementById(id);

/**
 * 安全绑定：元素不存在时只告警，不让整个初始化崩掉。
 * （曾经因为模板里漏了一个按钮，bindEvents 直接抛错、整个应用白屏。）
 */
function on(id, event, handler) {
  const el = $(id);
  if (!el) {
    console.warn(`[写作台] 元素不存在，已跳过绑定: #${id}`);
    return;
  }
  el.addEventListener(event, handler);
}

// ================================================================ 存储
//
// 三层兜底。因为本文件通常是以 file:// 打开的，而部分浏览器会把 file://
// 视为「不透明来源」从而禁用 localStorage（jsdom 就是这样）。
// 一旦存储不可用，实时保存就会静默失效、用户会丢稿，所以必须有退路：
//
//   1. localStorage —— 正常情况，永久保存
//   2. window.name   —— 刷新页面不丢（同一标签页内有效，file:// 下可用）
//   3. 内存          —— 至少本次会话不丢
//
// 无论用哪一层，界面都会明确提示当前状态。

const memoryStore = {};
state.storageBackend = 'memory';

function tryLocalStorage() {
  try {
    const k = '__blogwriter_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function nameStoreRead() {
  try {
    const v = JSON.parse(window.name || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function nameStoreWrite(obj) {
  try {
    window.name = JSON.stringify(obj);
    return true;
  } catch {
    return false;
  }
}

const STORAGE_MODE = tryLocalStorage() ? 'localStorage' : 'window.name';

function storageGet(key, fallback) {
  if (STORAGE_MODE === 'localStorage') {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      /* 落到下一层 */
    }
  }
  if (STORAGE_MODE === 'window.name') {
    const all = nameStoreRead();
    return key in all ? all[key] : fallback;
  }
  return key in memoryStore ? memoryStore[key] : fallback;
}

function storageSet(key, value) {
  if (STORAGE_MODE === 'localStorage') {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      state.storageBackend = 'localStorage';
      return true;
    } catch {
      /* 落盘失败（可能超配额）也落到下一层 */
    }
  }
  if (STORAGE_MODE === 'window.name') {
    const all = nameStoreRead();
    all[key] = value;
    if (nameStoreWrite(all)) {
      state.storageBackend = 'window.name';
      return true;
    }
  }
  memoryStore[key] = value;
  state.storageBackend = 'memory';
  return false;
}

function loadAll() {
  state.posts = storageGet(STORE_POSTS, []) || [];
  state.settings = { ...DEFAULT_SETTINGS, ...(storageGet(STORE_SETTINGS, {}) || {}) };
  state.currentId = storageGet(STORE_CURRENT, null);
  if (!Array.isArray(state.posts)) state.posts = [];
}

function persistPosts() { storageSet(STORE_POSTS, state.posts); }
function persistSettings() { storageSet(STORE_SETTINGS, state.settings); }
function persistCurrent() { storageSet(STORE_CURRENT, state.currentId); }

// ================================================================ 工具

function uid() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toast(message, kind) {
  const el = $('toast');
  el.textContent = message;
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, kind === 'err' ? 7000 : 2800);
}

function splitList(value) {
  return String(value || '').split(/[,，]/).map(s => s.trim()).filter(Boolean);
}

function slugify(title) {
  const s = String(title || '').trim()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, '')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return s || 'untitled';
}

function nowStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 需要加引号的 YAML 标量 */
function yamlScalar(value) {
  const s = String(value == null ? '' : value);
  if (s === '') return "''";
  const risky = /^\s|\s$/.test(s) || /[:#[\]{}&*!|>'"%@`,]/.test(s) ||
                /^[-?]/.test(s) || /^(true|false|null|yes|no|on|off|~)$/i.test(s);
  if (!risky) return s;
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function unquote(v) {
  const s = String(v == null ? '' : v).trim();
  if (/^".*"$/.test(s)) return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (/^'.*'$/.test(s)) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

// ================================================================ front-matter

/** 组装成完整的 .md 文本（与博客构建时格式一致） */
function buildMarkdown(post) {
  const lines = [
    '---',
    `title: ${yamlScalar(post.title)}`,
    `date: ${String(post.date || '').trim()}`,
    'tags:'
  ];
  for (const t of post.tags || []) lines.push(`  - ${yamlScalar(t)}`);
  lines.push('categories:');
  for (const c of post.categories || []) lines.push(`  - ${yamlScalar(c)}`);
  lines.push(`description: ${yamlScalar(post.description)}`);

  for (const extra of post.extras || []) lines.push(...extra);

  lines.push('---', '');
  const text = lines.join('\n');
  const body = String(post.body || '').replace(/^[\r\n]+/, '').replace(/\s+$/, '');
  return body ? `${text}\n${body}\n` : `${text}\n`;
}

/** 解析 .md 文本（导入时用） */
function parseMarkdown(text) {
  const src = String(text).replace(/\r\n/g, '\n');
  const post = { title: '', date: '', tags: [], categories: [], description: '', body: src, extras: [] };
  if (!src.startsWith('---')) return post;

  const end = src.indexOf('\n---', 3);
  if (end === -1) return post;

  const fm = src.slice(3, end).replace(/^\n/, '');
  post.body = src.slice(end + 4).replace(/^\n/, '');

  const known = ['title', 'date', 'tags', 'categories', 'description'];
  let cur = null;
  for (const line of fm.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s?(.*)$/);
    if (m) {
      cur = { key: m[1], inline: m[2], list: [], raw: [line] };
      if (known.includes(cur.key)) {
        if (cur.key === 'title') post.title = unquote(m[2]);
        else if (cur.key === 'date') post.date = unquote(m[2]);
        else if (cur.key === 'description') post.description = unquote(m[2]);
        else post[cur.key] = /^\[.*\]$/.test(m[2].trim())
          ? m[2].trim().slice(1, -1).split(',').map(x => unquote(x)).filter(Boolean)
          : [];
      } else {
        post.extras.push(cur.raw);
      }
      continue;
    }
    if (!cur) continue;
    if (known.includes(cur.key)) {
      const item = line.match(/^\s+-\s+(.*)$/);
      if (item && Array.isArray(post[cur.key])) post[cur.key].push(unquote(item[1]));
    } else {
      post.extras[post.extras.length - 1].push(line);
    }
  }
  return post;
}

// ================================================================ 公式保护

/**
 * 把公式抽成占位符，避免被 Markdown 解析器破坏。
 * 同时跳过代码块和行内代码 —— 那里的 $ 不应被当成公式。
 */
function protectMath(src) {
  const store = [];
  let out = '';
  const n = src.length;
  let i = 0;

  while (i < n) {
    const fence = src.startsWith('```', i) ? '```' : (src.startsWith('~~~', i) ? '~~~' : null);
    if (fence) {
      const close = src.indexOf('\n' + fence, i + 3);
      const stop = close === -1 ? n : close + 4;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (src[i] === '`') {
      const close = src.indexOf('`', i + 1);
      const stop = close === -1 ? n : close + 1;
      out += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (src.startsWith('$$', i)) {
      const close = src.indexOf('$$', i + 2);
      if (close !== -1) {
        store.push(src.slice(i, close + 2));
        out += `\n\n@@MATH${store.length - 1}@@\n\n`;
        i = close + 2;
        continue;
      }
    }
    if (src[i] === '$') {
      const close = src.indexOf('$', i + 1);
      if (close !== -1 && !src.slice(i + 1, close).includes('\n')) {
        store.push(src.slice(i, close + 1));
        out += `@@MATH${store.length - 1}@@`;
        i = close + 1;
        continue;
      }
    }
    out += src[i];
    i++;
  }
  return { text: out, store };
}

function restoreMath(html, store) {
  return html.replace(/@@MATH(\d+)@@/g, (m, idx) => {
    const v = store[Number(idx)];
    return v === undefined ? m : v;
  });
}

// ================================================================ 预览渲染

function renderMarkdown(src) {
  if (!window.marked) return '<p class="muted">Markdown 渲染器未加载</p>';
  const { text, store } = protectMath(String(src || ''));
  return restoreMath(marked.parse(text, { gfm: true, breaks: false }), store);
}

let mathjaxPromise = null;
function waitForMathJax() {
  if (mathjaxPromise) return mathjaxPromise;
  mathjaxPromise = new Promise(resolve => {
    const started = Date.now();
    const timer = setInterval(() => {
      const MJ = window.MathJax;
      if (MJ && MJ.startup && MJ.startup.promise) {
        clearInterval(timer);
        MJ.startup.promise.then(resolve).catch(resolve);
      } else if (Date.now() - started > 25000) {
        clearInterval(timer);
        resolve();
      }
    }, 150);
  });
  return mathjaxPromise;
}

async function typesetMath() {
  const MJ = window.MathJax;
  if (!MJ || !MJ.typesetPromise) return false;
  try {
    await MJ.typesetPromise([$('preview')]);
    return true;
  } catch (err) {
    console.warn('MathJax 排版失败:', err);
    return false;
  }
}

let previewTimer = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(updatePreview, 220);
}

async function updatePreview() {
  const src = $('editor').value;
  $('preview').innerHTML = renderMarkdown(src);

  if (window.Prism) {
    try { Prism.highlightAllUnder($('preview')); } catch (err) { console.warn(err); }
  }

  $('word-count').textContent = `${src.replace(/\s/g, '').length} 字`;
  const ok = await typesetMath();
  $('preview-status').textContent = ok ? '' : '（公式未渲染）';
}

// ================================================================ 文章管理

function currentPost() {
  return state.posts.find(p => p.id === state.currentId) || null;
}

/** 从表单读出一篇文章对象 */
function readForm() {
  const post = currentPost() || {};
  const fileInput = $('f-file').value.trim();
  const file = (/\.md$/i.test(fileInput) ? fileInput : fileInput + '.md');
  return {
    ...post,
    title: $('f-title').value.trim(),
    date: $('f-date').value.trim() || nowStamp(),
    file: file || slugify($('f-title').value) + '.md',
    tags: splitList($('f-tags').value),
    categories: splitList($('f-categories').value),
    description: $('f-description').value.trim(),
    body: $('editor').value
  };
}

/** 把一篇文章写回表单 */
function writeForm(post) {
  $('f-title').value = post.title || '';
  $('f-date').value = post.date || '';
  $('f-file').value = post.file || '';
  $('f-tags').value = (post.tags || []).join(', ');
  $('f-categories').value = (post.categories || []).join(', ');
  $('f-description').value = post.description || '';
  $('editor').value = post.body || '';
}

function setDirty(v) {
  state.dirty = v;
  $('dirty').hidden = !v;
  if (!v) $('save-state').textContent = `已保存 · ${fmtTime(Date.now())}`;
}

/** 实时保存：把表单内容合并进当前文章并落盘 */
function autoSave() {
  if (!state.currentId) return;
  const post = readForm();
  const idx = state.posts.findIndex(p => p.id === state.currentId);
  if (idx === -1) return;
  state.posts[idx] = { ...post, id: state.currentId, updatedAt: Date.now() };
  persistPosts();
  setDirty(false);
  renderPostList();
}

let autoSaveTimer = null;
function scheduleAutoSave() {
  setDirty(true);
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(autoSave, 600);
}

function renderPostList() {
  const list = $('post-list');
  list.textContent = '';

  const sorted = [...state.posts].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')));

  for (const post of sorted) {
    const li = document.createElement('li');
    if (post.id === state.currentId) li.className = 'active';

    const title = document.createElement('span');
    title.className = 'p-title';
    title.textContent = post.title || post.file || '(未命名)';

    const meta = document.createElement('span');
    meta.className = 'p-meta';
    meta.textContent = String(post.date || '').slice(0, 10) || fmtTime(post.updatedAt);

    const del = document.createElement('button');
    del.className = 'p-del';
    del.textContent = '×';
    del.title = '删除这篇（仅删除本地草稿）';
    del.addEventListener('click', ev => {
      ev.stopPropagation();
      deletePost(post.id);
    });

    li.append(title, meta, del);
    li.addEventListener('click', () => selectPost(post.id));
    list.appendChild(li);
  }

  $('post-count').textContent = String(state.posts.length);
}

function selectPost(id) {
  if (state.dirty) autoSave();
  state.currentId = id;
  persistCurrent();
  const post = currentPost();
  if (!post) return;
  writeForm(post);
  setDirty(false);
  renderPostList();
  updatePreview();
  updateUploadState();
}

function newPost() {
  if (state.dirty) autoSave();
  const post = {
    id: uid(),
    title: '',
    date: nowStamp(),
    file: '',
    tags: [],
    categories: [],
    description: '',
    body: '',
    extras: [],
    updatedAt: Date.now()
  };
  state.posts.push(post);
  state.currentId = post.id;
  persistPosts();
  persistCurrent();

  writeForm(post);
  setDirty(false);
  renderPostList();
  updatePreview();
  updateUploadState();
  $('f-title').focus();
  toast('已新建草稿，填写标题即可开始写');
}

function deletePost(id) {
  const post = state.posts.find(p => p.id === id);
  if (!post) return;
  if (!confirm(`删除本地草稿「${post.title || post.file || '未命名'}」？\n\n注意：这只删除浏览器里的草稿，不会删除博客上已发布的文章。`)) return;
  state.posts = state.posts.filter(p => p.id !== id);
  persistPosts();
  if (state.currentId === id) {
    state.currentId = state.posts[0] ? state.posts[0].id : null;
    persistCurrent();
    const next = currentPost();
    if (next) { writeForm(next); updatePreview(); }
    else { writeForm({}); $('preview').innerHTML = '<p class="muted">还没有文章，点左上角「+ 新建」开始。</p>'; }
  }
  renderPostList();
  updateUploadState();
}

// ================================================================ GitHub 上传

function ghHeaders(json) {
  const h = {
    'Authorization': `Bearer ${state.settings.token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function ghContentsUrl(file) {
  const { owner, repo } = state.settings;
  const path = ['source', '_posts', file].map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}

/** UTF-8 安全的 base64 编码（中文不能直接 btoa） */
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function ghFetch(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch { /* 可能没有 body */ }
  if (!res.ok) {
    const msg = (data && data.message) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function needToken() {
  if (!state.settings.token) {
    toast('还没有配置 GitHub Token，先点右上角「设置」', 'err');
    openSettings();
    return true;
  }
  return false;
}

/** 上传当前文章到 GitHub；Actions 随后自动部署 */
async function uploadCurrent() {
  if (state.busy) return;
  if (needToken()) return;

  if (!state.dirty) { /* 已自动保存 */ } else { autoSave(); }

  const post = currentPost();
  if (!post) return toast('没有可上传的文章', 'err');
  if (!post.title) return toast('请先填写标题', 'err');

  const file = post.file || (slugify(post.title) + '.md');
  const content = buildMarkdown(post);

  setBusy(true, '正在上传…');
  try {
    // 1) 取已有文件的 sha（更新时必须提供；新文件没有）
    let sha = null;
    try {
      const existing = await ghFetch(`${ghContentsUrl(file)}?ref=${encodeURIComponent(state.settings.branch)}`,
        { headers: ghHeaders(false) });
      sha = existing.sha;
    } catch (err) {
      if (err.status !== 404) throw err;
    }

    // 2) 提交
    const body = {
      message: `${sha ? '更新' : '新增'}文章：${post.title}`,
      content: toBase64(content),
      branch: state.settings.branch
    };
    if (sha) body.sha = sha;

    await ghFetch(ghContentsUrl(file), {
      method: 'PUT',
      headers: ghHeaders(true),
      body: JSON.stringify(body)
    });

    // 3) 标记已上传
    const idx = state.posts.findIndex(p => p.id === post.id);
    if (idx !== -1) {
      state.posts[idx] = { ...state.posts[idx], file, uploadedAt: Date.now(), uploadedSha: sha || null };
      persistPosts();
    }

    toast(`已${sha ? '更新' : '提交'} source/_posts/${file}\nGitHub Actions 正在构建，约 30 秒后上线`, 'ok');
    setBusy(false);
    updateUploadState();
    renderPostList();
  } catch (err) {
    setBusy(false);
    toast(`上传失败：${err.message}`, 'err');
  }
}

/** 从博客拉取已有的文章 */
async function pullFromGitHub() {
  if (state.busy) return;
  if (needToken()) return;

  setBusy(true, '正在拉取…');
  try {
    const { owner, repo, branch } = state.settings;
    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/source/_posts?ref=${encodeURIComponent(branch)}`;
    const items = await ghFetch(listUrl, { headers: ghHeaders(false) });
    const files = (Array.isArray(items) ? items : []).filter(i => /\.md$/i.test(i.name));

    if (!files.length) { setBusy(false); return toast('博客上还没有文章'); }
    if (!confirm(`博客上有 ${files.length} 篇 Markdown。\n\n拉取会把远端内容合并到本地草稿（同名的会被覆盖），继续？`)) {
      setBusy(false);
      return;
    }

    let added = 0;
    let updated = 0;
    for (const item of files) {
      let text;
      try {
        if (item.content) {
          text = fromBase64(item.content);
        } else {
          const full = await ghFetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent('source/_posts/' + item.name).replace(/%2F/g, '/')}?ref=${encodeURIComponent(branch)}`,
            { headers: ghHeaders(false) });
          text = fromBase64(full.content || '');
        }
      } catch { continue; }

      const parsed = parseMarkdown(text);
      const existing = state.posts.find(p => p.file === item.name);
      if (existing) {
        Object.assign(existing, parsed, { file: item.name, updatedAt: Date.now() });
        updated++;
      } else {
        state.posts.push({ id: uid(), ...parsed, file: item.name, updatedAt: Date.now() });
        added++;
      }
    }

    persistPosts();
    renderPostList();
    setBusy(false);
    toast(`拉取完成：新增 ${added} 篇，更新 ${updated} 篇`, 'ok');
    if (!state.currentId && state.posts.length) selectPost(state.posts[state.posts.length - 1].id);
    updateUploadState();
  } catch (err) {
    setBusy(false);
    toast(`拉取失败：${err.message}`, 'err');
  }
}

function setBusy(v, label) {
  state.busy = v;
  $('btn-upload').disabled = v;
  $('btn-pull').disabled = v;
  $('btn-upload').textContent = v ? (label || '处理中…') : '上传到博客';
}

function updateUploadState() {
  const badge = $('upload-state');
  const post = currentPost();
  if (!post) { badge.hidden = true; return; }
  badge.hidden = false;
  if (post.uploadedAt) {
    badge.className = 'badge badge-ok';
    badge.textContent = `已上传 · ${fmtTime(post.uploadedAt)}`;
  } else {
    badge.className = 'badge';
    badge.textContent = '尚未上传';
  }
}

// ================================================================ 导入 / 导出

function download(filename, text) {
  const a = document.createElement('a');
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);

  try {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  } catch (err) {
    // 极少数环境没有 createObjectURL，退回 data: URL
    a.href = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(text);
    a.click();
  } finally {
    a.remove();
  }
}

function exportCurrent() {
  const post = readForm();
  download(post.file || slugify(post.title) + '.md', buildMarkdown(post));
  toast('已下载 .md 文件');
}

function exportAll() {
  if (!state.posts.length) return toast('还没有文章', 'err');
  const all = state.posts.map(p => buildMarkdown(p)).join('\n\n<!-- ===== 下一篇 ===== -->\n\n');
  download(`blog-drafts-${Date.now()}.md`, all);
  toast(`已导出 ${state.posts.length} 篇草稿`);
}

function importFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  let done = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseMarkdown(String(reader.result || ''));
      const existing = state.posts.find(p => p.file === file.name);
      if (existing) {
        Object.assign(existing, parsed, { updatedAt: Date.now() });
      } else {
        state.posts.push({ id: uid(), ...parsed, file: file.name, updatedAt: Date.now() });
      }
      if (++done === files.length) {
        persistPosts();
        renderPostList();
        toast(`已导入 ${done} 个文件`);
        if (!state.currentId) selectPost(state.posts[state.posts.length - 1].id);
      }
    };
    reader.readAsText(file, 'utf-8');
  });
}

// ================================================================ 设置弹窗

function openSettings() {
  $('s-owner').value = state.settings.owner;
  $('s-repo').value = state.settings.repo;
  $('s-branch').value = state.settings.branch;
  $('s-token').value = state.settings.token;
  $('modal-settings').hidden = false;
}

function closeSettings() {
  $('modal-settings').hidden = true;
}

async function saveSettings() {
  state.settings = {
    owner: $('s-owner').value.trim() || DEFAULT_SETTINGS.owner,
    repo: $('s-repo').value.trim() || DEFAULT_SETTINGS.repo,
    branch: $('s-branch').value.trim() || 'main',
    token: $('s-token').value.trim()
  };
  persistSettings();
  closeSettings();
  toast('设置已保存到本机浏览器', 'ok');
  await testConnection(true);
}

async function testConnection(silent) {
  const badge = $('gh-state');
  if (!state.settings.token) {
    badge.className = 'badge';
    badge.textContent = '未配置 Token';
    return;
  }
  badge.className = 'badge badge-busy';
  badge.textContent = '检查中…';
  try {
    const { owner, repo } = state.settings;
    const info = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`,
      { headers: ghHeaders(false) });
    badge.className = 'badge badge-ok';
    badge.textContent = `已连接 · ${info.full_name}`;
  } catch (err) {
    badge.className = 'badge badge-err';
    badge.textContent = `连接失败：${err.status === 401 ? 'Token 无效' : err.message}`;
    if (!silent) toast(`GitHub 连接失败：${err.message}`, 'err');
  }
}

// ================================================================ 事件绑定

function bindEvents() {
  ['f-title', 'f-date', 'f-file', 'f-tags', 'f-categories', 'f-description', 'editor'].forEach(id => {
    $(id).addEventListener('input', () => {
      scheduleAutoSave();
      if (id === 'editor') schedulePreview();
    });
  });

  on('btn-new', 'click', newPost);
  on('btn-upload', 'click', uploadCurrent);
  on('btn-pull', 'click', pullFromGitHub);
  on('btn-export', 'click', exportCurrent);
  on('btn-export-all', 'click', exportAll);
  on('btn-settings', 'click', openSettings);
  on('btn-import', 'click', () => $('file-input').click());
  on('file-input', 'change', ev => {
    importFiles(ev.target.files);
    ev.target.value = '';
  });

  on('s-save', 'click', saveSettings);
  on('s-cancel', 'click', closeSettings);
  on('s-test', 'click', async () => {
    state.settings = {
      owner: $('s-owner').value.trim(),
      repo: $('s-repo').value.trim(),
      branch: $('s-branch').value.trim() || 'main',
      token: $('s-token').value.trim()
    };
    await testConnection(false);
  });

  document.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
      ev.preventDefault();
      autoSave();
      toast('已保存');
    }
    if (ev.key === 'Escape' && !$('modal-settings').hidden) closeSettings();
  });

  window.addEventListener('beforeunload', () => {
    if (state.dirty) autoSave();
  });
}

// ================================================================ 启动

(async function init() {
  loadAll();

  if (state.posts.length === 0) {
    // 首次使用：给一篇带说明的示例草稿，让界面不至于空着
    state.posts.push({
      id: uid(),
      title: '开始写第一篇',
      date: nowStamp(),
      file: 'my-first-post.md',
      tags: [],
      categories: [],
      description: '',
      body: [
        '这是你的第一篇草稿，直接改写内容即可。',
        '',
        '## 说明',
        '',
        '- 写的内容会**实时保存在本机浏览器**，关掉页面再打开还在',
        '- 公式用 `$行内$` 或 `$$块级$$`',
        '- 写完点右上角 **上传到博客**，GitHub Actions 会自动构建发布',
        '- 第一次上传前，先在 **设置** 里填一个 GitHub Token',
        '',
        '行内公式示例：$f: X \\to Y$',
        '',
        '$$\\int_{-\\infty}^{+\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$$',
        '',
        '```python',
        'def hello(name):',
        '    return f"你好，{name}"',
        '```'
      ].join('\n'),
      extras: [],
      updatedAt: Date.now()
    });
    persistPosts();
  }

  if (!state.currentId || !currentPost()) {
    state.currentId = state.posts[0].id;
    persistCurrent();
  }

  bindEvents();
  writeForm(currentPost());
  renderPostList();
  setDirty(false);
  $('save-state').textContent = '';
  await updatePreview();
  updateUploadState();

  // MathJax 异步加载，就绪后重排一次
  waitForMathJax().then(() => updatePreview());

  if (STORAGE_MODE !== 'localStorage') {
    const warn = $('storage-warn');
    warn.hidden = false;
    warn.textContent = STORAGE_MODE === 'window.name'
      ? '⚠️ 此浏览器在本地文件模式下禁用了 localStorage，草稿暂存在标签页里：刷新不丢，但关掉标签页会丢。请及时点「上传到博客」或「导出」备份。'
      : '⚠️ 无法在本机保存，关掉页面内容就没了。请立刻用「导出」或「上传到博客」保存。';
  }

  if (state.settings.token) testConnection(true);
})();
