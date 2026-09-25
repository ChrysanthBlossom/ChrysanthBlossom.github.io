/**
 * 公式保护逻辑的回归测试
 *
 * app.js 依赖 DOM，无法直接 require；这里把纯逻辑部分抠出来单独跑，
 * 并用博客构建时用的同一个 marked 验证渲染结果。
 *
 * 用法：node tools/editor/test-math-protect.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BLOG = path.resolve(__dirname, '..', '..');
const marked = require(path.join(BLOG, 'node_modules', 'marked'));

const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
const start = src.indexOf('function protectMath');
const end = src.indexOf('// ---------------------------------------------------------------- 预览渲染');
if (start === -1 || end === -1) {
  console.error('无法从 app.js 中定位 protectMath，测试脚本需要更新');
  process.exit(1);
}
const { protectMath, restoreMath } = new Function(
  src.slice(start, end) + '\nreturn { protectMath, restoreMath };'
)();

function render(md) {
  const { text, store } = protectMath(md);
  return restoreMath(marked.parse(text, { gfm: true, breaks: false }), store);
}

const cases = [
  {
    name: '行内公式里的下划线与星号不被当成强调',
    md: '设 $a_{i,j} * b_{j,k}$ 为矩阵元。',
    expect: h => !/<em>/.test(h) && h.includes('$a_{i,j} * b_{j,k}$')
  },
  {
    name: '块级公式原样保留（含反斜杠命令）',
    md: '推导：\n\n$$\\int_{-\\infty}^{+\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$$\n\n完毕。',
    expect: h => h.includes('\\int_{-\\infty}^{+\\infty}') && h.includes('\\sqrt{\\pi}')
  },
  {
    name: '围栏代码块里的 $ 不被抽取',
    md: '示例：\n\n```bash\necho "$HOME and $PATH"\n```\n',
    expect: h => h.includes('$HOME and $PATH') && !/@@MATH/.test(h)
  },
  {
    name: '行内代码里的 $ 不被抽取',
    md: '用 `$var` 表示变量。',
    expect: h => h.includes('$var') && !/@@MATH/.test(h)
  },
  {
    name: '同一行多个公式',
    md: '$x_1$ 与 $x_2$ 满足 $x_1 \\neq x_2$。',
    expect: h => (h.match(/@@MATH/g) || []).length === 0 && h.includes('\\neq')
  },
  {
    name: '公式内的星号不产生强调标签',
    md: '$a * b * c$ 和 $d_e_f$',
    expect: h => !/<em>/.test(h) && h.includes('$a * b * c$') && h.includes('$d_e_f$')
  },
  {
    name: '块级公式被拆成独立段落',
    md: '前\n\n$$E = mc^2$$\n\n后',
    // 注意：不能用正则写 $$E = mc^2$$，其中的 ^ 会被当成字符串起始锚点
    expect: h => h.includes('<p>$$E = mc^2$$</p>') &&
                 h.indexOf('<p>前</p>') < h.indexOf('<p>$$E = mc^2$$</p>') &&
                 h.indexOf('<p>$$E = mc^2$$</p>') < h.indexOf('<p>后</p>')
  },
  {
    name: '普通 Markdown 功能未被破坏',
    md: '# 标题\n\n- 项目一\n- 项目二\n\n**粗体** 和 [链接](https://example.com)\n',
    expect: h => h.includes('<h1') && h.includes('<li>项目一</li>') && h.includes('<strong>粗体</strong>')
  },
  {
    name: '美元符号作为普通货币不被误判为公式',
    md: '这本书 100$ 有点贵，但 50$ 还行。',
    expect: h => h.includes('100$') && !/@@MATH/.test(h)
  }
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  const html = render(c.md);
  const ok = c.expect(html);
  console.log((ok ? '  PASS  ' : '  FAIL  ') + c.name);
  if (!ok) {
    fail++;
    console.log('        输入: ' + JSON.stringify(c.md));
    console.log('        输出: ' + JSON.stringify(html));
  } else {
    pass++;
  }
}

console.log(`\n  结果: ${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
