"""Render the Keystone homepage and ledger fallback films."""
from math import cos, pi, sin
from pathlib import Path
from subprocess import PIPE, Popen

from PIL import Image, ImageDraw

OUTPUT = Path(__file__).resolve().parents[1] / "client/public/motion"
WIDTH, HEIGHT, FPS, SECONDS = 960, 540, 24, 7


def backdrop(ledger):
    image = Image.new("RGB", (WIDTH, HEIGHT))
    pixels = image.load()
    center = .55 if ledger else .72
    for y in range(HEIGHT):
        for x in range(WIDTH):
            glow = max(0, 1 - ((x / WIDTH - center) ** 2 * 4 + (y / HEIGHT - .5) ** 2 * 3))
            pixels[x, y] = (int(17 + 26 * glow), int(26 + 38 * glow), int(20 + 26 * glow))
    return image


def render_frame(background, ledger, progress):
    image = background.copy()
    draw = ImageDraw.Draw(image)
    phase = progress * 2 * pi
    yaw = -.26 + .13 * sin(phase)
    pitch = .57 + .10 * cos(phase)
    scale = (83 if ledger else 92) * (1 + .045 * sin(phase))
    center_x = WIDTH * .5
    center_y = HEIGHT * .55

    def project(x, y, z):
        horizontal = x * cos(yaw) - z * sin(yaw)
        depth = x * sin(yaw) + z * cos(yaw)
        factor = 19 / (19 - depth * cos(pitch) - y * sin(pitch))
        return center_x + horizontal * scale * factor, center_y + (depth * sin(pitch) - y * cos(pitch)) * scale * factor

    faces = []

    def block(x, y, z, w, h, d, palette):
        a, b = x - w / 2, x + w / 2
        n, f = z - d / 2, z + d / 2
        t = y + h
        for points, color in (
            ([(a,t,n),(a,t,f),(a,y,f),(a,y,n)], palette[2]),
            ([(a,t,f),(b,t,f),(b,y,f),(a,y,f)], palette[1]),
            ([(a,t,n),(b,t,n),(b,t,f),(a,t,f)], palette[0]),
        ):
            depth = sum(px * sin(yaw) + pz * cos(yaw) + py * .84 for px, py, pz in points) / 4
            faces.append((depth, [project(*point) for point in points], color))

    for row in range(28):
        z = -12 + row * .57
        for col in range(65):
            x = (col - 32) * .43
            y = -1.65 + .32 * sin(x * .70 + z * .40 + phase) + .18 * cos(z * 1.1 - phase)
            px, py = project(x, y, z)
            if 0 < px < WIDTH and 0 < py < HEIGHT:
                glow = .5 + .5 * cos(x * .25 + z * .7 + phase)
                size = 1.25 if glow > .7 else .7
                shade = int(11 + glow * (34 if ledger else 63))
                draw.ellipse((px-size, py-size, px+size, py+size), fill=(35+shade, 49+shade, 33+shade//2))

    stone = ("#536953", "#2c3d31", "#374b3c")
    lime = ("#d3ee94", "#6d9148", "#91af59")
    cream = ("#edf0d8", "#a5ae91", "#bfcaac")
    ink = ("#465b42",) * 3
    for station in range(3):
        x = (station - 1) * 3.0
        z = 0 if ledger else -station * .95
        block(x, -.57, z, 2.62, .56, 3.05, stone)
        block(x, -.04, z, 2.52, .05, 2.95, lime if station == 2 else stone)
        block(x, -.32, z + 1.53, 2.32, .035, .026, lime)
        if station < 2:
            block(x + 1.5, -.21, z - (.47 if not ledger else 0), .54, .12, .9, stone)

    def paint_faces():
        for _, points, color in sorted(faces, key=lambda face: face[0]):
            draw.polygon(points, fill=color)
        faces.clear()

    paint_faces()

    def card(x, y, z, palette, scale_factor=1):
        block(x, y, z, 1.85 * scale_factor, .115, 1.18 * scale_factor, palette)
        paint_faces()
        for offset, length in [(-.23, .98), (.03, .73), (.23, .51)]:
            block(x - .18 * scale_factor, y + .115, z + offset * scale_factor,
                  length * scale_factor, .013, .05 * scale_factor, ink)
        block(x + .59 * scale_factor, y + .115, z + .23 * scale_factor, .22 * scale_factor, .014, .12 * scale_factor, stone)

        paint_faces()

    card(-3, .07, -.48, cream)
    card(0, .07, -.48 if ledger else -1.43, cream)
    step = min(2, int(progress * 3))
    blend = max(0, (progress * 3 - step - .31) / .69)
    blend = blend * blend * (3 - 2 * blend)
    position = step + blend if step < 2 else 2
    size = 1 if step < 2 else max(0, 1 - blend * 1.5)
    if size > .01:
        card(3 * (position - 1), .10 + (.72 * sin(blend * pi) if step < 2 else 0),
             .53 - (0 if ledger else position * .95), lime, size)

    return image


def render(name, ledger):
    background = backdrop(ledger)
    render_frame(background, ledger, .24).save(OUTPUT / f"{name}.jpg", quality=89, optimize=True)
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
               "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-framerate", str(FPS), "-i", "-",
               "-an", "-c:v", "libx264", "-crf", "24", "-preset", "fast", "-pix_fmt", "yuv420p",
               "-movflags", "+faststart", str(OUTPUT / f"{name}.mp4")]
    with Popen(command, stdin=PIPE) as process:
        for index in range(FPS * SECONDS):
            process.stdin.write(render_frame(background, ledger, index / (FPS * SECONDS)).tobytes())
        process.stdin.close()
        if process.wait():
            raise RuntimeError(f"Could not encode {name}")


if __name__ == "__main__":
    render("workspace-cinematic", False)
    render("ledger-cinematic", True)
