# -*- coding: utf-8 -*-
"""生成 PWA / iOS 所需图标（纯 Pillow 绘制，无外部素材依赖）"""
import os
from PIL import Image, ImageDraw

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "icons")
BASE = os.path.abspath(BASE)
os.makedirs(BASE, exist_ok=True)

BG_TOP = (34, 211, 238)     # #22d3ee
BG_BOT = (12, 94, 132)      # #0c5e84
BODY = (255, 255, 255)
FIN = (253, 186, 62)        # #fdba3e
EYE = (16, 52, 74)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        d.line([(0, y), (size, y)], fill=lerp(BG_TOP, BG_BOT, y / max(1, size - 1)))
    return img


def draw_fish(d, s):
    """在 512x512 设计坐标系中画鱼，s = size/512 缩放系数"""
    def P(x, y):
        return (x * s, y * s)

    # 尾巴
    d.polygon([P(360, 270), P(482, 168), P(482, 372)], fill=FIN)
    # 背鳍
    d.polygon([P(232, 186), P(300, 104), P(342, 190)], fill=FIN)
    # 腹鳍
    d.polygon([P(240, 352), P(300, 418), P(334, 346)], fill=FIN)
    # 身体
    d.ellipse([P(126, 178), P(392, 362)], fill=BODY)
    # 身体的浅色高光
    d.ellipse([P(160, 200), P(360, 280)], fill=(235, 250, 255))
    # 眼睛
    cx, cy, r = 196, 250, 20
    d.ellipse([P(cx - r, cy - r), P(cx + r, cy + r)], fill=EYE)
    d.ellipse([P(cx - r * 0.38, cy - r * 0.45), P(cx + r * 0.18, cy - r * 0.05)], fill=(255, 255, 255))
    # 嘴
    d.arc([P(126, 268), P(176, 318)], start=120, end=260, fill=EYE, width=max(2, int(6 * s)))
    # 气泡
    for (bx, by, br) in [(92, 150, 20), (58, 104, 13), (92, 62, 8)]:
        d.ellipse([P(bx - br, by - br), P(bx + br, by + br)], outline=(255, 255, 255), width=max(2, int(5 * s)))


def rounded(img, radius_ratio=0.22):
    size = img.size[0]
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def make(size, name, rounded_bg=True, content_scale=1.0):
    s = size / 512.0 * content_scale
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # 内容居中缩放
    off = (1 - content_scale) / 2 * size
    layer2 = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(layer2)
    sub = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(sub)
    # 用临时大图绘制后缩放粘贴，保证 content_scale 生效
    tmp = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_fish(ImageDraw.Draw(tmp), size / 512.0)
    if content_scale != 1.0:
        ns = int(size * content_scale)
        tmp = tmp.resize((ns, ns), Image.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.paste(tmp, (int(off), int(off)), tmp)
        tmp = canvas
    if rounded_bg:
        bg = rounded(gradient(size))
        bg = bg.convert("RGBA")
        bg.alpha_composite(tmp)
        bg.save(os.path.join(BASE, name))
    else:
        tmp.save(os.path.join(BASE, name))
    print("saved", name, size)


if __name__ == "__main__":
    make(192, "icon-192.png")
    make(512, "icon-512.png")
    make(512, "icon-maskable-512.png", rounded_bg=True, content_scale=0.78)
    make(180, "apple-touch-icon.png")
    make(32, "favicon-32.png")
    print("done ->", BASE)
