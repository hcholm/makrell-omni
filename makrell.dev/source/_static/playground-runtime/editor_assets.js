// @bun
// src/editor-assets/languages.json
var languages_default = {
  languages: [
    {
      id: "makrell",
      aliases: ["Makrell", "makrell"],
      extensions: [".mr", ".mrx", ".mrpy", ".mrts", ".mrsh"],
      family: "makrell"
    },
    {
      id: "makrell-on",
      aliases: [
        "Makrell Object Notation",
        "MRON",
        "makrell object notation",
        "mron"
      ],
      extensions: [".mron"],
      family: "mron"
    },
    {
      id: "makrell-ml",
      aliases: [
        "Makrell Markup Language",
        "MRML",
        "makrell markup language",
        "mrml"
      ],
      extensions: [".mrml"],
      family: "mrml"
    },
    {
      id: "makrell-td",
      aliases: [
        "Makrell Tabular Data",
        "MRTD",
        "makrell tabular data",
        "mrtd"
      ],
      extensions: [".mrtd"],
      family: "mrtd"
    }
  ]
};
// src/editor-assets/language-configuration.json
var language_configuration_default = {
  comments: {
    lineComment: "#",
    blockComment: [
      "/*",
      "*/"
    ]
  },
  brackets: [
    [
      "{",
      "}"
    ],
    [
      "[",
      "]"
    ],
    [
      "(",
      ")"
    ]
  ],
  autoClosingPairs: [
    {
      open: "{",
      close: "}"
    },
    {
      open: "[",
      close: "]"
    },
    {
      open: "(",
      close: ")"
    },
    {
      open: '"',
      close: '"',
      notIn: [
        "string",
        "comment"
      ]
    }
  ],
  surroundingPairs: [
    [
      "{",
      "}"
    ],
    [
      "[",
      "]"
    ],
    [
      "(",
      ")"
    ],
    [
      '"',
      '"'
    ]
  ],
  autoCloseBefore: `;:.,=}])> 
	`,
  wordPattern: "(-?\\d+(?:\\.\\d+)?)|([\\p{L}_$][\\p{L}\\p{N}_$:-]*)",
  indentationRules: {
    increaseIndentPattern: "^.*(?:\\{|\\[|\\()\\s*$",
    decreaseIndentPattern: "^\\s*[\\}\\]\\)].*$"
  }
};
// src/editor-assets/snippets/makrell.code-snippets.json
var makrell_code_snippets_default = {
  if: {
    prefix: "if",
    body: "{if ${1:predicate} ${2:consequent} ${3:alternative}}",
    description: "Makrell if expression",
    scope: "source.makrell"
  },
  fun: {
    prefix: "fun",
    body: [
      "{fun ${1:name} [${2:parameters}]",
      "    $TM_SELECTED_TEXT$0",
      "}"
    ],
    description: "Makrell function definition",
    scope: "source.makrell"
  },
  macro: {
    prefix: "macro",
    body: [
      "{def macro ${1:name} [${2:nodes}]",
      "    ${2:nodes} = {regular ${2:nodes}}",
      "    $TM_SELECTED_TEXT$0",
      "}"
    ],
    description: "Makrell macro definition",
    scope: "source.makrell"
  },
  match: {
    prefix: "match",
    body: [
      "{match ${1:value}",
      "    ${2:pattern}",
      "        ${3:result}",
      "    _",
      "        ${4:fallback}}"
    ],
    description: "Makrell match expression",
    scope: "source.makrell"
  },
  meta: {
    prefix: "meta",
    body: [
      "{meta",
      "    $TM_SELECTED_TEXT$0",
      "}"
    ],
    description: "Makrell compile-time meta block",
    scope: "source.makrell"
  },
  quote: {
    prefix: "quote",
    body: "{quote $TM_SELECTED_TEXT$0}",
    description: "Makrell quote form",
    scope: "source.makrell"
  },
  "mron-object": {
    prefix: "mronobj",
    body: [
      "{",
      "    ${1:key} ${2:value}",
      "}"
    ],
    description: "MRON object block",
    scope: "source.makrell"
  },
  "mron-list": {
    prefix: "mronlist",
    body: [
      "[",
      "    ${1:value}",
      "]"
    ],
    description: "MRON list block",
    scope: "source.makrell"
  },
  "mrml-element": {
    prefix: "mrml",
    body: [
      "{${1:div}",
      "    ${2:child}",
      "}"
    ],
    description: "MRML element block",
    scope: "source.makrell"
  },
  mrtd: {
    prefix: "mrtd",
    body: [
      "${1:name}:${2:string} ${3:age}:${4:int}",
      "${5:Ada} ${6:32}",
      "${7:Ben} ${8:41}"
    ],
    description: "MRTD header and sample rows",
    scope: "source.makrell"
  },
  "mrtd-multiline-header": {
    prefix: "mrtdmulti",
    body: [
      "(",
      "    ${1:name}:${2:string}",
      "    ${3:age}:${4:int}",
      ")",
      "${5:Ada} ${6:32}"
    ],
    description: "MRTD multiline header",
    scope: "source.makrell"
  }
};
// src/editor-assets/syntaxes/makrell.tmLanguage.json
var makrell_tmLanguage_default = {
  name: "Makrell",
  scopeName: "source.makrell",
  patterns: [
    {
      include: "#expression"
    }
  ],
  repository: {
    expression: {
      patterns: [
        {
          include: "#comments"
        },
        {
          include: "#strings"
        },
        {
          include: "#numbers"
        },
        {
          include: "#keywords"
        },
        {
          include: "#constants"
        },
        {
          include: "#special-forms"
        },
        {
          include: "#operators"
        },
        {
          include: "#brackets"
        },
        {
          include: "#mrml-tag-head"
        },
        {
          include: "#types"
        },
        {
          include: "#identifiers"
        }
      ]
    },
    comments: {
      patterns: [
        {
          name: "comment.line.number-sign.makrell",
          begin: "#",
          beginCaptures: {
            "0": {
              name: "punctuation.definition.comment.makrell"
            }
          },
          end: "$"
        },
        {
          name: "comment.block.makrell",
          begin: "/\\*",
          beginCaptures: {
            "0": {
              name: "punctuation.definition.comment.begin.makrell"
            }
          },
          end: "\\*/",
          endCaptures: {
            "0": {
              name: "punctuation.definition.comment.end.makrell"
            }
          }
        }
      ]
    },
    strings: {
      patterns: [
        {
          name: "string.quoted.double.makrell",
          begin: '"',
          beginCaptures: {
            "0": {
              name: "punctuation.definition.string.begin.makrell"
            }
          },
          end: '"([A-Za-z][A-Za-z0-9_-]*)?',
          endCaptures: {
            "0": {
              name: "punctuation.definition.string.end.makrell"
            },
            "1": {
              name: "storage.modifier.suffix.makrell"
            }
          },
          patterns: [
            {
              name: "constant.character.escape.makrell",
              match: "\\\\."
            }
          ]
        }
      ]
    },
    numbers: {
      patterns: [
        {
          name: "constant.numeric.makrell",
          match: "(?<![\\w.])-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?([A-Za-z][A-Za-z0-9_-]*)?"
        }
      ]
    },
    keywords: {
      patterns: [
        {
          name: "keyword.control.makrell",
          match: "\\b(def|macro|meta|fun|if|do|when|while|for|return|break|continue|match|new|class|import|importm|from|as)\\b"
        }
      ]
    },
    constants: {
      patterns: [
        {
          name: "constant.language.makrell",
          match: "\\b(true|false|null)\\b"
        }
      ]
    },
    "special-forms": {
      patterns: [
        {
          name: "keyword.other.special.makrell",
          match: "\\$(?:[A-Za-z_][A-Za-z0-9_-]*)?"
        }
      ]
    },
    operators: {
      patterns: [
        {
          name: "keyword.operator.makrell",
          match: "(->|!~=|~=|==|!=|<=|>=|&&|\\|\\||\\|\\*|\\*\\\\|\\\\|\\.\\.|[:=+\\-*/<>@.,~|!%^&\\\\])"
        }
      ]
    },
    brackets: {
      patterns: [
        {
          name: "punctuation.section.curly.begin.makrell",
          match: "\\{"
        },
        {
          name: "punctuation.section.curly.end.makrell",
          match: "\\}"
        },
        {
          name: "punctuation.section.square.begin.makrell",
          match: "\\["
        },
        {
          name: "punctuation.section.square.end.makrell",
          match: "\\]"
        },
        {
          name: "punctuation.section.parens.begin.makrell",
          match: "\\("
        },
        {
          name: "punctuation.section.parens.end.makrell",
          match: "\\)"
        }
      ]
    },
    "mrml-tag-head": {
      patterns: [
        {
          name: "entity.name.tag.makrell",
          match: "\\b[a-z][A-Za-z0-9:._-]*\\b(?=>)"
        }
      ]
    },
    types: {
      patterns: [
        {
          name: "storage.type.makrell",
          match: "\\b[A-Z][A-Za-z0-9_]*\\b"
        }
      ]
    },
    identifiers: {
      patterns: [
        {
          name: "variable.other.makrell",
          match: "\\b[[:alpha:]_][[:alnum:]_:-]*\\b"
        }
      ]
    }
  }
};

// src/editor_assets.ts
var languagePayload = languages_default;
var makrellEditorLanguages = languagePayload.languages;
var makrellLanguageConfiguration = language_configuration_default;
var makrellEditorSnippets = makrell_code_snippets_default;
var makrellTextMateGrammar = makrell_tmLanguage_default;
function getMakrellEditorAssets() {
  return {
    languages: makrellEditorLanguages,
    languageConfiguration: makrellLanguageConfiguration,
    snippets: makrellEditorSnippets,
    grammar: makrellTextMateGrammar
  };
}
export {
  makrellTextMateGrammar,
  makrellLanguageConfiguration,
  makrellEditorSnippets,
  makrellEditorLanguages,
  getMakrellEditorAssets
};

//# debugId=454944C5E044F9E764756E2164756E21
//# sourceMappingURL=editor_assets.js.map
