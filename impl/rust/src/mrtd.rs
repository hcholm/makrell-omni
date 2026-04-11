use crate::mini_mbf::{parse as parse_nodes, Node};
use crate::MakrellFormatError;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

pub const EXTENDED_SCALARS_PROFILE: &str = "extended-scalars";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MrtdColumn {
    pub name: String,
    pub r#type: String,
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
    let lines: Vec<&str> = source
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .collect();
    if lines.is_empty() {
        return Ok(MrtdDocument {
            columns: Vec::new(),
            rows: Vec::new(),
        });
    }
    let header_nodes = parse_nodes(lines[0])?;
    let columns = header_nodes
        .iter()
        .map(|node| match node {
            Node::Scalar { text, .. } => {
                let mut parts = text.splitn(2, ':');
                Ok(MrtdColumn {
                    name: parts.next().unwrap_or_default().to_string(),
                    r#type: parts.next().unwrap_or("string").to_string(),
                })
            }
            _ => Err(MakrellFormatError::new("Invalid MRTD header field.")),
        })
        .collect::<Result<Vec<_>, _>>()?;

    let mut rows = Vec::new();
    for line in &lines[1..] {
        let mut row_source = (*line).to_string();
        if row_source.starts_with('(') && row_source.ends_with(')') {
            row_source = row_source[1..row_source.len() - 1].trim().to_string();
        }
        let cells = parse_nodes(&row_source)?;
        if cells.len() != columns.len() {
            return Err(MakrellFormatError::new("MRTD row width mismatch."));
        }
        let mut row = Vec::new();
        for (cell, column) in cells.iter().zip(&columns) {
            row.push(convert_cell(cell, &column.r#type)?);
        }
        rows.push(row);
    }
    Ok(MrtdDocument { columns, rows })
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
        .map(|column| format!("{}:{}", quote_name(&column.name), column.r#type))
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

fn convert_cell(node: &Node, ty: &str) -> Result<MrtdValue, MakrellFormatError> {
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
    match (ty, scalar) {
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
        _ => Err(MakrellFormatError::new(format!("Unsupported MRTD field type: {ty}"))),
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
    chars.all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
}
