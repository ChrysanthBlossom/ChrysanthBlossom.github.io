# 菲尼克斯奇幻乐园

ChrysanthBlossom 的个人博客，基于 **Hexo 7.3.0 + Butterfly 5.7.0** 构建的静态站点，
通过 GitHub Actions 自动发布到 GitHub Pages。

- 线上地址：<https://ChrysanthBlossom.github.io/>
- 仓库名必须是 `ChrysanthBlossom.github.io` 才能发布到根路径（否则要改 `url` 和 `root`）

---

## 目录结构

| 路径 | 作用 |
| --- | --- |
| `_config.yml` | Hexo 站点配置（站名、作者、URL、公式、搜索、部署） |
| `_config.butterfly.yml` | Butterfly 主题配置（菜单、社交、头像、配色） |
| `source/_posts/` | 文章（Markdown） |
| `source/img/` | 头像与 favicon（由脚本生成） |
| `scripts/search-clean.js` | 构建钩子，见下文「搜索索引优化」 |
| `tools/` | 图像生成与预览脚本（不会被打包进站点） |
| `.github/workflows/pages.yml` | GitHub Actions 自动部署 |
| `public/` | 构建产物（已 gitignore） |

---

## 常用命令

```bash
npx hexo server      # 本地预览 http://localhost:4000
npx hexo generate    # 构建到 public/
npx hexo clean       # 清理缓存与 public/
npx hexo new post "标题"   # 新建文章
npx hexo new page "页面名" # 新建页面
```

> **首次运行前需要 `npm install`。**
> 本机 npm 默认缓存目录不可写，需要先指定到工作区内：
> ```bash
> export npm_config_cache=$PWD/.npm-cache
> ```

---

## 写作台（本地图形界面，推荐）

不用敲命令，浏览器里写、看、发。

```bash
./tools/editor/start.sh
```

然后打开 **http://localhost:4001/**

它会顺带把 Hexo 预览服务（端口 4000）也拉起来，所以「真实预览」按钮能直接看到主题渲染后的效果。

### 功能

| 功能 | 说明 |
| --- | --- |
| 文章列表 | 左侧列出全部文章，点击切换 |
| 元信息表单 | 标题 / 日期 / 标签 / 分类 / 描述 / 文件名，不用手写 YAML |
| 实时预览 | 左边写，右边即时渲染 |
| 公式预览 | 支持 `$行内$` 和 `$$块级$$`，由 MathJax 渲染 |
| 代码高亮 | 使用 Prism.js |
| 一键保存 | `Ctrl+S` |
| 一键发布 | 自动 `git add/commit/push`，并回显 GitHub Actions 部署状态 |
| 真实预览 | 按钮跳到 Hexo 渲染后的页面（与线上完全一致） |

### 实现要点

- **零第三方依赖**：后端只用 Node 内置模块（`http` / `fs` / `path` / `child_process`）
- **只监听 127.0.0.1**，不对局域网暴露；静态资源解析做了目录穿越防护
- **复用博客自己的库**：预览用 `marked`（与 Hexo 构建时同一个库），
  MathJax 用本地 `@mathjax/src` 的 bundle，不依赖 CDN
- **公式保护**：`marked` 会把公式里的 `_` 和 `*` 当成强调语法渲染坏
  （例如 `$a_{i,j} * b_{j,k}$`）。编辑器渲染前先把公式抽成占位符、
  渲染后再放回，与博客构建时 `hexo-filter-mathjax` 的做法一致
- **保留未知 front-matter 字段**：`sticky`、`cover` 等自定义字段在保存时原样写回，
  不会被表单覆盖掉
- 代码高亮没有用 `highlight.js`：它的 npm 包只发布 CommonJS
  （`es/` 目录只是转发到 `lib/`），浏览器无法直接加载，因此改用 Prism.js

### 打不开怎么办

浏览器报 **「localhost 未发送任何数据」**（`ERR_EMPTY_RESPONSE`）时，多半是 IPv4/IPv6 解析问题：

本机是 WSL2，Windows 侧的浏览器会把 `localhost` 优先解析成 IPv6 的 `::1`。
服务如果只绑 `127.0.0.1`，连接就会被接受却收不到数据 —— 正是这个报错。

服务端已改为**同时监听 `127.0.0.1` 和 `::1`**，两种写法都能用。
如果仍然打不开，直接用 IPv4：

```
http://127.0.0.1:4001/
```

### 测试

```bash
node tools/editor/test-math-protect.js   # 公式保护逻辑（9 个用例）
node tools/editor/test-frontend.js       # 前端端到端（24 项，需先启动服务）
```

本机没有可用的浏览器（缺 `libnss3` / `libnspr4`，装 Chromium 需要改系统），
所以前端测试用 **jsdom** 真实执行 DOM 代码。它能捕获运行时错误 ——
开发过程中就是靠它发现「部署状态查询阻塞了文章载入」这个 bug 的。

---

## 写文章（命令行方式）

```bash
npx hexo new post "映射思考"
```

`scaffolds/post.md` 的模板：

```markdown
---
title: 映射思考
date: 2026-09-25 18:04:00
tags:
categories:
description:
---
```

- **`description` 建议一定要填**：留空时主题会退而截取正文作为页面摘要，
  而正文里含有 MathJax 的内联样式，可能污染 `<meta name="description">`
  （参考站点 jryno1.github.io 就有这个现象）。
- `tags` / `categories` 可以是多个，写成 YAML 列表。
- 文章里可用 Markdown、代码块（自动高亮）、数学公式。

### 数学公式

公式由 `hexo-filter-mathjax` 在**构建期**渲染成内联 SVG，浏览器端无需再加载 MathJax，
因此没有公式闪烁，也不依赖 CDN。

直接写即可，无需在 front-matter 里声明：

```markdown
行内公式：$f: X \to Y$

块级公式：

$$
\int_{-\infty}^{+\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$
```

相关配置：站点 `_config.yml` 的 `mathjax` 段。
主题 `_config.butterfly.yml` 里的 `math.use` **必须留空**——
插件要求关掉主题的前端渲染器，否则浏览器端会再渲染一遍，出现重复公式。

---

## 搜索索引优化

`scripts/search-clean.js` 解决的是两个插件的冲突：

- `hexo-filter-mathjax` 把公式渲染成体积很大的内联 SVG
- `hexo-generator-searchdb` 把整篇正文塞进 `search.xml`

结果是搜索索引里 **96% 都是 SVG path 数据**（50 篇文章约 1MB），
而且搜索结果摘要会显示成乱码路径。

该脚本在 `after_generate` 阶段把索引里的 `<mjx-container>` 换回原始 LaTeX 再写回路由：

```
search-clean: search.xml 中的 MathJax SVG 已替换为 LaTeX，43692 -> 1662 字节 (-96%)
```

> 注意用的是 `route.set` 而不是直接改 `public/search.xml`：
> `after_generate` 触发时文件尚未落盘（写盘由 CLI 在此之后完成），
> 改路由才能同时覆盖 `hexo generate` 和 `hexo server`。

---

## 品牌图像

头像和 favicon 由 `tools/gen_brand_assets.py` 生成——
本机没有 ImageMagick / PIL，所以脚本内手写了一个极简 PNG 光栅化器
（多边形扫描线填充 + 4x 超采样抗锯齿，只用标准库）。

```bash
python3 tools/gen_brand_assets.py          # 重新生成 source/img/{avatar,favicon}.png
python3 tools/preview_ascii.py source/img/avatar.png 76   # 纯文本查看构图
```

想换配色就改脚本里的 `layers` 和背景色，然后重新运行。

---

## 主题配色

凤凰主题的琥珀橙配色在 `_config.butterfly.yml` 的 `theme_color` 段。

> Butterfly 5.7 的默认 `_config.yml` 里已经不再列出 `theme_color` 段，
> 但 `source/css/var.styl` 仍然会读取它，所以在这里覆盖是生效的。

---

## 部署到 GitHub Pages

**已上线：<https://chrysanthblossom.github.io/>**

仓库：<https://github.com/ChrysanthBlossom/ChrysanthBlossom.github.io>

推送到 `main` 分支即自动构建发布：

```
写完文章 → git push（只推 Markdown 源码）
         ↓
  GitHub 自动 npm ci + hexo generate
         ↓
  自动发布上线
```

### 发布命令

本机家目录只读，gh 和 git 的配置都在工作区内，所以推送必须带上一组环境变量。
已封装成一键脚本：

```bash
/home/ume_1r0t0/ai_workplace/publish-blog.sh            # 提交并推送
/home/ume_1r0t0/ai_workplace/publish-blog.sh "提交信息"  # 自定义提交信息
/home/ume_1r0t0/ai_workplace/publish-blog.sh --preview  # 只本地预览
```

### 凭据说明

`gh` CLI 装在 `/home/ume_1r0t0/ai_workplace/.tools/`（不在仓库内），
登录 token 保存在 `.tools/gh-config/hosts.yml`，scope 为 `repo` + `workflow`。

> `workflow` scope 是必需的：GitHub 不允许 OAuth 应用创建或修改
> `.github/workflows/` 下的文件，除非显式持有该权限。

### Pages 配置

- `build_type` 必须是 **`workflow`**（不是 `legacy`），否则 `actions/deploy-pages` 会失败
- 可用 API 切换，无需点网页：
  ```bash
  gh api -X PUT repos/ChrysanthBlossom/ChrysanthBlossom.github.io/pages -f build_type=workflow
  ```

### Actions 依赖版本

当前使用（已实测部署通过）：

| Action | 版本 |
| --- | --- |
| `actions/checkout` | v7 |
| `actions/setup-node` | v7（`node-version: 24`，当前 Active LTS） |
| `actions/configure-pages` | v6 |
| `actions/upload-pages-artifact` | v5 |
| `actions/deploy-pages` | v5 |

---

## 需要自定义的地方

- `_config.yml` → `url`：当前为 `https://ChrysanthBlossom.github.io`
- `_config.butterfly.yml` → `social`：GitHub 链接为占位值
- `_config.butterfly.yml` → `theme_color`：配色
- `source/_posts/hello-world.md`：占位文章，可改写或删除

> ⚠️ 删掉最后一篇文章后 Hexo **不会生成首页**（`public/index.html` 缺失），
> 归档页同理。替换文章而不是先删后写。
