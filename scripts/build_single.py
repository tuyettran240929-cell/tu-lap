"""Inline CSS, fonts and JS into dist/tulap.html so the app opens from a single file."""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / "index.html").read_text(encoding="utf-8")

def css(m):
    p = root / m.group(1)
    text = p.read_text(encoding="utf-8")
    def font(fm):
        data = base64.b64encode((p.parent / fm.group(1)).read_bytes()).decode()
        return f'url("data:font/woff2;base64,{data}")'
    text = re.sub(r'url\("(\.\./fonts/[^"]+)"\)', font, text)
    return f"<style>\n{text}\n</style>"

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>\n" + (root / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script") + "\n</script>", html)
out = root / "dist" / "tulap.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"Wrote {out} ({out.stat().st_size // 1024} KB)")
