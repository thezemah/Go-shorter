"""Generate PNG icons. Stdlib only (struct + zlib); no Pillow.

Design: rounded squircle with an indigo->violet gradient and a white
chevron-with-baseline mark inside. Lightly anti-aliased on the rounded
corners and stroke edges.
"""
import math
import os
import struct
import zlib

# Gradient endpoints (indigo-500 -> violet-500, slightly desaturated).
G_TOP = (99, 102, 241)     # #6366f1
G_BOTTOM = (139, 92, 246)  # #8b5cf6
FG = (255, 255, 255)

OUT_DIR = os.path.dirname(os.path.abspath(__file__))


def write_png(path, width, height, pixels):
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixels[y * width + x])
    compressed = zlib.compress(bytes(raw), 9)

    def chunk(tag, data):
        out = struct.pack(">I", len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return out + struct.pack(">I", crc)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c1, c2, t):
    return tuple(int(round(lerp(c1[i], c2[i], t))) for i in range(3))


def render(size):
    radius = max(2, int(size * 0.26))
    stroke = max(2, int(size * 0.13))
    cx, cy = (size - 1) / 2, (size - 1) / 2

    # Chevron geometry: ">" centered, slightly right-shifted to feel like motion.
    arm = size * 0.24
    tip = (cx + arm * 0.55, cy)
    top = (cx - arm * 0.45, cy - arm)
    bot = (cx - arm * 0.45, cy + arm)

    # Optional underline-baseline beneath the chevron (subtle).
    base_y = cy + arm * 1.28
    base_left = cx - arm * 0.55
    base_right = cx + arm * 0.55
    base_thick = stroke * 0.78

    pixels = []
    aa = 1.5  # anti-alias half-width in pixels
    for y in range(size):
        for x in range(size):
            px, py = x + 0.5, y + 0.5

            # Squircle mask with anti-aliased edge.
            d_outside = signed_dist_to_rounded_square(px, py, size, size, radius)
            mask = smoothstep(d_outside, aa)
            if mask <= 0:
                pixels.append((0, 0, 0, 0))
                continue

            # Gradient fill (vertical).
            t = py / max(size - 1, 1)
            base = lerp_color(G_TOP, G_BOTTOM, t)

            # Distance to the chevron mark (union of two thick segments + baseline).
            d1 = dist_to_segment(px, py, top, tip) - stroke / 2
            d2 = dist_to_segment(px, py, bot, tip) - stroke / 2
            d3 = dist_to_segment(px, py, (base_left, base_y), (base_right, base_y)) - base_thick / 2
            d_mark = min(d1, d2, d3)
            mark_alpha = smoothstep(-d_mark, aa)

            # Composite white mark over gradient base.
            r = int(round(lerp(base[0], FG[0], mark_alpha)))
            g = int(round(lerp(base[1], FG[1], mark_alpha)))
            b = int(round(lerp(base[2], FG[2], mark_alpha)))
            a = int(round(255 * mask))
            pixels.append((r, g, b, a))
    return pixels


def smoothstep(d, aa):
    """Returns 0..1; d>=aa -> 1, d<=-aa -> 0, linear in between."""
    if d >= aa:
        return 1.0
    if d <= -aa:
        return 0.0
    return 0.5 + 0.5 * (d / aa)


def signed_dist_to_rounded_square(x, y, w, h, r):
    """Negative outside, positive inside. AA-friendly."""
    cx = min(max(x, r), w - r)
    cy = min(max(y, r), h - r)
    if x < r or x > w - r or y < r or y > h - r:
        # In a corner zone if both axes are out of the inner rect
        if (x < r or x > w - r) and (y < r or y > h - r):
            dx = x - cx
            dy = y - cy
            return r - math.hypot(dx, dy)
        # Edge zone: distance to the nearest edge
        dx = min(x, w - x)
        dy = min(y, h - y)
        return min(dx, dy)
    return min(x, w - x, y, h - y)


def dist_to_segment(px, py, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    cx = ax + t * dx
    cy = ay + t * dy
    return math.hypot(px - cx, py - cy)


def main():
    for size in (16, 32, 48, 128):
        path = os.path.join(OUT_DIR, f"icon-{size}.png")
        write_png(path, size, size, render(size))
        print("wrote", path)


if __name__ == "__main__":
    main()
