#!/usr/bin/env python3
"""
把生成的 PNG 解码成 ASCII 字符画，用于在纯文本环境下检查图像构图。
支持本仓库产出的 8-bit RGB / RGBA（filter 0）PNG；透明像素合成到中灰上以便观察。

用法：python3 tools/preview_ascii.py source/img/avatar.png [宽度]
"""

import struct as _struct
import sys
import zlib

RAMP = " .:-=+*#%@"
MATTE = 128  # 透明区域的参考底色


def load_png(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a png"

    pos = 8
    w = h = nch = None
    idat = b""
    while pos < len(data):
        ln = int.from_bytes(data[pos:pos + 4], "big")
        typ = data[pos + 4:pos + 8]
        body = data[pos + 8:pos + 8 + ln]
        pos += 12 + ln
        if typ == b"IHDR":
            w, h, depth, ctype, _, _, _ = _struct.unpack(">IIBBBBB", body)
            assert depth == 8 and ctype in (2, 6), f"unsupported: depth={depth} ctype={ctype}"
            nch = 3 if ctype == 2 else 4
        elif typ == b"IDAT":
            idat += body
        elif typ == b"IEND":
            break

    raw = zlib.decompress(idat)
    stride = w * nch
    rows = []
    p = 0
    for _ in range(h):
        ftype = raw[p]
        p += 1
        assert ftype == 0, f"unsupported filter {ftype}"
        rows.append(raw[p:p + stride])
        p += stride
    return w, h, nch, rows


def main():
    path = sys.argv[1]
    cols = int(sys.argv[2]) if len(sys.argv) > 2 else 72

    w, h, nch, rows = load_png(path)
    rows_out = max(1, int(cols * h / w / 2))  # 字符高宽比约 2:1
    print(f"# {path}  {w}x{h} {nch}ch -> {cols}x{rows_out}")

    for ry in range(rows_out):
        line = []
        for rx in range(cols):
            x0, x1 = rx * w // cols, (rx + 1) * w // cols
            y0, y1 = ry * h // rows_out, (ry + 1) * h // rows_out
            tot = cnt = 0
            for y in range(y0, y1):
                row = rows[y]
                for x in range(x0, x1):
                    j = x * nch
                    r, g, b = row[j], row[j + 1], row[j + 2]
                    if nch == 4:
                        a = row[j + 3] / 255.0
                        r = int(r * a + MATTE * (1 - a))
                        g = int(g * a + MATTE * (1 - a))
                        b = int(b * a + MATTE * (1 - a))
                    tot += (r * 299 + g * 587 + b * 114) // 1000
                    cnt += 1
            lum = tot // max(1, cnt)
            line.append(RAMP[min(len(RAMP) - 1, lum * len(RAMP) // 256)])
        print("".join(line))


if __name__ == "__main__":
    main()
