from pygments.lexer import RegexLexer
from pygments.token import Keyword, Name, String, Number, Operator, Comment, Text, Punctuation
from pygments.lexers import get_lexer_by_name


class MakrellLexer(RegexLexer):
    name = "Makrell"
    aliases = ["makrell"]
    filenames = ["*.mrpy"]

    tokens = {
        'root': [
            (r'#.*$', Comment.Single),
            (r'(".*?")', String),
            (r'\b(def|if|fun|while|return|match)\b', Keyword),
            (r'\b([A-Za-z_][A-Za-z0-9_]*)\b', Name),
            (r'(\d+)', Number),
            (r'(\+|\-|\*|/|=|\.|,|\||@|:|<|>|!|&|\\)', Operator),
            (r'\s+', Text),
            (r'(\(|\)|\[|\]|\{|\})', String.Delimiter),
        ]
    }
