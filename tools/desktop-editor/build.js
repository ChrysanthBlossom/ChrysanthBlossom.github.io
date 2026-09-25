#!/usr/bin/env node
/**
 * 把写作台打包成单个自包含的 HTML 文件。
 *
 * 所有依赖（marked / Prism / MathJax）都内联进去，
 * 生成的文件双击即可使用，完全离线，不需要服务器。
 *
 * 用法：node tools/desktop-editor/build.js [输出路径]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const BLOG = path.resolve(HERE, '..', '..');
const NM = path.join(BLOG, 'node_modules');
const OUT = process.argv[2] || path.resolve(BLOG, '..', 'blog-writer.html');

// MathJax v3 的 tex-svg bundle 是自包含的（字形数据内嵌），离线可用。
//
// 为什么不用本机 node_modules 里的 @mathjax/src v4：v4 把字形拆成了独立的
// 50MB 字体包，bundle 本身不含字形数据，内联后离线渲染不出公式。
//
// 缓存放在工作区的 .tools 下（不属于仓库），缺失时自动下载。
const MATHJAX_VERSION = '3.2.2';
const MATHJAX_CACHE = path.resolve(BLOG, '..', '.tools', 'mathjax3-tex-svg.js');
const MATHJAX_URLS = [
  `https://cdn.jsdelivr.net/npm/mathjax@${MATHJAX_VERSION}/es5/tex-svg.js`,
  `https://unpkg.com/mathjax@${MATHJAX_VERSION}/es5/tex-svg.js`
];

const PRISM_LANGS = [
  'python', 'bash', 'json', 'yaml', 'c', 'cpp', 'java', 'sql',
  'markdown', 'typescript', 'go', 'rust', 'diff'
];

function read(p, label) {
  if (!fs.existsSync(p)) {
    console.error(`缺少依赖文件：${p}${label ? '（' + label + '）' : ''}`);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

/** 取 MathJax bundle，本地有缓存就直接用 */
function getMathJax() {
  if (fs.existsSync(MATHJAX_CACHE) && fs.statSync(MATHJAX_CACHE).size > 500000) {
    console.log(`  MathJax: 使用缓存 ${MATHJAX_CACHE}`);
    return fs.readFileSync(MATHJAX_CACHE, 'utf8');
  }
  console.log('  MathJax: 缓存缺失，正在下载…');
  const { execFileSync } = require('child_process');
  fs.mkdirSync(path.dirname(MATHJAX_CACHE), { recursive: true });
  for (const url of MATHJAX_URLS) {
    try {
      execFileSync('curl', ['-sL', '--max-time', '120', '-o', MATHJAX_CACHE, url], { stdio: 'inherit' });
      if (fs.existsSync(MATHJAX_CACHE) && fs.statSync(MATHJAX_CACHE).size > 500000) {
        console.log(`  已下载并缓存到 ${MATHJAX_CACHE}`);
        return fs.readFileSync(MATHJAX_CACHE, 'utf8');
      }
    } catch (err) {
      console.warn(`  下载失败 ${url}: ${err.message}`);
    }
  }
  console.error('无法获取 MathJax bundle。可手动下载后放到：' + MATHJAX_CACHE);
  process.exit(1);
}

/**
 * 内联脚本时必须处理 </script>：
 * 直接出现会提前结束 <script> 标签，把后面的代码当成 HTML。
 */
function safeInline(js, label) {
  const hits = (js.match(/<\/script/gi) || []).length;
  if (hits > 0) {
    console.warn(`  ⚠ ${label}: 含 ${hits} 处 </script，已转义`);
    js = js.replace(/<\/script/gi, '<\\/script');
  }
  return js;
}

function main() {
  console.log('打包写作台…');

  const css = read(path.join(HERE, 'style.css'), '样式');
  const app = read(path.join(HERE, 'app.js'), '应用逻辑');
  const tpl = read(path.join(HERE, 'template.html'), '模板');
  const marked = read(path.join(NM, 'marked', 'lib', 'marked.umd.js'), 'marked');
  const prism = read(path.join(NM, 'prismjs', 'prism.js'), 'Prism');
  const mathjax = getMathJax();

  const langs = PRISM_LANGS.map(name => {
    const p = path.join(NM, 'prismjs', 'components', `prism-${name}.min.js`);
    if (!fs.existsSync(p)) {
      console.warn(`  ⚠ 跳过不存在的语言组件：${name}`);
      return '';
    }
    return read(p);
  }).join('\n');

  let html = tpl;
  html = html.replace('/*INLINE:CSS*/', () => css);
  html = html.replace('/*INLINE:MARKED*/', () => safeInline(marked, 'marked'));
  html = html.replace('/*INLINE:PRISM_CORE*/', () => safeInline(prism, 'Prism'));
  html = html.replace('/*INLINE:PRISM_LANGS*/', () => safeInline(langs, 'Prism 语言包'));
  html = html.replace('/*INLINE:MATHJAX*/', () => safeInline(mathjax, 'MathJax'));
  html = html.replace('/*INLINE:APP*/', () => safeInline(app, '应用逻辑'));

  if (html.includes('/*INLINE:')) {
    console.error('仍有未替换的占位符：', html.match(/\/\*INLINE:[A-Z_]+\*\//g));
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, 'utf8');

  const kb = n => (n / 1024).toFixed(0) + ' KB';
  console.log(`\n  输出: ${OUT}`);
  console.log(`  大小: ${kb(Buffer.byteLength(html))}`);
  console.log(`    其中 MathJax ${kb(Buffer.byteLength(mathjax))}, marked ${kb(Buffer.byteLength(marked))}, Prism ${kb(Buffer.byteLength(prism) + Buffer.byteLength(langs))}`);
  console.log(`  校验: </script 残留 ${(html.match(/<\/script>/gi) || []).length} 个（应为 6，即真实脚本标签数）`);
}

main();
