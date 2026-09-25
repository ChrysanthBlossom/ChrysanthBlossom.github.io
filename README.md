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

## 写文章

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

已配置 GitHub Actions，推送到 `main` 分支即自动构建发布：

```
写完文章 → git push（只推 Markdown 源码）
         ↓
  GitHub 自动 npm ci + hexo generate
         ↓
  自动发布上线
```

**首次使用还差两步（在 GitHub 网页上操作）：**

1. 建一个名为 `ChrysanthBlossom.github.io` 的仓库，把本目录推上去
2. 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**

之后每次 `git push` 都会自动重新部署。工作流也支持在 Actions 页面手动触发
（配置了 `workflow_dispatch`）。

---

## 需要自定义的地方

- `_config.yml` → `url`：当前为 `https://ChrysanthBlossom.github.io`
- `_config.butterfly.yml` → `social`：GitHub 链接为占位值
- `_config.butterfly.yml` → `theme_color`：配色
- `source/_posts/hello-world.md`：占位文章，可改写或删除

> ⚠️ 删掉最后一篇文章后 Hexo **不会生成首页**（`public/index.html` 缺失），
> 归档页同理。替换文章而不是先删后写。
