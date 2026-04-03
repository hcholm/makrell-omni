from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PLAYGROUND = ROOT.parent / "playground"


def run(command: list[str], cwd: Path) -> None:
    print(f"[run] {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def main() -> int:
    run([sys.executable, "-m", "sphinx", "-b", "html", "source", "build/html"], ROOT)
    run(["bun", "run", "build"], PLAYGROUND)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
