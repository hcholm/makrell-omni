use crate::MakrellFormatError;

#[derive(Debug, Clone, PartialEq)]
pub enum Node {
    Scalar { text: String, quoted: bool, suffix: String },
    Brace(Vec<Node>),
    Square(Vec<Node>),
    Paren(Vec<Node>),
}

#[derive(Debug, Clone)]
struct Token {
    kind: TokenKind,
    text: String,
    quoted: bool,
    suffix: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TokenKind {
    Scalar,
    BraceOpen,
    BraceClose,
    SquareOpen,
    SquareClose,
    ParenOpen,
    ParenClose,
    Equals,
    Operator,
}

pub fn parse(source: &str) -> Result<Vec<Node>, MakrellFormatError> {
    let tokens = tokenize(source)?;
    Parser::new(tokens).parse_roots()
}

fn tokenize(source: &str) -> Result<Vec<Token>, MakrellFormatError> {
    let chars: Vec<char> = source.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        let ch = chars[i];
        if ch.is_whitespace() || ch == ',' {
            i += 1;
            continue;
        }
        if ch == '#' {
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            continue;
        }
        if ch == '/' && i + 1 < chars.len() && chars[i + 1] == '/' {
            i += 2;
            while i < chars.len() && chars[i] != '\n' {
                i += 1;
            }
            continue;
        }
        if ch == '/' && i + 1 < chars.len() && chars[i + 1] == '*' {
            i += 2;
            while i + 1 < chars.len() && !(chars[i] == '*' && chars[i + 1] == '/') {
                i += 1;
            }
            if i + 1 >= chars.len() {
                return Err(MakrellFormatError::new("Unterminated block comment"));
            }
            i += 2;
            continue;
        }
        if ch == '-' && i + 1 < chars.len() && chars[i + 1].is_ascii_digit() {
            let start = i;
            i += 1;
            while i < chars.len() {
                let c = chars[i];
                if c.is_whitespace() || c == ',' || c == '#' || "{}[]()=\"".contains(c) {
                    break;
                }
                if c == '/' && i + 1 < chars.len() && (chars[i + 1] == '/' || chars[i + 1] == '*') {
                    break;
                }
                i += 1;
            }
                tokens.push(Token {
                    kind: TokenKind::Scalar,
                    text: chars[start..i].iter().collect(),
                    quoted: false,
                    suffix: String::new(),
                });
            continue;
        }
        match ch {
            '{' => {
                tokens.push(token(TokenKind::BraceOpen, "{"));
                i += 1;
                continue;
            }
            '}' => {
                tokens.push(token(TokenKind::BraceClose, "}"));
                i += 1;
                continue;
            }
            '[' => {
                tokens.push(token(TokenKind::SquareOpen, "["));
                i += 1;
                continue;
            }
            ']' => {
                tokens.push(token(TokenKind::SquareClose, "]"));
                i += 1;
                continue;
            }
            '(' => {
                tokens.push(token(TokenKind::ParenOpen, "("));
                i += 1;
                continue;
            }
            ')' => {
                tokens.push(token(TokenKind::ParenClose, ")"));
                i += 1;
                continue;
            }
            '=' => {
                tokens.push(token(TokenKind::Equals, "="));
                i += 1;
                continue;
            }
            '-' => {
                tokens.push(token(TokenKind::Operator, "-"));
                i += 1;
                continue;
            }
            '"' => {
                let mut text = String::new();
                i += 1;
                let mut escaping = false;
                while i < chars.len() {
                    let c = chars[i];
                    i += 1;
                    if escaping {
                        text.push(match c {
                            'n' => '\n',
                            'r' => '\r',
                            't' => '\t',
                            '"' => '"',
                            '\\' => '\\',
                            other => other,
                        });
                        escaping = false;
                        continue;
                    }
                    if c == '\\' {
                        escaping = true;
                        continue;
                    }
                    if c == '"' {
                        break;
                    }
                    text.push(c);
                }
                tokens.push(Token {
                    kind: TokenKind::Scalar,
                    text,
                    quoted: true,
                    suffix: read_suffix(&chars, &mut i),
                });
                continue;
            }
            _ => {}
        }

        let start = i;
        while i < chars.len() {
            let c = chars[i];
            if c.is_whitespace() || c == ',' || c == '#' || "{}[]()=\"-".contains(c) {
                break;
            }
            if c == '/' && i + 1 < chars.len() && (chars[i + 1] == '/' || chars[i + 1] == '*') {
                break;
            }
            i += 1;
        }
        if start == i {
            return Err(MakrellFormatError::new(format!("Unexpected token: {ch}")));
        }
        tokens.push(Token {
            kind: TokenKind::Scalar,
            text: chars[start..i].iter().collect(),
            quoted: false,
            suffix: String::new(),
        });
    }
    Ok(tokens)
}

fn token(kind: TokenKind, text: &str) -> Token {
    Token {
        kind,
        text: text.to_string(),
        quoted: false,
        suffix: String::new(),
    }
}

fn read_suffix(chars: &[char], index: &mut usize) -> String {
    let start = *index;
    while *index < chars.len() {
        let ch = chars[*index];
        if ch.is_ascii_alphanumeric() || ch == '_' {
            *index += 1;
            continue;
        }
        break;
    }
    chars[start..*index].iter().collect()
}

struct Parser {
    tokens: Vec<Token>,
    index: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self {
        Self { tokens, index: 0 }
    }

    fn parse_roots(&mut self) -> Result<Vec<Node>, MakrellFormatError> {
        let mut nodes = Vec::new();
        while !self.is_at_end() {
            nodes.push(self.parse_node()?);
        }
        Ok(nodes)
    }

    fn parse_node(&mut self) -> Result<Node, MakrellFormatError> {
        let token = self.next()?;
        match token.kind {
            TokenKind::Scalar | TokenKind::Equals => Ok(Node::Scalar {
                text: token.text,
                quoted: token.quoted,
                suffix: token.suffix,
            }),
            TokenKind::BraceOpen => Ok(Node::Brace(self.parse_group(TokenKind::BraceClose)?)),
            TokenKind::SquareOpen => Ok(Node::Square(self.parse_group(TokenKind::SquareClose)?)),
            TokenKind::ParenOpen => Ok(Node::Paren(self.parse_group(TokenKind::ParenClose)?)),
            TokenKind::Operator => Err(MakrellFormatError::new(format!("Unexpected token: {}", token.text))),
            _ => Err(MakrellFormatError::new(format!("Unexpected token: {}", token.text))),
        }
    }

    fn parse_group(&mut self, closing: TokenKind) -> Result<Vec<Node>, MakrellFormatError> {
        let mut items = Vec::new();
        while !self.is_at_end() && self.peek()?.kind != closing {
            items.push(self.parse_node()?);
        }
        if self.is_at_end() {
            return Err(MakrellFormatError::new("Unclosed group"));
        }
        self.next()?;
        Ok(items)
    }

    fn is_at_end(&self) -> bool {
        self.index >= self.tokens.len()
    }

    fn peek(&self) -> Result<&Token, MakrellFormatError> {
        self.tokens
            .get(self.index)
            .ok_or_else(|| MakrellFormatError::new("Unexpected end of input"))
    }

    fn next(&mut self) -> Result<Token, MakrellFormatError> {
        let token = self
            .tokens
            .get(self.index)
            .cloned()
            .ok_or_else(|| MakrellFormatError::new("Unexpected end of input"))?;
        self.index += 1;
        Ok(token)
    }
}
