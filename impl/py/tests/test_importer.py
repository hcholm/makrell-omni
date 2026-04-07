import importlib
import sys
from pathlib import Path

import makrell  # noqa: F401


def test_top_level_mrpy_import_works_from_sys_path(tmp_path: Path):
    module_name = "tmp_top_level_mrpy_mod"
    module_path = tmp_path / f"{module_name}.mrpy"
    module_path.write_text("value = 41 + 1\n", encoding="utf-8")

    sys.path.insert(0, str(tmp_path))
    try:
        sys.modules.pop(module_name, None)
        importlib.invalidate_caches()
        mod = importlib.import_module(module_name)
        assert mod.value == 42
    finally:
        sys.modules.pop(module_name, None)
        if str(tmp_path) in sys.path:
            sys.path.remove(str(tmp_path))
