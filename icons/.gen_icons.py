"""Generate PNG icons for the extension. Run once at build time.

Produces a blue rounded square with a white right-pointing chevron — a "go" arrow.
Stdlib only (struct + zlib); no Pillow dependency.
"""
import os
import struct
import zlib

BG = (37, 99, 235, 255)   # primary blue
FG = (255, 255, 255, 255) # white
TRANSPARENT = (0, 0, 0, 0)

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


def render(size):
    radius = max(2, size // 6)
    cx, cy = size / 2, size / 2
    # Chevron geometry — a thick ">" centered
    stroke = max(2, size // 8)
    arm = size * 0.28
    arm_x = cx + arm * 0.55
    top = (cx - arm * 0.55, cy - arm)
    bot = (cx - arm * 0.55, cy + arm)
    tip = (arm_x, cy)

    pixels = []
    for y in range(size):
        for x in range(size):
            # Rounded square mask
            in_square = inside_rounded(x + 0.5, y + 0.5, size, size, radius)
            if not in_square:
                pixels.append(TRANSPARENT)
                continue
            # Chevron: union of two thick segments (top->tip and bot->tip)
            d1 = dist_to_segment(x + 0.5, y + 0.5, top, tip)
            d2 = dist_to_segment(x + 0.5, y + 0.5, bot, tip)
            if min(d1, d2) <= stroke / 2:
                pixels.append(FG)
            else:
                pixels.append(BG)
    return pixels


def inside_rounded(x, y, w, h, r):
    if x < 0 or y < 0 or x > w or y > h:
        return False
    cx = min(max(x, r), w - r)
    cy = min(max(y, r), h - r)
    dx = x - cx
    dy = y - cy
    return dx * dx + dy * dy <= r * r


def dist_to_segment(px, py, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    cx = ax + t * dx
    cy = ay + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def main():
    for size in (16, 32, 48, 128):
        path = os.path.join(OUT_DIR, f"icon-{size}.png")
        write_png(path, size, size, render(size))
        print("wrote", path)


if __name__ == "__main__":
    main()
