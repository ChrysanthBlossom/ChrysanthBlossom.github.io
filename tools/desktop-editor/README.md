# 桌面版写作台（单文件离线 HTML）

双击就能用的博客写作工具。**不需要服务器、不需要命令行、不需要联网即可编辑。**

## 为什么会有这个版本

先做的是 `tools/editor/`（本地服务器版）。但那套依赖浏览器能访问 `localhost:4001`，
而本机是 WSL2，Windows 上的浏览器始终打不开那个端口（连 `127.0.0.1` 也一样，
报 `ERR_EMPTY_RESPONSE`）。这个单文件版彻底绕开了端口和服务器。

## 构建

```bash
node tools/desktop-editor/build.js            # 默认输出到 ../blog-writer.html
node tools/desktop-editor/build.js 输出路径
```

产物是**单个自包含 HTML**（约 2.2 MB），所有依赖都内联：

| 依赖 | 大小 | 用途 |
| --- | --- | --- |
| MathJax v3 `tex-svg` | 2.0 MB | 公式渲染（字形数据内嵌，离线可用） |
| marked | 72 KB | Markdown 渲染（与博客构建时同一个库） |
| Prism.js + 语言包 | 88 KB | 代码高亮 |

> **为什么用 MathJax v3 而不是 node_modules 里的 v4**：v4 把字形拆成了独立的
> 50 MB 字体包，`bundle/tex-svg.js` 本身不含字形数据，内联后离线渲染不出公式。
> v3 的 `es5/tex-svg.js` 是自包含的，所以构建脚本会把它缓存到
> `.tools/mathjax3-tex-svg.js`（缺失时自动下载）。

## 测试

```bash
node tools/desktop-editor/test-desktop.js
```

测试的是 **build.js 打包出来的真实产物**（而不是源文件），共 40 项，包括：

- 打包完整性：无占位符残留、无外部资源引用（保证离线可用）
- **ID 一致性**：app.js 里引用的每个元素 ID 在模板中都必须存在
- 真实执行内联脚本（用 jsdom），验证列表渲染、实时保存、预览、设置弹窗、公式保护
- **兜底场景**：模拟浏览器禁用 localStorage（`file://` 下可能发生），
  验证应用不崩溃且能降级到 `window.name`

## 实现要点

### 上传靠 GitHub API，不需要后端

GitHub REST API 的跨域预检允许 `PUT` + `Authorization`、`Access-Control-Allow-Origin: *`，
所以 `file://` 打开的页面也能直接提交文件：

```
PUT https://api.github.com/repos/{owner}/{repo}/contents/source/_posts/{file}
```

提交后 GitHub Actions 自动构建部署。更新已有文件需要先 `GET` 拿到 `sha`。

### 存储三层兜底

`file://` 在部分浏览器里被当作「不透明来源」，localStorage 会直接抛错
（jsdom 就是这样）。一旦存储静默失效，用户会丢稿，所以：

1. `localStorage` —— 正常情况，永久保存
2. `window.name` —— 刷新不丢（同标签页内有效，`file://` 下可用）
3. 内存 —— 至少本次会话不丢

用哪一层都会在状态栏明确提示，不会静默降级。

### 公式保护

`marked` 会把公式里的 `_` 和 `*` 当成强调语法渲染坏
（`$a_{i,j} * b_{j,k}$` 会变成斜体）。渲染前先把公式抽成占位符、
渲染后再放回，与博客构建时 `hexo-filter-mathjax` 的做法一致。

### 打包时的 `</script>` 转义

内联任意 JS 到 `<script>` 标签里时，代码正文中的 `</script>` 会提前闭合标签，
把后面的代码当成 HTML。`build.js` 会把它们转义，并在最后校验标签数量。
