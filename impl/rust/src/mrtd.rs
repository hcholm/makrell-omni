use crate::mini_mbf::{parse as parse_nodes, Node};
use crate::MakrellFormatError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MrtdColumn {
    pub name: String,
    pub r#type: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MrtdDocument {
    pub columns: Vec<MrtdColumn>,
    pub rows: Vec<Vec<MrtdValue>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum MrtdValue {
    String(String),
    Int(i64),
    Float(f64),
    Bool(bool),
}

pub fn parse_string(source: &str) -> Result<MrtdDocument, MakrellFormatError> {
    let lines = split_rows(source)?;
    if lines.is_empty() {
        return Ok(MrtdDocument {
            columns: Vec::new(),
            rows: Vec::new(),
        });
    }
    let header_nodes = parse_nodes(&lines[0])?;
    let columns = header_nodes
        .iter()
        .map(|node| match node {
            Node::Scalar { text, .. } => {
                let mut parts = text.splitn(2, ':');
                Ok(MrtdColumn {
                    name: parts.next().unwrap_or_default().to_string(),
                    r#type: parts.next().map(str::to_string),
                })
            }
            _ => Err(MakrellFormatError::new("Invalid MRTD header field.")),
        })
        .collect::<Result<Vec<_>, _>>()?;

    let mut rows = Vec::new();
    for line in &lines[1..] {
        let mut row_source = line.clone();
        if row_source.starts_with('(') && row_source.ends_with(')') {
            row_source = row_source[1..row_source.len() - 1].trim().to_string();
        }
        let cells = parse_nodes(&row_source)?;
        if cells.len() != columns.len() {
            return Err(MakrellFormatError::new("MRTD row width mismatch."));
        }
        let mut row = Vec::new();
        for (cell, column) in cells.iter().zip(&columns) {
            row.push(convert_cell(cell, column.r#type.as_deref())?);
        }
        rows.push(row);
    }
    Ok(MrtdDocument { columns, rows })
}

fn split_rows(source: &str) -> Result<Vec<String>, MakrellFormatError> {
    let mut lines = Vec::new();
    let mut buffer = String::new();
    let chars: Vec<char> = source.chars().collect();
    let mut i = 0;
    let mut in_string = false;
    let mut escaping = false;
    let mut in_line_comment = false;
    let mut in_block_comment = false;

    while i < chars.len() {
        let ch = chars[i];
        if in_line_comment {
            if ch == '\n' {
                in_line_comment = false;
                let trimmed = buffer.trim();
                if !trimmed.is_empty() {
                    lines.push(trimmed.to_string());
                }
                buffer.clear();
            }
            i += 1;
            continue;
        }
        if in_block_comment {
            if ch == '*' && i + 1 < chars.len() && chars[i + 1] == '/' {
                in_block_comment = false;
                i += 2;
            } else {
                i += 1;
            }
            continue;
        }
        if in_string {
            buffer.push(ch);
            if escaping {
                escaping = false;
            } else if ch == '\\' {
                escaping = true;
            } else if ch == '"' {
                in_string = false;
            }
            i += 1;
            continue;
        }

        if ch == '"' {
            in_string = true;
            buffer.push(ch);
            i += 1;
            continue;
        }
        if ch == '#' {
            in_line_comment = true;
            i += 1;
            continue;
        }
        if ch == '/' && i + 1 < chars.len() && chars[i + 1] == '/' {
            in_line_comment = true;
            i += 2;
            continue;
        }
        if ch == '/' && i + 1 < chars.len() && chars[i + 1] == '*' {
            in_block_comment = true;
            i += 2;
            continue;
        }
        if ch == '\r' {
            i += 1;
            continue;
        }
        if ch == '\n' {
            let trimmed = buffer.trim();
            if !trimmed.is_empty() {
                lines.push(trimmed.to_string());
            }
            buffer.clear();
            i += 1;
            continue;
        }

        buffer.push(ch);
        i += 1;
    }

    if in_block_comment {
        return Err(MakrellFormatError::new("Unterminated block comment"));
    }
    let trimmed = buffer.trim();
    if !trimmed.is_empty() {
        lines.push(trimmed.to_string());
    }
    Ok(lines)
}

pub fn parse_file(path: impl AsRef<Path>) -> Result<MrtdDocument, MakrellFormatError> {
    let path_ref = path.as_ref();
    let source = fs::read_to_string(path_ref)
        .map_err(|_| MakrellFormatError::new(format!("Could not read MRTD file: {}", path_ref.display())))?;
    parse_string(&source)
}

pub fn write_string(value: &MrtdDocument) -> Result<String, MakrellFormatError> {
    let header = value
        .columns
        .iter()
        .map(|column| match &column.r#type {
            Some(ty) => format!("{}:{}", quote_name(&column.name), ty),
            None => quote_name(&column.name),
        })
        .collect::<Vec<_>>()
        .join(" ");
    let rows = value
        .rows
        .iter()
        .map(|row| row.iter().map(write_cell).collect::<Vec<_>>().join(" "))
        .collect::<Vec<_>>();
    let mut lines = vec![header];
    lines.extend(rows);
    Ok(lines.join("\n"))
}

fn convert_cell(node: &Node, ty: Option<&str>) -> Result<MrtdValue, MakrellFormatError> {
    let Node::Scalar { text, quoted } = node else {
        return Err(MakrellFormatError::new("MRTD cells must be scalar values."));
    };
    let scalar = if *quoted {
        MrtdValue::String(text.clone())
    } else {
        match text.as_str() {
            "true" => MrtdValue::Bool(true),
            "false" => MrtdValue::Bool(false),
            _ => {
                if let Ok(value) = text.parse::<i64>() {
                    MrtdValue::Int(value)
                } else if let Ok(value) = text.parse::<f64>() {
                    MrtdValue::Float(value)
                } else {
                    MrtdValue::String(text.clone())
                }
            }
        }
    };
    let actual_type = ty.unwrap_or("string");
    match (actual_type, scalar) {
        ("string", MrtdValue::String(text)) => Ok(MrtdValue::String(text)),
        ("string", other) => Ok(MrtdValue::String(match other {
            MrtdValue::String(text) => text,
            MrtdValue::Int(value) => value.to_string(),
            MrtdValue::Float(value) => value.to_string(),
            MrtdValue::Bool(value) => value.to_string(),
        })),
        ("int", MrtdValue::Int(value)) => Ok(MrtdValue::Int(value)),
        ("float", MrtdValue::Int(value)) => Ok(MrtdValue::Float(value as f64)),
        ("float", MrtdValue::Float(value)) => Ok(MrtdValue::Float(value)),
        ("bool", MrtdValue::Bool(value)) => Ok(MrtdValue::Bool(value)),
        ("int", _) => Err(MakrellFormatError::new("MRTD value does not match int field.")),
        ("float", _) => Err(MakrellFormatError::new("MRTD value does not match float field.")),
        ("bool", _) => Err(MakrellFormatError::new("MRTD value does not match bool field.")),
        _ => Err(MakrellFormatError::new(format!("Unsupported MRTD field type: {actual_type}"))),
    }
}

fn write_cell(value: &MrtdValue) -> String {
    match value {
        MrtdValue::String(text) => {
            if is_identifier_like(text) {
                text.clone()
            } else {
                format!("\"{}\"", text.replace('\\', "\\\\").replace('"', "\\\""))
            }
        }
        MrtdValue::Int(value) => value.to_string(),
        MrtdValue::Float(value) => value.to_string(),
        MrtdValue::Bool(value) => value.to_string(),
    }
}

fn quote_name(text: &str) -> String {
    if is_identifier_like(text) {
        text.to_string()
    } else {
        format!("\"{}\"", text.replace('\\', "\\\\").replace('"', "\\\""))
    }
}

fn is_identifier_like(text: &str) -> bool {
    let mut chars = text.chars();
    match chars.next() {
        Some(first) if first.is_ascii_alphabetic() || first == '_' => {}
        _ => return false,
    }
    chars.all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
}
