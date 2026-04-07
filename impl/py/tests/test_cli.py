import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_cli(*args: str):
    return subprocess.run(
        [sys.executable, "-m", "makrell.cli", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


def test_check_command_reports_ok_for_valid_source(tmp_path: Path):
    source = tmp_path / "ok.mr"
    source.write_text("2 + 3\n", encoding="utf-8")

    result = run_cli("check", str(source), "--json")

    assert result.returncode == 0
    parsed = json.loads(result.stdout)
    assert parsed["ok"] is True
    assert parsed["diagnostics"] == []


def test_check_command_reports_diagnostics_for_invalid_source(tmp_path: Path):
    source = tmp_path / "bad.mr"
    source.write_text("a =\n", encoding="utf-8")

    result = run_cli("check", str(source), "--json")

    assert result.returncode == 1
    parsed = json.loads(result.stdout)
    assert parsed["ok"] is False
    assert len(parsed["diagnostics"]) > 0
    first = parsed["diagnostics"][0]
    assert first["severity"] == "error"
    assert first["range"] is not None
    assert first["range"]["start"]["line"] >= 1
    assert first["range"]["start"]["column"] >= 1


def test_check_command_reports_diagnostics_for_invalid_if_form(tmp_path: Path):
    source = tmp_path / "bad_if.mrpy"
    source.write_text("{if a > 5}\n", encoding="utf-8")

    result = run_cli("check", str(source), "--json")

    assert result.returncode == 1
    parsed = json.loads(result.stdout)
    assert parsed["ok"] is False
    assert len(parsed["diagnostics"]) > 0
    first = parsed["diagnostics"][0]
    assert first["severity"] == "error"
    assert "Invalid if form" in first["message"]
    assert first["range"] is not None
    assert first["range"]["start"]["line"] == 1


def test_version_uses_makrellpy_name():
    result = run_cli("--version")

    assert result.returncode == 0
    assert result.stdout.startswith("MakrellPy: ")
