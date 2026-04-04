from __future__ import annotations

import subprocess
import sys
from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parent.parent
PLAYGROUND = ROOT.parent / "playground"
BUILD_ROOT = ROOT / "build"
HTML_ROOT = BUILD_ROOT / "html"


def clean_stale_build_root() -> None:
    """Remove legacy top-level HTML output from build/.

    The canonical site output lives in build/html/. Older runs left a second
    HTML tree directly under build/, which is easy to confuse with the real
    output. Keep only the active html/ tree and the Sphinx doctrees cache.
    """
    if not BUILD_ROOT.exists():
        return

    keep = {"html", ".doctrees"}
    for child in BUILD_ROOT.iterdir():
        if child.name in keep:
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def run(command: list[str], cwd: Path) -> None:
    print(f"[run] {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def main() -> int:
    clean_stale_build_root()
    run([sys.executable, "-m", "sphinx", "-b", "html", "source", "build/html"], ROOT)
    run(["bun", "run", "build"], PLAYGROUND)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
