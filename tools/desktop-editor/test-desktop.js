/**
 * 单文件写作台的端到端测试
 *
 * 直接测试 build.js 打包出来的那个 HTML —— 也就是用户双击运行的真实产物，
 * 而不是源文件。用 jsdom 执行其中的内联脚本并断言界面行为。
 *
 * MathJax（2MB）跳过执行：它在 jsdom 里跑不动，且它的可离线运行由
 * 「bundle 自包含」这一静态事实保证。这里用桩替代。
 *
 * 用法：node tools/desktop-editor/test-desktop.js [html 路径]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('/home/ume_1r0t0/ai_workplace/.tools/qa/node_modules/jsdom');

const BLOG = path.resolve(__dirname, '..', '..');
const HTML_PATH = process.argv[2] || path.resolve(BLOG, '..', 'blog-writer.html');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok) });
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok || !detail ? '' : '\n        ' + detail));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, timeout = 6000, interval = 80) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (fn()) return true; } catch { /* 继续等 */ }
    await sleep(interval);
  }
  return false;
}

function main() {
  if (!fs.existsSync(HTML_PATH)) {
    console.error(`找不到 ${HTML_PATH}，请先运行 node tools/desktop-editor/build.js`);
    process.exit(2);
  }
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  console.log(`测试产物: ${HTML_PATH}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)\n`);

  // ---- 静态检查
  check('文件是完整 HTML', /^<!DOCTYPE html>/i.test(html) && html.trim().endsWith('</html>'));
  check('没有残留的打包占位符', !html.includes('/*INLINE:'));
  check('没有外部资源引用（完全离线）',
    !/<script[^>]+src=/i.test(html) && !/<link[^>]+href=/i.test(html),
    (html.match(/<(script[^>]+src|link[^>]+href)=[^>]*>/gi) || []).join('\n        '));

  // 提取内联脚本。注意要匹配带属性的开标签（Prism 那个带 data-manual）
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  check('内联脚本数量正确（配置+marked+Prism+语言包+MathJax+应用）', scripts.length === 6,
    `实际 ${scripts.length} 个`);

  const [conf, markedSrc, prismSrc, prismLangs, mathjaxSrc, appSrc] = scripts;
  check('MathJax 配置存在', /window\.MathJax\s*=/.test(conf || ''));
  check('marked 已内联', /marked/.test(markedSrc || '') && (markedSrc || '').length > 10000);
  check('Prism 已内联', /Prism/.test(prismSrc || ''));
  check('MathJax 已内联且自包含', (mathjaxSrc || '').length > 1000000);
  check('应用逻辑已内联', /uploadCurrent|protectMath/.test(appSrc || ''));

  // 一致性检查：app.js 里引用的每个元素 ID，模板里都必须真实存在。
  // 曾经因为模板漏了一个按钮，bindEvents 抛错导致整个应用白屏。
  const appIds = [...new Set([
    ...[...(appSrc || '').matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)].map(m => m[1]),
    ...[...(appSrc || '').matchAll(/\bon\('([A-Za-z0-9_-]+)'/g)].map(m => m[1])
  ])];
  const missingIds = appIds.filter(id => !new RegExp(`id="${id}"`).test(html));
  check(`app.js 引用的元素 ID 全部存在于模板中（共 ${appIds.length} 个）`,
    missingIds.length === 0, '缺失: ' + missingIds.join(', '));

  // CSS 冲突检查：hidden 属性靠浏览器默认样式表的 [hidden]{display:none} 生效，
  // 作者样式表里任何 display 声明都会盖掉它。
  // 曾经 .modal-mask{display:flex} 导致设置弹窗永远关不掉 —— 这条就是防它回归。
  const cssText = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/) || [, ''])[1];
  const hiddenTags = [...html.matchAll(/<[a-z]+[^>]*\shidden(\s|>)[^>]*>/gi)].map(m => m[0]);
  const hiddenClasses = new Set();
  for (const tag of hiddenTags) {
    const cm = tag.match(/class="([^"]*)"/);
    if (cm) cm[1].split(/\s+/).filter(Boolean).forEach(c => hiddenClasses.add(c));
  }
  const conflictClasses = [];
  for (const cls of hiddenClasses) {
    const re = new RegExp('\\.' + cls.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '\\s*\\{([^}]*)\\}', 'g');
    for (const m of cssText.matchAll(re)) {
      if (/(?:^|;)\s*display\s*:/.test(m[1])) conflictClasses.push(cls);
    }
  }
  const hasHiddenFix = /\[hidden\][^{]*\{[^}]*display\s*:\s*none/.test(cssText);
  check(`带 hidden 的元素未被 CSS 的 display 覆盖（检查了 ${hiddenClasses.size} 个 class）`,
    conflictClasses.length === 0 || hasHiddenFix,
    conflictClasses.length
      ? `这些 class 设了 display 会导致 hidden 失效: ${conflictClasses.join(', ')}；需补 [hidden]{display:none}`
      : '');

  // ---- 运行时检查
  const dom = new JSDOM(html, {
    url: 'http://localhost/blog-writer.html',   // 用 http 源以便 localStorage 可用
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const { window } = dom;
  const $ = id => window.document.getElementById(id);

  const errors = [];
  window.addEventListener('error', e => errors.push('error: ' + (e.message || e)));
  window.addEventListener('unhandledrejection', e => errors.push('rejection: ' + ((e.reason && e.reason.message) || e.reason)));
  const origWarn = console.warn;
  console.warn = (...a) => errors.push('warn: ' + a.join(' '));

  let evalError = null;
  try {
    window.eval(conf);                      // 配置脚本（含 Prism.manual 置位）
    // 配置脚本执行后再用桩覆盖 MathJax：真实 bundle 2MB，在 jsdom 里跑不动
    window.MathJax = { startup: { promise: Promise.resolve() }, typesetPromise: async () => {} };
    window.eval(markedSrc);                 // marked
    window.eval(prismSrc);                  // Prism 核心
    window.eval(prismLangs);                // 语言组件
    window.confirm = () => true;            // jsdom 未实现 confirm
    window.eval(appSrc);                    // 应用
  } catch (err) {
    evalError = err;
  }
  check('内联脚本可执行（无语法/顶层错误）', !evalError, evalError && evalError.stack);

  return (async () => {
    await sleep(900);

    check('marked 可用', typeof window.marked === 'object' && typeof window.marked.parse === 'function');
    check('Prism 可用', typeof window.Prism === 'object' && typeof window.Prism.highlightAllUnder === 'function');
    check('Prism 处于手动模式（不会自动重复高亮）', window.Prism && window.Prism.manual === true,
      `Prism.manual = ${window.Prism && window.Prism.manual}`);

    // 首次使用会生成一篇示例草稿
    const items = window.document.querySelectorAll('#post-list li');
    check('文章列表已渲染', items.length >= 1, `实际 ${items.length} 项`);

    const editorVal = $('editor').value;
    check('编辑器已载入示例草稿', editorVal.length > 0, '编辑器为空');
    check('标题已填充', $('f-title').value.length > 0);
    check('文件名已填充', /\.md$/.test($('f-file').value), $('f-file').value);

    const previewHtml = $('preview').innerHTML;
    check('预览渲染出 HTML', /<(p|h1|h2|ul|pre)\b/.test(previewHtml), previewHtml.slice(0, 120));

    // 实时保存
    const before = window.localStorage.getItem('blogwriter.posts.v1');
    check('启动即写入本地存储', Boolean(before), 'localStorage 为空');
    const countBefore = JSON.parse(before || '[]').length;

    $('editor').value = '# 实时保存测试\n\n内容 ' + Date.now();
    $('editor').dispatchEvent(new window.Event('input', { bubbles: true }));
    check('编辑后立即标记为待保存', !$('dirty').hidden);

    const saved = await waitFor(() => {
      const raw = window.localStorage.getItem('blogwriter.posts.v1');
      return raw && raw.includes('实时保存测试');
    }, 5000);
    check('自动保存已落盘（实时保存）', saved, 'localStorage 中未出现新内容');
    check('保存后脏标记消失', await waitFor(() => $('dirty').hidden, 3000));

    // 新建
    const n0 = window.document.querySelectorAll('#post-list li').length;
    $('btn-new').click();
    await sleep(400);
    const n1 = window.document.querySelectorAll('#post-list li').length;
    check('新建草稿生效', n1 === n0 + 1, `${n0} -> ${n1}`);
    check('新草稿标题为空', $('f-title').value === '');

    // 设置弹窗
    check('设置弹窗初始隐藏', $('modal-settings').hidden);
    const hiddenStyle = window.getComputedStyle($('modal-settings'));
    check('初始隐藏时计算样式也是 display:none', hiddenStyle.display === 'none',
      `getComputedStyle().display = ${hiddenStyle.display}`);

    // 没有 Token 时点上传，应当引导去设置
    $('btn-upload').click();
    await sleep(300);
    check('未配置 Token 时上传会引导到设置', !$('modal-settings').hidden);
    check('默认仓库已预填', $('s-owner').value === 'ChrysanthBlossom' && $('s-repo').value === 'ChrysanthBlossom.github.io',
      `${$('s-owner').value} / ${$('s-repo').value}`);

    // 关键：点「保存」必须真正关掉弹窗（不是只改 hidden 属性）
    // 曾经 .modal-mask{display:flex} 盖掉了 [hidden]{display:none}，弹窗永远关不掉
    $('s-token').value = 'github_pat_TESTSECRET';
    $('s-save').click();
    await sleep(400);

    check('点保存后弹窗消失（属性）', $('modal-settings').hidden);
    const savedStyle = window.getComputedStyle($('modal-settings'));
    check('点保存后弹窗计算样式为 display:none（真正不可见）',
      savedStyle.display === 'none', `getComputedStyle().display = ${savedStyle.display}`);
    check('Token 已写入设置',
      JSON.parse(window.localStorage.getItem('blogwriter.settings.v1') || '{}').token === 'github_pat_TESTSECRET');

    $('btn-settings').click();
    check('可再次打开', !$('modal-settings').hidden);
    $('s-cancel').click();
    check('取消后弹窗关闭', $('modal-settings').hidden);

    // 公式保护（在打包产物里再验一次）
    $('editor').value = '公式 $a_{i,j} * b_{j,k}$ 与代码：\n\n```python\nx = "$HOME"\n```\n';
    $('editor').dispatchEvent(new window.Event('input', { bubbles: true }));
    await waitFor(() => $('preview').innerHTML.includes('a_'), 4000);
    const pv = $('preview').innerHTML;
    check('打包产物中公式未被 Markdown 破坏', pv.includes('$a_{i,j} * b_{j,k}$') && !/<em>/.test(pv), pv.slice(0, 200));
    check('打包产物中代码块保留 $ 原样', pv.includes('$HOME'));
    check('无 @@MATH 占位符残留', !/@@MATH/.test(pv));

    // 导出会创建 blob 链接，jsdom 里验证不抛错即可
    let exportOk = true;
    try { $('btn-export').click(); } catch { exportOk = false; }
    check('导出按钮可用', exportOk);

    console.warn = origWarn;
    const real = errors.filter(e => !/Not implemented|Could not parse CSS|navigation/i.test(e));
    check('运行时无错误', real.length === 0, real.join('\n        '));

    // ---------- 场景 2：浏览器禁用 localStorage（file:// 下可能发生）----------
    console.log('\n  --- 场景 2：localStorage 不可用时的兜底 ---');

    const dom2 = new JSDOM(html, {
      url: 'http://localhost/x.html',
      runScripts: 'outside-only',
      pretendToBeVisual: true
    });
    const w2 = dom2.window;
    Object.defineProperty(w2, 'localStorage', {
      configurable: true,
      get() { throw new Error('localStorage is not available for opaque origins'); }
    });

    let e2 = null;
    try {
      w2.eval(conf);
      w2.MathJax = { startup: { promise: Promise.resolve() }, typesetPromise: async () => {} };
      w2.eval(markedSrc);
      w2.eval(prismSrc);
      w2.eval(prismLangs);
      w2.confirm = () => true;
      w2.eval(appSrc);
    } catch (err) {
      e2 = err;
    }
    const w$ = id => w2.document.getElementById(id);

    check('场景2：应用仍能启动（存储不可用不该导致崩溃）', !e2, e2 && e2.message);
    await sleep(800);

    check('场景2：文章列表仍渲染', w2.document.querySelectorAll('#post-list li').length >= 1);
    check('场景2：已提示用户存储受限', !w$('storage-warn').hidden,
      w$('storage-warn').textContent.slice(0, 60));

    w$('editor').value = '# 兜底保存测试\n\n内容';
    w$('editor').dispatchEvent(new w2.Event('input', { bubbles: true }));

    const viaName = await waitFor(() => String(w2.name || '').includes('兜底保存测试'), 5000);
    check('场景2：自动保存降级到 window.name 并生效', viaName,
      `window.name 长度 ${String(w2.name || '').length}`);

    const dom2Preview = await waitFor(() => w$('preview').innerHTML.includes('兜底保存测试'), 4000);
    check('场景2：预览仍正常工作', dom2Preview);

    // ---------- 场景 3：删除线上文章（拦截 GitHub API）----------
    console.log('\n  --- 场景 3：从博客删除文章 ---');

    const dom3 = new JSDOM(html, { url: 'http://localhost/y.html', runScripts: 'outside-only', pretendToBeVisual: true });
    const w3 = dom3.window;
    const calls = [];
    w3.localStorage.setItem('blogwriter.settings.v1', JSON.stringify({
      owner: 'ChrysanthBlossom', repo: 'ChrysanthBlossom.github.io', branch: 'main', token: 'github_pat_TESTTOKEN'
    }));
    w3.localStorage.setItem('blogwriter.posts.v1', JSON.stringify([{
      id: 'p-del', title: '待删除的文章', date: '2026-09-25 20:00:00', file: 'to-delete.md',
      tags: [], categories: [], description: '', body: '正文内容', extras: [], updatedAt: Date.now()
    }]));

    w3.fetch = async (url, opts = {}) => {
      const method = (opts.method || 'GET').toUpperCase();
      calls.push({ url: String(url), method, body: opts.body, headers: opts.headers || {} });
      if (method === 'DELETE') return { ok: true, status: 200, json: async () => ({ commit: { sha: 'c0ffee' } }) };
      if (String(url).includes('/contents/')) return { ok: true, status: 200, json: async () => ({ sha: 'FAKESHA123', name: 'to-delete.md' }) };
      return { ok: true, status: 200, json: async () => ({ full_name: 'x/y' }) };
    };
    w3.confirm = () => true;

    let e3 = null;
    try {
      w3.eval(conf);
      w3.MathJax = { startup: { promise: Promise.resolve() }, typesetPromise: async () => {} };
      w3.eval(markedSrc); w3.eval(prismSrc); w3.eval(prismLangs); w3.eval(appSrc);
    } catch (err) { e3 = err; }
    check('场景3：应用可启动', !e3, e3 && e3.message);

    await sleep(700);
    const w3$ = id => w3.document.getElementById(id);
    check('场景3：载入了待删除的文章', w3$('f-file').value === 'to-delete.md', w3$('f-file').value);

    calls.length = 0;
    w3$('btn-delete-remote').click();
    await sleep(800);

    const del = calls.find(c => c.method === 'DELETE');
    const get = calls.find(c => c.method === 'GET' && c.url.includes('/contents/'));
    check('场景3：先 GET 取到了文件 sha', Boolean(get), JSON.stringify(calls.map(c => c.method + ' ' + c.url)));
    check('场景3：发出了 DELETE 请求', Boolean(del));
    if (del) {
      check('场景3：删除的是正确的文件路径',
        /\/contents\/source\/_posts\/to-delete\.md$/.test(del.url), del.url);
      const body = JSON.parse(del.body || '{}');
      check('场景3：请求体带了 sha / branch / 提交信息',
        body.sha === 'FAKESHA123' && body.branch === 'main' && /删除文章/.test(body.message || ''),
        JSON.stringify(body));
      check('场景3：带了 Authorization 头',
        String(del.headers.Authorization || '').startsWith('Bearer '), String(del.headers.Authorization));
    }
    check('场景3：状态栏显示已从线上删除',
      /已从线上删除/.test(w3$('upload-state').textContent || ''), w3$('upload-state').textContent);

    const failed = results.filter(r => !r.ok).length;
    console.log(`\n  结果: ${results.length - failed} 通过 / ${failed} 失败`);
    process.exit(failed ? 1 : 0);
  })();
}

main();
