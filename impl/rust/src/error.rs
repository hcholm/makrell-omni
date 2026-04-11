use std::fmt::{Display, Formatter};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MakrellFormatError {
    message: String,
}

impl MakrellFormatError {
    pub fn not_implemented(feature: &str) -> Self {
        Self {
            message: format!("{feature} for Rust is scaffolded but not implemented yet."),
        }
    }

    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl Display for MakrellFormatError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for MakrellFormatError {}
