from __future__ import annotations

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = "127.0.0.1"
PORT = 8010
ROOT = Path(__file__).resolve().parent / "build" / "html"


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), NoCacheHandler)
    print(f"Makrell dev server running on http://{HOST}:{PORT}/")
    print(f"Serving {ROOT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
