#!/usr/bin/env python3
"""
生成博客的品牌图像（头像 + favicon）。

没有 ImageMagick / PIL，所以这里手写了一个极简 PNG 光栅化器：
  - 多边形扫描线填充 + 4x 超采样抗锯齿
  - 径向渐变背景
  依赖只有标准库 zlib / struct / math。

用法：python3 tools/gen_brand_assets.py
输出：source/img/avatar.png, source/img/favicon.png
"""

import math
import os
import struct
import zlib

SS = 4  # 超采样倍数

# ---------------------------------------------------------------- 工具函数


def hex2rgb(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def lerp(a, b, t):
    return a + (b - a) * t


def clamp01(v):
    return 0.0 if v < 0.0 else (1.0 if v > 1.0 else v)


def write_png(path, width, height, data, channels=3):
    """data: 行优先像素缓冲，channels=3 为 RGB，4 为 RGBA。"""
    stride = width * channels
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (None)
        raw += data[y * stride:(y + 1) * stride]

    def chunk(typ, d):
        out = struct.pack(">I", len(d)) + typ + d
        return out + struct.pack(">I", zlib.crc32(typ + d) & 0xFFFFFFFF)

    ctype = 2 if channels == 3 else 6
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, ctype, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print(f"  wrote {path}  ({width}x{height}, {channels}ch, {len(png)} bytes)")


# ---------------------------------------------------------------- 几何构造


def flame_polygon(cx, base_y, height, radius, lean, exp=0.72, nseg=140):
    """火焰轮廓：圆底 + 带倾斜的上收锥，返回闭合多边形顶点。

    exp 控制收尖曲线：越小越「上宽下尖」像气球，越大越早收窄像火苗。
    """
    pts = []
    # 右侧：从底部到尖端
    for i in range(nseg + 1):
        t = i / nseg
        y = base_y - t * height
        xc = cx + lean * (t ** 2)
        w = radius * (1.0 - t) ** exp
        pts.append((xc + w, y))
    # 左侧：从尖端回到基部
    for i in range(nseg, -1, -1):
        t = i / nseg
        y = base_y - t * height
        xc = cx + lean * (t ** 2)
        w = radius * (1.0 - t) ** exp
        pts.append((xc - w, y))
    # 底部半圆：从左侧绕回右侧，闭合
    for i in range(1, nseg):
        a = math.pi * i / nseg
        pts.append((cx + radius * math.cos(a), base_y + radius * math.sin(a)))
    return pts


def rounded_rect_polygon(cx, cy, w, h, r, nseg=24):
    hw, hh = w / 2.0, h / 2.0
    r = min(r, hw, hh)
    corners = [
        (cx + hw - r, cy + hh - r, 0.0),
        (cx - hw + r, cy + hh - r, math.pi / 2),
        (cx - hw + r, cy - hh + r, math.pi),
        (cx + hw - r, cy - hh + r, 1.5 * math.pi),
    ]
    pts = []
    for (ox, oy, a0) in corners:
        for i in range(nseg + 1):
            a = a0 + (math.pi / 2) * i / nseg
            pts.append((ox + r * math.cos(a), oy + r * math.sin(a)))
    return pts


# ---------------------------------------------------------------- 光栅化


def rasterize(poly, W, H, ss=SS):
    """把多边形（最终像素坐标）填充成 [0,1] 覆盖率数组（尺寸 W*H）。

    内部把顶点缩放到 ss 倍超采样空间，扫描线逐子行求交，
    这样每个最终像素累积 ss*ss 个子样本，天然得到抗锯齿边缘。
    """
    poly = [(x * ss, y * ss) for (x, y) in poly]
    cov = [0.0] * (W * H)
    n = len(poly)
    inv = 1.0 / (ss * ss)
    for sy in range(H * ss):
        yc = sy + 0.5
        xs = []
        for i in range(n):
            x1, y1 = poly[i]
            x2, y2 = poly[(i + 1) % n]
            if y1 == y2:
                continue
            if (y1 <= yc < y2) or (y2 <= yc < y1):
                xs.append(x1 + (yc - y1) / (y2 - y1) * (x2 - x1))
        if len(xs) < 2:
            continue
        xs.sort()
        fy = sy // ss
        rowbase = fy * W
        for k in range(0, len(xs) - 1, 2):
            x0, x1 = xs[k], xs[k + 1]
            if x1 <= x0:
                continue
            p0 = int(x0 // ss)
            p1 = int((x1 - 1e-9) // ss)
            if p1 < 0 or p0 >= W:
                continue
            if p0 < 0:
                p0 = 0
            if p1 >= W:
                p1 = W - 1
            for px in range(p0, p1 + 1):
                lo = x0 if x0 > px * ss else px * ss
                hi = x1 if x1 < (px + 1) * ss else (px + 1) * ss
                if hi > lo:
                    cov[rowbase + px] += hi - lo
    return [c * inv for c in cov]


def composite_flame(buf, W, H, cov, y_top, y_bot, c_top, c_bot):
    """按垂直渐变把一层火焰合成进 RGB 缓冲。"""
    ct, cb = hex2rgb(c_top), hex2rgb(c_bot)
    span = max(1.0, y_bot - y_top)
    for i, a in enumerate(cov):
        if a <= 0.0:
            continue
        y = i // W
        t = clamp01((y - y_top) / span)
        j = i * 3
        for ch in range(3):
            src = lerp(cb[ch], ct[ch], t)
            buf[j + ch] = int(buf[j + ch] + (src - buf[j + ch]) * a + 0.5)


# ---------------------------------------------------------------- 渲染主逻辑


def render(size, out_path, rounded=False, bg_style="gradient"):
    W = H = size
    k = size / 512.0  # 以 512 设计稿为基准缩放

    buf = bytearray(W * H * 3)

    # ---- 背景
    base = hex2rgb("#170A2B")
    if bg_style == "gradient":
        glow_c = (256 * k, 430 * k)
        glow_r = 430 * k
        glow = hex2rgb("#B23A0E")
        for y in range(H):
            for x in range(W):
                d = math.hypot(x - glow_c[0], y - glow_c[1]) / glow_r
                g = (1.0 - d) if d < 1.0 else 0.0
                g = g * g
                j = (y * W + x) * 3
                for ch in range(3):
                    buf[j + ch] = int(lerp(base[ch], glow[ch], min(0.85, g * 0.95)) + 0.5)
    else:  # 纯色（favicon 用，保证小尺寸清晰）
        solid = hex2rgb("#1B0B2E")
        for i in range(W * H):
            j = i * 3
            buf[j] = solid[0]
            buf[j + 1] = solid[1]
            buf[j + 2] = solid[2]

    # ---- 三层火焰（外 → 中 → 内），逐层更亮更短
    layers = [
        # (base_x, base_y, height, radius, lean, exp, 顶端色, 底端色)
        (254, 388, 322, 84, 26, 0.72, "#FCD34D", "#F59E0B"),
        (258, 382, 212, 53, 24, 0.70, "#FEF3C7", "#FDE68A"),
        (262, 374, 118, 30, 30, 0.68, "#FFFFFF", "#FFF7ED"),
    ]
    for (bx, by, ht, rad, lean, ex, c_top, c_bot) in layers:
        poly = flame_polygon(bx * k, by * k, ht * k, rad * k, lean * k, ex)
        cov = rasterize(poly, W, H)
        # 该层的渐变区间：尖端 → 底部
        composite_flame(buf, W, H, cov, (by - ht) * k, (by + rad) * k, c_top, c_bot)

    # ---- favicon 用圆角方形裁切，并输出透明通道
    if rounded:
        m = rounded_rect_polygon(W / 2.0, H / 2.0, W, H, size * 0.22)
        mask = rasterize(m, W, H)
        rgba = bytearray(W * H * 4)
        for i, a in enumerate(mask):
            j3, j4 = i * 3, i * 4
            rgba[j4] = buf[j3]
            rgba[j4 + 1] = buf[j3 + 1]
            rgba[j4 + 2] = buf[j3 + 2]
            rgba[j4 + 3] = int(clamp01(a) * 255 + 0.5)
        write_png(out_path, W, H, rgba, channels=4)
        return

    write_png(out_path, W, H, buf)


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    imgdir = os.path.join(here, "..", "source", "img")
    os.makedirs(imgdir, exist_ok=True)

    print("generating brand assets...")
    render(512, os.path.join(imgdir, "avatar.png"), rounded=False, bg_style="gradient")
    render(192, os.path.join(imgdir, "favicon.png"), rounded=True, bg_style="solid")
    print("done.")
