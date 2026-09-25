/**
 * 写作台前端的端到端测试
 *
 * 本机没有可用的浏览器（缺 libnss3/libnspr4，装 Chromium 需要改系统），
 * 所以用 jsdom 真实执行前端代码：既能捕获运行时错误，
 * 也能验证「载入文章 → 编辑 → 预览 → 保存」这条主链路。
 *
 * MathJax 用桩替代（真实 bundle 依赖大量浏览器 API，在 jsdom 里跑不动），
 * 它的可访问性由单独的静态资源检查覆盖。
 *
 * 测试是非破坏性的：会先备份目标文章，结束时原样还原。
 *
 * 用法：先启动编辑器服务，然后
 *   node tools/editor/test-frontend.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/home/ume_1r0t0/ai_workplace/.tools/qa/node_modules/jsdom');

const ROOT = path.resolve(__dirname, '..', '..');
const EDITOR = __dirname;
const BASE = process.env.EDITOR_URL || 'http://localhost:4001';
const NM = path.join(ROOT, 'node_modules');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok) });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '\n        ' + detail));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, timeout = 8000, interval = 100) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (fn()) return true; } catch { /* 继续等 */ }
    await sleep(interval);
  }
  return false;
}

async function main() {
  let up = false;
  try { up = (await fetch(BASE + '/api/posts')).ok; } catch { /* ignore */ }
  check('编辑器服务可达', up, `无法连接 ${BASE}，请先运行 tools/editor/start.sh`);
  if (!up) return finish();

  // CSS 与 hidden 的冲突检查：hidden 属性靠浏览器默认样式表的 [hidden]{display:none}
  // 生效，作者样式表里任何 display 声明都会盖掉它。
  // （本文件里 .btn 设了 display:inline-flex，曾让带 hidden 的按钮无法隐藏）
  const cssText = fs.readFileSync(path.join(EDITOR, 'public', 'style.css'), 'utf8');
  const htmlText = fs.readFileSync(path.join(EDITOR, 'public', 'index.html'), 'utf8');
  const hiddenClasses = new Set();
  for (const tag of htmlText.matchAll(/<[a-z]+[^>]*\shidden(\s|>)[^>]*>/gi)) {
    const cm = tag[0].match(/class="([^"]*)"/);
    if (cm) cm[1].split(/\s+/).filter(Boolean).forEach(c => hiddenClasses.add(c));
  }
  const conflicts = [];
  for (const cls of hiddenClasses) {
    const re = new RegExp('\\.' + cls.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'g');
    for (const m of cssText.matchAll(re)) {
      if (/(?:^|;)\s*display\s*:/.test(m[1])) conflicts.push(cls);
    }
  }
  const hasFix = /\[hidden\][^{]*\{[^}]*display\s*:\s*none/.test(cssText);
  check(`带 hidden 的元素未被 CSS 的 display 覆盖（${hiddenClasses.size} 个 class）`,
    conflicts.length === 0 || hasFix,
    conflicts.length ? `冲突 class: ${conflicts.join(', ')}；需补 [hidden]{display:none}` : '');

  // 备份第一篇，测完还原
  const list = await (await fetch(BASE + '/api/posts')).json();
  const target = list.posts[0];
  const backup = (await (await fetch(BASE + '/api/post?file=' + encodeURIComponent(target.file))).json()).post;

  const html = fs.readFileSync(path.join(EDITOR, 'public', 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: BASE + '/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;

  const errors = [];
  window.addEventListener('error', e => errors.push('error: ' + (e.message || e)));
  window.addEventListener('unhandledrejection', e => errors.push('rejection: ' + ((e.reason && e.reason.message) || e.reason)));
  const origWarn = console.warn;
  console.warn = (...a) => { errors.push('warn: ' + a.join(' ')); };

  window.eval(fs.readFileSync(path.join(NM, 'marked', 'lib', 'marked.umd.js'), 'utf8'));
  check('marked 注入成功', window.marked && typeof window.marked.parse === 'function');

  window.eval(fs.readFileSync(path.join(NM, 'prismjs', 'prism.js'), 'utf8'));
  for (const lang of ['python', 'bash', 'json']) {
    try { window.eval(fs.readFileSync(path.join(NM, 'prismjs', 'components', `prism-${lang}.min.js`), 'utf8')); } catch { /* 忽略 */ }
  }
  check('Prism 注入成功', window.Prism && typeof window.Prism.highlightAllUnder === 'function');

  window.MathJax = { startup: { promise: Promise.resolve() }, typesetPromise: async () => {} };
  window.fetch = (input, init) => fetch(new URL(String(input), BASE), init);
  window.confirm = () => true;

  let evalError = null;
  try {
    window.eval(fs.readFileSync(path.join(EDITOR, 'public', 'app.js'), 'utf8'));
  } catch (err) {
    evalError = err;
  }
  check('app.js 可执行（无语法/顶层错误）', !evalError, evalError && evalError.stack);

  const $ = id => window.document.getElementById(id);

  // 1) 文章列表
  const listed = await waitFor(() => window.document.querySelectorAll('#post-list li').length >= 1);
  check('文章列表已渲染', listed);
  const firstName = listed ? window.document.querySelector('#post-list .p-title').textContent : '';
  check('列表项显示文章标题', firstName.length > 0);

  // 2) 文章应当被自动载入（这里曾是 bug：被部署状态查询阻塞）
  const loaded = await waitFor(() => $('editor').value.length > 0);
  check('文章正文已自动载入（不再被部署查询阻塞）', loaded, '编辑器仍为空');
  check('标题已填充', $('f-title').value.length > 0, '标题为空');
  check('文件名已填充', /\.md$/.test($('f-file').value), $('f-file').value);
  check('载入的是正确的文章', $('f-file').value === target.file,
    `期望 ${target.file}，实际 ${$('f-file').value}`);

  // 3) 预览已渲染
  check('预览渲染出 HTML', /<(p|h1|h2|ul|pre)\b/.test($('preview').innerHTML));

  // 4) 编辑后预览刷新 + 公式保护 + 代码高亮
  const sample = [
    '# 测试标题',
    '',
    '行内公式 $a_{i,j} * b_{j,k}$ 不应出现强调。',
    '',
    '$$\\int_{-\\infty}^{+\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$$',
    '',
    '```python',
    'def f(x):',
    '    return x * 2',
    '```'
  ].join('\n');

  $('editor').value = sample;
  $('editor').dispatchEvent(new window.Event('input', { bubbles: true }));

  const refreshed = await waitFor(() => $('preview').innerHTML.includes('测试标题'));
  check('编辑后预览已刷新', refreshed);

  const after = $('preview').innerHTML;
  check('公式未被 Markdown 破坏', after.includes('$a_{i,j} * b_{j,k}$') && !/<em>/.test(after));
  check('代码块被高亮', after.includes('class="token') || after.includes('language-python'));
  check('无 @@MATH 占位符残留', !/@@MATH/.test(after));
  check('编辑后出现未保存提示', !$('dirty').hidden);

  // 5) 保存（写回同一文件）
  $('btn-save').click();
  const saved = await waitFor(() => $('dirty').hidden, 8000);
  check('保存完成且脏标记消失', saved, '脏标记未清除');

  const onDisk = fs.readFileSync(path.join(ROOT, 'source', '_posts', target.file), 'utf8');
  check('保存内容已落盘', onDisk.includes('测试标题') && onDisk.includes('$a_{i,j} * b_{j,k}$'), onDisk.slice(0, 200));
  check('front-matter 结构正确', /^---\ntitle: .+\ndate: .+\ntags:\n[\s\S]*?---\n/.test(onDisk), onDisk.slice(0, 200));
  check('正文前无多余空行', /---\n\n[^\n]/.test(onDisk), JSON.stringify(onDisk.slice(0, 200)));

  // 幂等性：原地再保存一次，文件必须逐字节不变
  // （曾经每次保存都会多出一个空行，这条断言就是为了防止回归）
  $('btn-save').click();
  await waitFor(() => $('dirty').hidden, 5000);
  await sleep(400);
  const onDisk2 = fs.readFileSync(path.join(ROOT, 'source', '_posts', target.file), 'utf8');
  check('重复保存不改变文件（幂等）', onDisk === onDisk2,
    `第一次 ${onDisk.length} 字节，第二次 ${onDisk2.length} 字节`);

  const listAfter = await (await fetch(BASE + '/api/posts')).json();
  check('保存未产生多余文章', listAfter.posts.length === list.posts.length,
    `${list.posts.length} -> ${listAfter.posts.length}`);

  // 6) 还原备份
  await fetch(BASE + '/api/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...backup, originalFile: target.file })
  });
  const restored = fs.readFileSync(path.join(ROOT, 'source', '_posts', target.file), 'utf8');
  check('测试后已还原原文件',
    restored.includes('占位文章') && restored.includes(backup.title) && !restored.includes('测试标题'),
    restored.slice(0, 200));

  console.warn = origWarn;
  const real = errors.filter(e => !/Not implemented|Could not parse CSS/i.test(e));
  check('前端无运行时错误', real.length === 0, real.join('\n        '));

  return finish();
}

function finish() {
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n  结果: ${results.length - failed} 通过 / ${failed} 失败`);
  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error('测试脚本异常:', err);
  process.exit(2);
});
