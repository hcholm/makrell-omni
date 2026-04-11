use crate::MakrellFormatError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum BasicSuffixValue {
    String(String),
    Int(i64),
    Float(f64),
    TaggedString { value: String, suffix: String },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BasicSuffixLiteralKind {
    String,
    Number,
}

pub fn split_numeric_literal_suffix(text: &str) -> Option<(&str, &str)> {
    let boundaries: Vec<usize> = text
        .char_indices()
        .map(|(index, _)| index)
        .chain(std::iter::once(text.len()))
        .collect();

    for &boundary in boundaries.iter().rev() {
        let (value, suffix) = text.split_at(boundary);
        if value.is_empty() {
            continue;
        }
        if !suffix.is_empty() && !is_suffix_identifier(suffix) {
            continue;
        }
        if value.parse::<i64>().is_ok() || value.parse::<f64>().is_ok() {
            return Some((value, suffix));
        }
    }
    None
}

pub fn apply_basic_suffix_profile(
    kind: BasicSuffixLiteralKind,
    value: &str,
    suffix: &str,
) -> Result<BasicSuffixValue, MakrellFormatError> {
    match kind {
        BasicSuffixLiteralKind::String => {
            if suffix.is_empty() {
                return Ok(BasicSuffixValue::String(value.to_string()));
            }
            match suffix {
                "dt" => Ok(BasicSuffixValue::TaggedString {
                    value: value.to_string(),
                    suffix: suffix.to_string(),
                }),
                "bin" => Ok(BasicSuffixValue::Int(
                    i64::from_str_radix(value, 2)
                        .map_err(|_| MakrellFormatError::new(format!("Invalid binary literal '{value}'.")))?,
                )),
                "oct" => Ok(BasicSuffixValue::Int(
                    i64::from_str_radix(value, 8)
                        .map_err(|_| MakrellFormatError::new(format!("Invalid octal literal '{value}'.")))?,
                )),
                "hex" => Ok(BasicSuffixValue::Int(
                    i64::from_str_radix(value, 16)
                        .map_err(|_| MakrellFormatError::new(format!("Invalid hexadecimal literal '{value}'.")))?,
                )),
                _ => Err(MakrellFormatError::new(format!(
                    "Unsupported basic suffix profile string suffix '{suffix}'."
                ))),
            }
        }
        BasicSuffixLiteralKind::Number => apply_basic_number_suffix(value, suffix),
    }
}

fn apply_basic_number_suffix(value: &str, suffix: &str) -> Result<BasicSuffixValue, MakrellFormatError> {
    if suffix.is_empty() {
        if value.contains('.') || value.contains('e') || value.contains('E') {
            return Ok(BasicSuffixValue::Float(
                value
                    .parse::<f64>()
                    .map_err(|_| MakrellFormatError::new(format!("Invalid numeric literal '{value}'.")))?,
            ));
        }
        return Ok(BasicSuffixValue::Int(
            value
                .parse::<i64>()
                .map_err(|_| MakrellFormatError::new(format!("Invalid numeric literal '{value}'.")))?,
        ));
    }

    if value.contains('.') || value.contains('e') || value.contains('E') {
        let base = value
            .parse::<f64>()
            .map_err(|_| MakrellFormatError::new(format!("Invalid numeric literal '{value}'.")))?;
        return apply_basic_float_suffix(base, suffix);
    }

    let base = value
        .parse::<i64>()
        .map_err(|_| MakrellFormatError::new(format!("Invalid numeric literal '{value}'.")))?;
    match suffix {
        "k" => Ok(BasicSuffixValue::Int(base * 1_000)),
        "M" => Ok(BasicSuffixValue::Int(base * 1_000_000)),
        "G" => Ok(BasicSuffixValue::Int(base * 1_000_000_000)),
        "T" => Ok(BasicSuffixValue::Int(base * 1_000_000_000_000)),
        "P" => Ok(BasicSuffixValue::Int(base * 1_000_000_000_000_000)),
        "E" => Ok(BasicSuffixValue::Int(base * 1_000_000_000_000_000_000)),
        _ => apply_basic_float_suffix(base as f64, suffix),
    }
}

fn is_suffix_identifier(text: &str) -> bool {
    let mut chars = text.chars();
    match chars.next() {
        Some(first) if first.is_ascii_alphabetic() || first == '_' => {}
        _ => return false,
    }
    chars.all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
}

fn apply_basic_float_suffix(base: f64, suffix: &str) -> Result<BasicSuffixValue, MakrellFormatError> {
    let value = match suffix {
        "k" => base * 1e3,
        "M" => base * 1e6,
        "G" => base * 1e9,
        "T" => base * 1e12,
        "P" => base * 1e15,
        "E" => base * 1e18,
        "pi" => base * std::f64::consts::PI,
        "tau" => base * std::f64::consts::TAU,
        "deg" => base * (std::f64::consts::PI / 180.0),
        "e" => base * std::f64::consts::E,
        _ => {
            return Err(MakrellFormatError::new(format!(
                "Unsupported basic suffix profile numeric suffix '{suffix}'."
            )))
        }
    };
    Ok(BasicSuffixValue::Float(value))
}
