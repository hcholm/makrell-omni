use crate::mini_mbf::{parse as parse_nodes, Node};
use crate::MakrellFormatError;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MrmlElement {
    pub name: String,
    pub attributes: BTreeMap<String, String>,
    pub children: Vec<MrmlChild>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MrmlChild {
    Text(String),
    Element(MrmlElement),
}

pub fn parse_string(source: &str) -> Result<MrmlElement, MakrellFormatError> {
    let nodes = parse_nodes(source)?;
    if nodes.len() != 1 {
        return Err(MakrellFormatError::new("MRML expects exactly one root element."));
    }
    parse_element(&nodes[0])
}

pub fn parse_file(path: impl AsRef<Path>) -> Result<MrmlElement, MakrellFormatError> {
    let path_ref = path.as_ref();
    let source = fs::read_to_string(path_ref)
        .map_err(|_| MakrellFormatError::new(format!("Could not read MRML file: {}", path_ref.display())))?;
    parse_string(&source)
}

pub fn write_string(value: &MrmlElement) -> Result<String, MakrellFormatError> {
    Ok(write_element(value))
}

fn parse_element(node: &Node) -> Result<MrmlElement, MakrellFormatError> {
    let Node::Brace(children) = node else {
        return Err(MakrellFormatError::new("Invalid MRML element."));
    };
    let Some(Node::Scalar { text: name, .. }) = children.first() else {
        return Err(MakrellFormatError::new("MRML element name must be a scalar."));
    };
    let mut index = 1;
    let mut attributes = BTreeMap::new();
    if let Some(Node::Square(attr_nodes)) = children.get(index) {
        parse_attributes(attr_nodes, &mut attributes)?;
        index += 1;
    }
    let mut parsed_children = Vec::new();
    for child in &children[index..] {
        match child {
            Node::Brace(_) => parsed_children.push(MrmlChild::Element(parse_element(child)?)),
            Node::Scalar { text, .. } => parsed_children.push(MrmlChild::Text(text.clone())),
            _ => return Err(MakrellFormatError::new("Unsupported MRML child node.")),
        }
    }
    Ok(MrmlElement {
        name: name.clone(),
        attributes,
        children: parsed_children,
    })
}

fn parse_attributes(nodes: &[Node], attributes: &mut BTreeMap<String, String>) -> Result<(), MakrellFormatError> {
    let mut index = 0;
    while index < nodes.len() {
        let Node::Scalar { text: key, .. } = &nodes[index] else {
            return Err(MakrellFormatError::new("Invalid MRML attribute list."));
        };
        index += 1;
        if matches!(nodes.get(index), Some(Node::Scalar { text, .. }) if text == "=") {
            index += 1;
        }
        let Some(Node::Scalar { text: value, .. }) = nodes.get(index) else {
            return Err(MakrellFormatError::new("Missing MRML attribute value."));
        };
        index += 1;
        attributes.insert(key.clone(), value.clone());
    }
    Ok(())
}

fn write_element(element: &MrmlElement) -> String {
    let mut out = String::new();
    out.push('<');
    out.push_str(&element.name);
    for (key, value) in &element.attributes {
        out.push(' ');
        out.push_str(key);
        out.push_str("=\"");
        out.push_str(&escape(value));
        out.push('"');
    }
    if element.children.is_empty() {
        out.push_str("/>");
        return out;
    }
    out.push('>');
    for child in &element.children {
        match child {
            MrmlChild::Text(text) => out.push_str(&escape(text)),
            MrmlChild::Element(child) => out.push_str(&write_element(child)),
        }
    }
    out.push_str("</");
    out.push_str(&element.name);
    out.push('>');
    out
}

fn escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}
