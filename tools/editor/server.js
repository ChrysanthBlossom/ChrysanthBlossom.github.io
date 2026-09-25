#!/usr/bin/env node
/**
 * 本地博客写作编辑器 —— 后端
 *
 * 零第三方依赖，只用 Node 内置模块。
 * 提供文章 CRUD、一键发布、部署状态查询，以及前端所需的静态资源。
 *
 * 只监听 127.0.0.1，不对局域网暴露。
 * 启动：node tools/editor/server.js   （或 ./tools/editor/start.sh）
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// ---------------------------------------------------------------- 路径与常量

const EDITOR_DIR = __dirname;
const BLOG_DIR = path.resolve(EDITOR_DIR, '..', '..');
const POSTS_DIR = path.join(BLOG_DIR, 'source', '_posts');
const PUBLIC_DIR = path.join(EDITOR_DIR, 'public');
const NODE_MODULES = path.join(BLOG_DIR, 'node_modules');

// gh / git 的配置在本机被放在工作区内（家目录只读），见 README
const TOOLS_DIR = process.env.BLOG_TOOLS_DIR || path.resolve(BLOG_DIR, '..', '.tools');

const PORT = Number(process.env.EDITOR_PORT || 4001);
const HOST = '127.0.0.1';
const REPO = process.env.BLOG_REPO || 'ChrysanthBlossom/ChrysanthBlossom.github.io';
const HEXO_PREVIEW = process.env.HEXO_PREVIEW || 'http://localhost:4000';

const KNOWN_FIELDS = ['title', 'date', 'tags', 'categories', 'description'];

// ---------------------------------------------------------------- 工具函数

function log(...args) {
  console.log(`[editor]`, ...args);
}

/** 定位 gh 可执行文件所在目录（工作区 .tools 下的 gh_xxx/bin） */
function findGhBinDir() {
  try {
    for (const name of fs.readdirSync(TOOLS_DIR)) {
      if (!name.startsWith('gh_')) continue;
      const binDir = path.join(TOOLS_DIR, name, 'bin');
      if (fs.existsSync(path.join(binDir, 'gh'))) return binDir;
    }
  } catch {
    /* 目录不存在就忽略 */
  }
  return null;
}

/** 子进程环境：补齐 gh 的 PATH 与 git/gh 配置路径 */
function subprocessEnv() {
  const env = { ...process.env };
  const ghBin = findGhBinDir();
  if (ghBin) env.PATH = `${ghBin}:${env.PATH || ''}`;
  if (!env.GH_CONFIG_DIR) env.GH_CONFIG_DIR = path.join(TOOLS_DIR, 'gh-config');
  if (!env.GIT_CONFIG_GLOBAL) env.GIT_CONFIG_GLOBAL = path.join(TOOLS_DIR, 'gitconfig');
  env.GH_NO_UPDATE_NOTIFIER = '1';
  env.GIT_TERMINAL_PROMPT = '0';
  return env;
}

function run(cmd, args, opts = {}) {
  return new Promise(resolve => {
    execFile(
      cmd,
      args,
      {
        cwd: BLOG_DIR,
        env: subprocessEnv(),
        maxBuffer: 8 * 1024 * 1024,
        timeout: 120000,
        ...opts
      },
      (err, stdout, stderr) => {
        resolve({
          ok: !err,
          stdout: stdout || '',
          stderr: stderr || '',
          error: err ? String(err.message || err) : null
        });
      }
    );
  });
}

// ---------------------------------------------------------------- front-matter

/** 拆出 front-matter 与正文 */
function splitFrontMatter(raw) {
  const text = String(raw).replace(/\r\n/g, '\n');
  if (!text.startsWith('---')) return { frontMatter: '', body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { frontMatter: '', body: text };
  const frontMatter = text.slice(3, end).replace(/^\n/, '');
  const body = text.slice(end + 4).replace(/^\n/, '');
  return { frontMatter, body };
}

function unquote(v) {
  const s = String(v == null ? '' : v).trim();
  if (/^".*"$/.test(s)) return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (/^'.*'$/.test(s)) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

/** 解析 `[a, b]` 形式的内联列表 */
function parseInlineList(v) {
  const s = String(v || '').trim();
  if (!/^\[.*\]$/.test(s)) return [];
  return s
    .slice(1, -1)
    .split(',')
    .map(x => unquote(x))
    .filter(Boolean);
}

/**
 * 把 front-matter 解析成字段数组。
 * 未知字段连同其原始行一起保留，保存时原样写回，避免破坏用户自定义字段。
 */
function parseFrontMatter(frontMatter) {
  const fields = [];
  let cur = null;
  for (const line of String(frontMatter).split('\n')) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s?(.*)$/);
    if (keyMatch) {
      cur = { key: keyMatch[1], inline: keyMatch[2], list: [], raw: [line] };
      fields.push(cur);
      continue;
    }
    if (!cur) continue;
    cur.raw.push(line);
    const itemMatch = line.match(/^\s+-\s+(.*)$/);
    if (itemMatch) cur.list.push(unquote(itemMatch[1]));
  }
  return fields;
}

function fieldValue(fields, key) {
  const f = fields.find(x => x.key === key);
  return f ? unquote(f.inline) : '';
}

function fieldList(fields, key) {
  const f = fields.find(x => x.key === key);
  if (!f) return [];
  return f.list.length ? f.list : parseInlineList(f.inline);
}

/** 需要加引号的 YAML 标量 */
function yamlScalar(value) {
  const s = String(value == null ? '' : value);
  if (s === '') return "''";
  const risky =
    /^\s|\s$/.test(s) ||
    /[:#[\]{}&*!|>'"%@`,]/.test(s) ||
    /^[-?]/.test(s) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(s);
  if (!risky) return s;
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/** 组装完整的文章文本 */
function buildPostText(values, extraRefs, body) {
  const lines = [
    '---',
    `title: ${yamlScalar(values.title)}`,
    `date: ${String(values.date || '').trim()}`,
    'tags:'
  ];
  for (const t of values.tags || []) lines.push(`  - ${yamlScalar(t)}`);
  lines.push('categories:');
  for (const c of values.categories || []) lines.push(`  - ${yamlScalar(c)}`);
  lines.push(`description: ${yamlScalar(values.description)}`);

  // 未知字段原样保留
  for (const f of extraRefs) lines.push(...f.raw);

  lines.push('---', '');
  const text = lines.join('\n');
  // 正文首尾都做规范化：body 里可能残留前导换行（front-matter 后本来就有一个空行），
  // 不去掉的话每次保存都会多出一个空行。
  const bodyText = String(body || '')
    .replace(/^[\r\n]+/, '')
    .replace(/\s+$/, '');
  return bodyText ? `${text}\n${bodyText}\n` : `${text}\n`;
}

// ---------------------------------------------------------------- 文章读写

function postPath(file) {
  const safe = path.basename(String(file || ''));
  if (!/^[^/\\]+\.md$/i.test(safe)) throw new Error(`非法的文件名: ${file}`);
  return path.join(POSTS_DIR, safe);
}

function readPost(file) {
  const full = postPath(file);
  const raw = fs.readFileSync(full, 'utf8');
  const { frontMatter, body } = splitFrontMatter(raw);
  const fields = parseFrontMatter(frontMatter);
  return {
    file: path.basename(full),
    title: fieldValue(fields, 'title'),
    date: fieldValue(fields, 'date'),
    tags: fieldList(fields, 'tags'),
    categories: fieldList(fields, 'categories'),
    description: fieldValue(fields, 'description'),
    body,
    extras: fields.filter(f => !KNOWN_FIELDS.includes(f.key)).map(f => ({ key: f.key, raw: f.raw }))
  };
}

function listPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter(f => /\.md$/i.test(f) && !f.startsWith('_'))
    .map(f => {
      try {
        const p = readPost(f);
        return {
          file: p.file,
          title: p.title || p.file.replace(/\.md$/i, ''),
          date: p.date,
          tags: p.tags,
          categories: p.categories,
          mtime: fs.statSync(path.join(POSTS_DIR, f)).mtimeMs
        };
      } catch (err) {
        return { file: f, title: f, date: '', tags: [], categories: [], mtime: 0, broken: err.message };
      }
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function savePost(payload) {
  const file = path.basename(String(payload.file || ''));
  if (!/^[^/\\]+\.md$/i.test(file)) throw new Error('文件名必须以 .md 结尾，且不能包含路径分隔符');

  // 重新读取原有 front-matter，保留未知字段
  const originalFile = payload.originalFile ? path.basename(String(payload.originalFile)) : '';
  let extras = [];
  if (originalFile && fs.existsSync(postPath(originalFile))) {
    extras = readPost(originalFile).extras;
  }

  const text = buildPostText(
    {
      title: payload.title,
      date: payload.date,
      tags: payload.tags || [],
      categories: payload.categories || [],
      description: payload.description
    },
    extras,
    payload.body
  );

  fs.mkdirSync(POSTS_DIR, { recursive: true });
  fs.writeFileSync(postPath(file), text, 'utf8');

  // 改名：删掉旧文件
  if (originalFile && originalFile !== file && fs.existsSync(postPath(originalFile))) {
    fs.unlinkSync(postPath(originalFile));
  }
  return { file, bytes: Buffer.byteLength(text) };
}

// ---------------------------------------------------------------- git / 部署

async function gitStatus() {
  const r = await run('git', ['status', '--porcelain']);
  if (!r.ok) return { ok: false, error: r.stderr || r.error, files: [] };
  const files = r.stdout.split('\n').filter(Boolean);
  return { ok: true, dirty: files.length > 0, files };
}

async function lastDeploy() {
  const r = await run('gh', [
    'run', 'list',
    '--repo', REPO,
    '--workflow', 'pages.yml',
    '--limit', '1',
    '--json', 'status,conclusion,displayTitle,createdAt,url'
  ]);
  if (!r.ok) return { ok: false, error: (r.stderr || r.error || '').trim().slice(0, 300) };
  try {
    const runs = JSON.parse(r.stdout);
    if (!runs.length) return { ok: true, run: null };
    return { ok: true, run: runs[0] };
  } catch (err) {
    return { ok: false, error: String(err.message) };
  }
}

async function publish(message) {
  const steps = [];
  const push = (name, res) => steps.push({ name, ok: res.ok, out: (res.stdout + res.stderr).trim().slice(0, 800) });

  push('git add', await run('git', ['add', '-A']));

  const commit = await run('git', ['commit', '-m', message || '更新博客']);
  const nothingToCommit = /nothing to commit|无文件要提交|没有任何更改/i.test(commit.stdout + commit.stderr);
  steps.push({ name: 'git commit', ok: commit.ok || nothingToCommit, out: (commit.stdout + commit.stderr).trim().slice(0, 800) });

  if (!commit.ok && !nothingToCommit) {
    return { ok: false, steps, fatal: '提交失败，已中止推送' };
  }

  const pushRes = await run('git', ['push']);
  push('git push', pushRes);
  if (!pushRes.ok) return { ok: false, steps, fatal: '推送失败' };

  return { ok: true, steps };
}

// ---------------------------------------------------------------- HTTP 辅助

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendText(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 8 * 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** 在 root 下安全解析文件路径，阻止目录穿越 */
function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const full = path.resolve(root, '.' + path.posix.normalize(decoded));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

function serveFile(res, fullPath) {
  fs.stat(fullPath, (err, st) => {
    if (err || !st.isFile()) return sendText(res, 404, 'Not Found');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fullPath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(fullPath).pipe(res);
  });
}

// ---------------------------------------------------------------- 路由

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;

  try {
    // ---- API
    if (p === '/api/posts' && req.method === 'GET') {
      return sendJson(res, 200, { posts: listPosts(), hexoPreview: HEXO_PREVIEW, repo: REPO });
    }

    if (p === '/api/post' && req.method === 'GET') {
      const file = url.searchParams.get('file');
      if (!file) return sendJson(res, 400, { error: '缺少 file 参数' });
      return sendJson(res, 200, { post: readPost(file) });
    }

    if (p === '/api/post' && req.method === 'POST') {
      const payload = JSON.parse((await readBody(req)) || '{}');
      const saved = savePost(payload);
      return sendJson(res, 200, { ok: true, ...saved, posts: listPosts() });
    }

    if (p === '/api/post' && req.method === 'DELETE') {
      const file = url.searchParams.get('file');
      if (!file) return sendJson(res, 400, { error: '缺少 file 参数' });
      const full = postPath(file);
      if (fs.existsSync(full)) fs.unlinkSync(full);
      return sendJson(res, 200, { ok: true, posts: listPosts() });
    }

    if (p === '/api/git' && req.method === 'GET') {
      return sendJson(res, 200, await gitStatus());
    }

    if (p === '/api/deploy' && req.method === 'GET') {
      return sendJson(res, 200, await lastDeploy());
    }

    if (p === '/api/publish' && req.method === 'POST') {
      const payload = JSON.parse((await readBody(req)) || '{}');
      const result = await publish(payload.message);
      const deploy = await lastDeploy();
      return sendJson(res, result.ok ? 200 : 500, { ...result, deploy });
    }

    // ---- 前端资源
    if (p === '/vendor/marked.js') {
      return serveFile(res, path.join(NODE_MODULES, 'marked', 'lib', 'marked.umd.js'));
    }
    if (p === '/vendor/mathjax/tex-svg.js') {
      return serveFile(res, path.join(NODE_MODULES, '@mathjax', 'src', 'bundle', 'tex-svg.js'));
    }
    if (p.startsWith('/vendor/prism/')) {
      const target = safeJoin(path.join(NODE_MODULES, 'prismjs'), p.slice('/vendor/prism'.length));
      return target ? serveFile(res, target) : sendText(res, 403, 'Forbidden');
    }

    // ---- 静态页面
    const target = safeJoin(PUBLIC_DIR, p === '/' ? '/index.html' : p);
    if (!target) return sendText(res, 403, 'Forbidden');
    return serveFile(res, target);
  } catch (err) {
    log('error:', err.message);
    return sendJson(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  log(`编辑器已启动: http://${HOST}:${PORT}/`);
  log(`博客目录: ${BLOG_DIR}`);
  log(`Hexo 预览: ${HEXO_PREVIEW}`);
  const ghBin = findGhBinDir();
  log(ghBin ? `gh 已找到: ${ghBin}` : '警告: 未找到 gh，发布后无法查询部署状态');
});
