use crate::mini_mbf::{parse as parse_nodes, Node};
use crate::MakrellFormatError;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, PartialEq)]
pub enum MronValue {
    Null,
    Bool(bool),
    Int(i64),
    Float(f64),
    String(String),
    Array(Vec<MronValue>),
    Object(BTreeMap<String, MronValue>),
}

pub fn parse_string(source: &str) -> Result<MronValue, MakrellFormatError> {
    let nodes = parse_nodes(source)?;
    if nodes.is_empty() {
        return Ok(MronValue::Null);
    }
    if nodes.len() == 1 {
        return convert_node(&nodes[0]);
    }
    if nodes.len() % 2 != 0 {
        return Err(MakrellFormatError::new(format!(
            "Illegal number ({}) of root level expressions for MRON object.",
            nodes.len()
        )));
    }
    convert_pairs(&nodes)
}

pub fn parse_file(path: impl AsRef<Path>) -> Result<MronValue, MakrellFormatError> {
    let path_ref = path.as_ref();
    let source = fs::read_to_string(path_ref)
        .map_err(|_| MakrellFormatError::new(format!("Could not read MRON file: {}", path_ref.display())))?;
    parse_string(&source)
}

pub fn write_string(value: &MronValue) -> Result<String, MakrellFormatError> {
    Ok(write_value(value))
}

fn convert_node(node: &Node) -> Result<MronValue, MakrellFormatError> {
    match node {
        Node::Scalar { text, quoted } => Ok(convert_scalar(text, *quoted)),
        Node::Square(children) => {
            let mut values = Vec::new();
            for child in children {
                values.push(convert_node(child)?);
            }
            Ok(MronValue::Array(values))
        }
        Node::Brace(children) => convert_pairs(children),
        Node::Paren(_) => Err(MakrellFormatError::new("Parenthesised nodes are not valid MRON values.")),
    }
}

fn convert_pairs(nodes: &[Node]) -> Result<MronValue, MakrellFormatError> {
    if nodes.len() % 2 != 0 {
        return Err(MakrellFormatError::new("Odd pair count in MRON object."));
    }
    let mut result = BTreeMap::new();
    for chunk in nodes.chunks(2) {
        let key = convert_node(&chunk[0])?;
        let value = convert_node(&chunk[1])?;
        result.insert(as_key(key), value);
    }
    Ok(MronValue::Object(result))
}

fn convert_scalar(text: &str, quoted: bool) -> MronValue {
    if quoted {
        return MronValue::String(text.to_string());
    }
    match text {
        "null" => MronValue::Null,
        "true" => MronValue::Bool(true),
        "false" => MronValue::Bool(false),
        _ => {
            if let Ok(value) = text.parse::<i64>() {
                MronValue::Int(value)
            } else if let Ok(value) = text.parse::<f64>() {
                MronValue::Float(value)
            } else {
                MronValue::String(text.to_string())
            }
        }
    }
}

fn as_key(value: MronValue) -> String {
    match value {
        MronValue::String(text) => text,
        MronValue::Null => "null".to_string(),
        MronValue::Bool(value) => value.to_string(),
        MronValue::Int(value) => value.to_string(),
        MronValue::Float(value) => value.to_string(),
        MronValue::Array(_) | MronValue::Object(_) => "[complex]".to_string(),
    }
}

fn write_value(value: &MronValue) -> String {
    match value {
        MronValue::Null => "null".to_string(),
        MronValue::Bool(value) => value.to_string(),
        MronValue::Int(value) => value.to_string(),
        MronValue::Float(value) => value.to_string(),
        MronValue::String(text) => {
            if is_identifier_like(text) {
                text.clone()
            } else {
                quote(text)
            }
        }
        MronValue::Array(items) => {
            let parts: Vec<String> = items.iter().map(write_value).collect();
            format!("[{}]", parts.join(" "))
        }
        MronValue::Object(map) => {
            let mut parts = Vec::new();
            for (key, value) in map {
                parts.push(write_value(&MronValue::String(key.clone())));
                parts.push(write_value(value));
            }
            format!("{{ {} }}", parts.join(" "))
        }
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

fn quote(text: &str) -> String {
    format!("\"{}\"", text.replace('\\', "\\\\").replace('"', "\\\""))
}
