"""Render the original TaskFlow motion loops with Pillow and FFmpeg."""
from math import cos, pi, sin
from pathlib import Path
from subprocess import PIPE, Popen

from PIL import Image, ImageDraw

WIDTH, HEIGHT = 768, 416
FPS, SECONDS = 24, 6
OUTPUT = Path(__file__).resolve().parents[1] / "client/public/motion"


def frame(kind, phase):
    # Render at double resolution to keep fine CAD lines clean in video.
    image = Image.new("RGB", (WIDTH * 2, HEIGHT * 2), (23, 29, 23))
    draw = ImageDraw.Draw(image)
    yaw = .46 + .083 * sin(phase)
    pitch = .54
    scale = 109

    def project(point):
        x, y, z = point
        dx = x * cos(yaw) - z * sin(yaw)
        dz = x * sin(yaw) + z * cos(yaw)
        return 805 + dx * scale, 488 + (dz * sin(pitch) - y * cos(pitch)) * scale

    def face(points, fill, stroke=None):
        pixels = [project(p) for p in points]
        draw.polygon(pixels, fill)
        if stroke:
            draw.line(pixels + pixels[:1], fill=stroke, width=2, joint="curve")

    def line(points, color, width=2):
        draw.line([project(p) for p in points], fill=color, width=width)

    def plane(x, y, z, w, d, color, edge=None):
        a, b = x - w / 2, x + w / 2
        n, f = z - d / 2, z + d / 2
        face([(a, y, n), (b, y, n), (b, y, f), (a, y, f)], color, edge)

    def block(x, y, z, w, h, d, palette, edge):
        a, b = x - w / 2, x + w / 2
        n, f = z - d / 2, z + d / 2
        t = y + h
        face([(b, t, n), (b, t, f), (b, y, f), (b, y, n)], palette[2], edge)
        face([(a, t, f), (b, t, f), (b, y, f), (a, y, f)], palette[1], edge)
        plane(x, t, z, w, d, palette[0], edge)

    for step in range(-12, 13):
        line([(step, -.14, -12), (step, -.14, 12)], "#35453a" if step % 4 == 0 else "#2c382e")
        line([(-12, -.14, step), (12, -.14, step)], "#35453a" if step % 4 == 0 else "#2c382e")

    if kind == "ledger":
        plane(.45, -.09, 0, 6.6, 5.35, "#202b22", "#4b5c4c")
        for x in [-2.4, 3.3]:
            for z in [-2.1, 2.1]:
                line([(x, -.06, z), (x, 2.95, z)], "#688164")
        for layer in range(5):
            x = .2 + .35 * sin(phase - layer * .62) + (layer - 2) * .065
            y = .36 + layer * .57 + .13 * cos(phase - layer * .78)
            z = -.18 * layer
            bright = layer == 4
            colors = ("#c8ec80", "#7b9c4c", "#516b38") if bright else ("#566d57", "#384c3e", "#2a3d30")
            edge = "#d9f49c" if bright else "#829a78"
            block(x, y, z, 5, .095, 3.38, colors, edge)
            ink = "#425a36" if bright else "#9cb190"
            for row in range(5):
                zz = z - 1.06 + row * .46
                line([(x - 1.79, y + .105, zz), (x + 1.82, y + .105, zz)], ink, 2)
                line([(x - 1.87, y + .105, zz - .1), (x - 1.87, y + .105, zz + .12)], ink, 6)
            scanner = z + sin(phase) * 1.1
            if bright:
                line([(x - 2.32, y + .107, scanner), (x + 2.32, y + .107, scanner)], "#e9ffc0", 4)
    else:
        plane(.2, -.1, 0, 9.3, 4.7, "#212e25", "#536757")
        for rail in [-1.85, 1.85]:
            line([(-4.45, -.06, rail), (4.68, -.06, rail)], "#9ca98b", 2)
        for col in range(7):
            x = (col - 3) * 1.22
            for tick in range(3):
                h = .24 + .1 * tick
                z = -1.16 + tick * 1.13
                raise_by = (.5 + .5 * cos(phase - col * .77 - tick * .23)) ** 3
                h += raise_by * (1.3 if tick == 1 else .65)
                bright = tick == 1 and raise_by > .46
                colors = ("#d6f58b", "#829f4c", "#597039") if bright else (
                    ("#95b9aa", "#55796d", "#3e6154") if tick == 1 else ("#607766", "#455a4d", "#34463b")
                )
                block(x, .035, z, .98, h, .86, colors, "#718b74")
                for track in [-.22, .22]:
                    line([(x + track, h + .048, z - .38), (x + track, h + .048, z + .38)], "#506b48")
                line([(x - .26, .17, z + .432), (x + .26, .17, z + .432)], "#d9f3b2" if bright else "#739581", 3)
            line([(x - .26, -.05, 2.06), (x + .26, -.05, 2.06)], "#a6bb83", 2)
        scan = sin(phase) * 3.78
        line([(scan, .004, -2.16), (scan, .004, 2.16)], "#d5f58c", 3)

    return image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def render(kind):
    frame(kind, 1.12).save(OUTPUT / f"{kind}.jpg", quality=86, optimize=True)
    command = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
        "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-framerate", str(FPS), "-i", "-",
        "-an", "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(OUTPUT / f"{kind}.mp4"),
    ]
    with Popen(command, stdin=PIPE) as process:
        for index in range(FPS * SECONDS):
            process.stdin.write(frame(kind, index * 2 * pi / (FPS * SECONDS)).tobytes())
        process.stdin.close()
        if process.wait():
            raise RuntimeError(f"Could not encode {kind}")


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for scene in ("ledger", "planner"):
        render(scene)
