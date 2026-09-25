/**
 * 让本地搜索索引不被 MathJax 的 SVG 撑爆。
 *
 * 问题：hexo-filter-mathjax 在构建期就把公式渲染成内联 SVG（体积很大），
 *       而 hexo-generator-searchdb 会把整篇正文原样塞进 search.xml。
 *       实测结果是索引里 96% 都是 SVG path 数据，
 *       既浪费带宽（50 篇文章约 1MB），又让搜索结果摘要显示成一堆乱码路径。
 *
 * 做法：在 after_generate 阶段读取 search.xml 这条路由的内容，
 *       把每个 <mjx-container> 换回它对应的原始 LaTeX（从 data-latex 属性取回），
 *       再用 route.set 写回。公式内容依然可被搜到，索引体积降两个数量级。
 *
 * 注：此处必须用路由而不是直接改 public/search.xml——
 *     after_generate 触发时文件尚未落盘（写盘由 CLI 在此之后完成）。
 *     改路由的好处是 hexo server 预览时同样生效。
 *
 * 只影响搜索索引，不影响页面本身的公式渲染。
 */

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'"
};

function decodeEntities(str) {
  return str.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, m => ENTITIES[m]);
}

function stripMathjaxSvg(html) {
  // 非贪婪匹配到配对的 </mjx-container>
  return html.replace(/<mjx-container\b[^>]*>[\s\S]*?<\/mjx-container>/g, whole => {
    // 容器内第一个 data-latex 就是完整表达式（后续是同一表达式的分行重复）
    const m = whole.match(/data-latex="([^"]*)"/);
    if (!m) return ' ';
    const latex = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
    return latex ? ` ${latex} ` : ' ';
  });
}

hexo.extend.filter.register('after_generate', function () {
  const target = (hexo.config.search && hexo.config.search.path) || 'search.xml';
  const route = hexo.route;
  const stream = route.get(target);
  if (!stream) return;

  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => {
      try {
        const original = Buffer.concat(chunks).toString('utf8');
        const cleaned = stripMathjaxSvg(original);
        if (cleaned !== original) {
          route.set(target, cleaned);
          const pct = 100 - Math.round((cleaned.length / original.length) * 100);
          hexo.log.info(
            'search-clean: %s 中的 MathJax SVG 已替换为 LaTeX，%d -> %d 字节 (-%d%%)',
            target,
            original.length,
            cleaned.length,
            pct
          );
        }
      } catch (err) {
        // 清理失败不应让整个构建失败
        hexo.log.warn('search-clean: %s', err.message);
      }
      resolve();
    });
  });
});
