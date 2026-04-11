from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import inspect
from typing import Any

from makrell.ast import Comment, Identifier, LPar, Node, Number, Operator, RPar, String, Whitespace
from makrell.parsing import python_value
from makrell.tokeniser import src_to_tokens


DECLARED_TYPES = {"int", "float", "bool", "string"}
@dataclass(frozen=True)
class MrtdColumn:
    name: str
    type: str | None = None


@dataclass(frozen=True)
class MrtdRow:
    cells: list[Any]


@dataclass(frozen=True)
class MrtdDocument:
    columns: list[MrtdColumn]
    rows: list[MrtdRow]

    @property
    def records(self) -> list[dict[str, Any]]:
        return [
            {column.name: row.cells[index] for index, column in enumerate(self.columns)}
            for row in self.rows
        ]


def parse_src(src: str, profiles: list[str] | tuple[str, ...] | set[str] | None = None) -> MrtdDocument:
    row_tokens = _split_root_rows(src_to_tokens(src))
    if len(row_tokens) == 0:
        return MrtdDocument([], [])

    columns = [_parse_header_cell(cell_tokens) for cell_tokens in _split_row_cells(row_tokens[0])]
    rows = [
        _parse_data_row(tokens, columns, row_index + 2, profiles)
        for row_index, tokens in enumerate(row_tokens[1:])
    ]
    return MrtdDocument(columns, rows)


def render_src(
    src: str,
    profiles: list[str] | tuple[str, ...] | set[str] | None = None,
    globs: dict | None = None,
    locs: dict | None = None,
) -> MrtdDocument:
    return parse_src(src, profiles)


def read_records(
    src: str | MrtdDocument,
    cls: type | None = None,
    profiles: list[str] | tuple[str, ...] | set[str] | None = None,
) -> list[Any]:
    document = parse_src(src, profiles) if isinstance(src, str) else src
    if cls is None:
        return document.records

    rows: list[Any] = []
    for record in document.records:
        instance = cls()
        for key, value in record.items():
            setattr(instance, key, value)
        rows.append(instance)
    return rows


def read_tuples(
    src: str | MrtdDocument,
    types: tuple[type, ...] | None = None,
    profiles: list[str] | tuple[str, ...] | set[str] | None = None,
) -> list[tuple[Any, ...]]:
    document = parse_src(src, profiles) if isinstance(src, str) else src
    if types is not None and len(types) != len(document.columns):
        raise ValueError(
            f"MRTD column count {len(document.columns)} does not match requested tuple arity {len(types)}."
        )

    rows: list[tuple[Any, ...]] = []
    for row in document.rows:
        values = list(row.cells)
        if types is not None:
            values = [_coerce_python_type(value, typ) for value, typ in zip(values, types, strict=True)]
        rows.append(tuple(values))
    return rows


def write_records(rows: list[Any], profiles: list[str] | tuple[str, ...] | set[str] | None = None) -> str:
    if len(rows) == 0:
        raise ValueError("Cannot write MRTD records from an empty row sequence.")

    first = _record_like(rows[0])
    headers = list(first.keys())
    if len(headers) == 0:
        raise ValueError("Cannot write MRTD records from an object with no public fields.")

    header_line = " ".join(
        _format_header_cell(header, _infer_record_scalar_type(rows, header))
        for header in headers
    )
    lines = [header_line]
    for row in rows:
        record = _record_like(row)
        lines.append(" ".join(_format_scalar(record.get(header), profiles) for header in headers))
    return "\n".join(lines)


def write_tuples(
    rows: list[tuple[Any, ...] | list[Any]],
    headers: tuple[str, ...] | list[str] | None = None,
    profiles: list[str] | tuple[str, ...] | set[str] | None = None,
) -> str:
    if len(rows) == 0:
        raise ValueError("Cannot write MRTD tuples from an empty row sequence.")

    width = len(rows[0])
    if width == 0:
        raise ValueError("Cannot write MRTD tuples with zero columns.")

    for row in rows:
        if len(row) != width:
            raise ValueError(f"MRTD tuple row width mismatch: expected {width}, got {len(row)}.")

    actual_headers = list(headers) if headers is not None else [f"c{index + 1}" for index in range(width)]
    if len(actual_headers) != width:
        raise ValueError(f"Expected {width} MRTD tuple headers, got {len(actual_headers)}.")

    header_line = " ".join(
        _format_header_cell(header, _infer_tuple_scalar_type(rows, index))
        for index, header in enumerate(actual_headers)
    )
    lines = [header_line]
    for row in rows:
        lines.append(" ".join(_format_scalar(value, profiles) for value in row))
    return "\n".join(lines)


def _split_root_rows(tokens: list[Node]) -> list[list[Node]]:
    rows: list[list[Node]] = []
    current: list[Node] = []
    depth = 0

    def flush() -> None:
        nonlocal current
        trimmed = _trim_whitespace(current)
        if len(trimmed) > 0:
            rows.append(trimmed)
        current = []

    for token in tokens:
        if isinstance(token, Comment):
            continue

        if isinstance(token, LPar):
            depth += 1
            current.append(token)
            continue

        if isinstance(token, RPar):
            depth -= 1
            current.append(token)
            continue

        if isinstance(token, Whitespace) and depth == 0 and "\n" in token.value:
            flush()
            continue

        current.append(token)

    flush()
    return rows


def _split_row_cells(tokens: list[Node]) -> list[list[Node]]:
    row_tokens = _unwrap_round_row(_trim_whitespace(tokens))
    cells: list[list[Node]] = []
    current: list[Node] = []
    depth = 0

    def flush() -> None:
        nonlocal current
        trimmed = _trim_whitespace(current)
        if len(trimmed) > 0:
            cells.append(trimmed)
        current = []

    for token in row_tokens:
        if isinstance(token, LPar):
            depth += 1
            current.append(token)
            continue

        if isinstance(token, RPar):
            depth -= 1
            current.append(token)
            continue

        if isinstance(token, Whitespace) and depth == 0:
            flush()
            continue

        current.append(token)

    flush()
    return cells


def _unwrap_round_row(tokens: list[Node]) -> list[Node]:
    if len(tokens) < 2:
        return tokens
    if not isinstance(tokens[0], LPar) or tokens[0].value != "(":
        return tokens
    if not isinstance(tokens[-1], RPar) or tokens[-1].value != ")":
        return tokens

    depth = 0
    for index, token in enumerate(tokens):
        if isinstance(token, LPar) and token.value == "(":
            depth += 1
        elif isinstance(token, RPar) and token.value == ")":
            depth -= 1
            if depth == 0 and index != len(tokens) - 1:
                return tokens

    return _trim_whitespace(tokens[1:-1])


def _trim_whitespace(tokens: list[Node]) -> list[Node]:
    start = 0
    end = len(tokens)
    while start < end and isinstance(tokens[start], Whitespace):
        start += 1
    while end > start and isinstance(tokens[end - 1], Whitespace):
        end -= 1
    return tokens[start:end]


def _parse_header_cell(tokens: list[Node]) -> MrtdColumn:
    colon_index = _find_top_level_colon(tokens)
    if colon_index is None:
        return MrtdColumn(_parse_header_name(tokens))

    left = _trim_whitespace(tokens[:colon_index])
    right = _trim_whitespace(tokens[colon_index + 1:])
    if len(right) != 1 or not isinstance(right[0], Identifier):
        raise ValueError("MRTD header types must be simple identifiers.")

    declared_type = right[0].value
    if declared_type not in DECLARED_TYPES:
        raise ValueError(f"Unsupported MRTD declared type '{declared_type}'.")

    return MrtdColumn(_parse_header_name(left), declared_type)


def _parse_header_name(tokens: list[Node]) -> str:
    if len(tokens) != 1:
        raise ValueError("Illegal MRTD header cell.")
    token = tokens[0]
    if isinstance(token, Identifier):
        return token.value
    if isinstance(token, String):
        return python_value(token)
    raise ValueError("Illegal MRTD header cell.")


def _find_top_level_colon(tokens: list[Node]) -> int | None:
    depth = 0
    for index, token in enumerate(tokens):
        if isinstance(token, LPar):
            depth += 1
        elif isinstance(token, RPar):
            depth -= 1
        elif depth == 0 and isinstance(token, Operator) and token.value == ":":
            return index
    return None


def _parse_data_row(
    tokens: list[Node],
    columns: list[MrtdColumn],
    line_number: int,
    profiles: list[str] | tuple[str, ...] | set[str] | None,
) -> MrtdRow:
    cells = _split_row_cells(tokens)
    if len(cells) != len(columns):
        raise ValueError(f"MRTD row {line_number} has {len(cells)} cells, expected {len(columns)}.")

    return MrtdRow([
        _parse_data_cell(cell_tokens, column, profiles)
        for cell_tokens, column in zip(cells, columns, strict=True)
    ])


def _parse_data_cell(tokens: list[Node], column: MrtdColumn, profiles: list[str] | tuple[str, ...] | set[str] | None) -> Any:
    if len(tokens) != 1:
        raise ValueError("MRTD data cells must currently be scalar values.")

    value = _parse_scalar(tokens[0], profiles)
    if column.type is None:
        return value
    return _coerce_declared_type(value, column.type, column.name)


def _parse_scalar(token: Node, profiles: list[str] | tuple[str, ...] | set[str] | None) -> Any:
    if isinstance(token, String):
        return python_value(token)
    if isinstance(token, Number):
        return python_value(token)
    if isinstance(token, Identifier):
        if token.value == "true":
            return True
        if token.value == "false":
            return False
        if token.value == "null":
            return None
        return token.value
    raise ValueError("MRTD data cells must currently be scalar values.")


def _coerce_declared_type(value: Any, declared_type: str, field_name: str) -> Any:
    if declared_type == "string" and isinstance(value, str):
        return value
    if declared_type == "bool" and isinstance(value, bool):
        return value
    if declared_type == "int" and isinstance(value, int) and not isinstance(value, bool):
        return value
    if declared_type == "float" and isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)

    raise ValueError(f"MRTD field '{field_name}' expected {declared_type}, got {type(value).__name__}.")


def _coerce_python_type(value: Any, typ: type) -> Any:
    if value is None:
        return None
    if typ is bool:
        return bool(value)
    return typ(value)


def _record_like(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return dict(value)
    if hasattr(value, "__dict__"):
        return {
            key: attr_value
            for key, attr_value in vars(value).items()
            if not key.startswith("_")
        }
    raise ValueError("MRTD record writing expects dict-like values or objects with instance attributes.")


def _infer_record_scalar_type(rows: list[Any], field_name: str) -> str | None:
    for row in rows:
        value = _record_like(row).get(field_name)
        if value is not None:
            return _infer_value_scalar_type(value)
    return None


def _infer_tuple_scalar_type(rows: list[tuple[Any, ...] | list[Any]], index: int) -> str | None:
    for row in rows:
        value = row[index]
        if value is not None:
            return _infer_value_scalar_type(value)
    return None


def _infer_value_scalar_type(value: Any) -> str | None:
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "string"
    return None


def _format_scalar(value: Any, profiles: list[str] | tuple[str, ...] | set[str] | None) -> str:
    if value is None:
        return "null"
    if isinstance(value, datetime | date):
        return f'"{value.isoformat()}"dt'
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int | float) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, str):
        return _format_identifier_or_string(value)
    raise ValueError(f"MRTD writing currently supports only scalar values, not {type(value).__name__}.")


def _format_identifier_or_string(value: str) -> str:
    if len(value) > 0 and _is_identifier(value):
        return value
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _is_identifier(value: str) -> bool:
    if len(value) == 0:
        return False
    if not (value[0].isalpha() or value[0] in "_$"):
        return False
    return all(ch.isalnum() or ch in "_$" for ch in value[1:])
def _format_header_cell(name: str, type_name: str | None) -> str:
    if type_name is None:
        return _format_identifier_or_string(name)
    return f"{_format_identifier_or_string(name)}:{type_name}"
