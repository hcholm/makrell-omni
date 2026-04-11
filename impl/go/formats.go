package formats

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type node struct {
	kind     string
	text     string
	quoted   bool
	children []node
}

type MrmlElement struct {
	Name       string
	Attributes map[string]string
	Children   []any
}

type MrtdColumn struct {
	Name string
	Type string
}

type MrtdDocument struct {
	Columns []MrtdColumn
	Rows    [][]any
	Records []map[string]any
}

func ParseMronString(source string) (any, error) {
	nodes, err := parseMiniMbf(source)
	if err != nil {
		return nil, err
	}
	if len(nodes) == 0 {
		return nil, nil
	}
	if len(nodes) == 1 {
		return convertMronNode(nodes[0])
	}
	if len(nodes)%2 != 0 {
		return nil, fmt.Errorf("illegal number (%d) of root level expressions for MRON object", len(nodes))
	}
	return convertMronPairs(nodes)
}

func ParseMronFile(path string) (any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("could not read MRON file: %s", path)
	}
	return ParseMronString(string(data))
}

func WriteMronString(value any) (string, error) {
	return writeMronValue(value)
}

func ParseMrmlString(source string) (MrmlElement, error) {
	nodes, err := parseMiniMbf(source)
	if err != nil {
		return MrmlElement{}, err
	}
	if len(nodes) != 1 || nodes[0].kind != "brace" {
		return MrmlElement{}, fmt.Errorf("MRML expects exactly one root element")
	}
	return parseMrmlElement(nodes[0])
}

func ParseMrmlFile(path string) (MrmlElement, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return MrmlElement{}, fmt.Errorf("could not read MRML file: %s", path)
	}
	return ParseMrmlString(string(data))
}

func WriteMrmlString(value any) (string, error) {
	element, ok := value.(MrmlElement)
	if !ok {
		return "", fmt.Errorf("unsupported MRML value for serialisation")
	}
	return writeMrmlElement(element), nil
}

func ParseMrtdString(source string) (MrtdDocument, error) {
	lines := make([]string, 0)
	for _, raw := range strings.Split(strings.ReplaceAll(source, "\r\n", "\n"), "\n") {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		lines = append(lines, trimmed)
	}
	if len(lines) == 0 {
		return MrtdDocument{}, nil
	}

	headerNodes, err := parseMiniMbf(lines[0])
	if err != nil {
		return MrtdDocument{}, err
	}
	columns := make([]MrtdColumn, 0, len(headerNodes))
	for _, item := range headerNodes {
		if item.kind != "scalar" {
			return MrtdDocument{}, fmt.Errorf("invalid MRTD header field")
		}
		parts := strings.SplitN(item.text, ":", 2)
		columnType := "string"
		if len(parts) == 2 {
			columnType = parts[1]
		}
		columns = append(columns, MrtdColumn{Name: parts[0], Type: columnType})
	}

	rows := make([][]any, 0, len(lines)-1)
	records := make([]map[string]any, 0, len(lines)-1)
	for _, raw := range lines[1:] {
		line := raw
		if strings.HasPrefix(line, "(") && strings.HasSuffix(line, ")") {
			line = strings.TrimSpace(line[1 : len(line)-1])
		}
		cells, err := parseMiniMbf(line)
		if err != nil {
			return MrtdDocument{}, err
		}
		if len(cells) != len(columns) {
			return MrtdDocument{}, fmt.Errorf("MRTD row width mismatch")
		}
		row := make([]any, 0, len(columns))
		record := make(map[string]any, len(columns))
		for i, cell := range cells {
			value, err := convertMrtdCell(cell, columns[i].Type)
			if err != nil {
				return MrtdDocument{}, err
			}
			row = append(row, value)
			record[columns[i].Name] = value
		}
		rows = append(rows, row)
		records = append(records, record)
	}

	return MrtdDocument{Columns: columns, Rows: rows, Records: records}, nil
}

func ParseMrtdFile(path string) (MrtdDocument, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return MrtdDocument{}, fmt.Errorf("could not read MRTD file: %s", path)
	}
	return ParseMrtdString(string(data))
}

func WriteMrtdString(value any) (string, error) {
	document, ok := value.(MrtdDocument)
	if !ok {
		return "", fmt.Errorf("unsupported MRTD value for serialisation")
	}
	lines := make([]string, 0, len(document.Rows)+1)
	header := make([]string, 0, len(document.Columns))
	for _, column := range document.Columns {
		header = append(header, quoteName(column.Name)+":"+column.Type)
	}
	lines = append(lines, strings.Join(header, " "))
	for _, row := range document.Rows {
		cells := make([]string, 0, len(row))
		for _, value := range row {
			cells = append(cells, writeMrtdCell(value))
		}
		lines = append(lines, strings.Join(cells, " "))
	}
	return strings.Join(lines, "\n"), nil
}

func convertMronNode(item node) (any, error) {
	switch item.kind {
	case "scalar":
		return convertScalar(item.text, item.quoted), nil
	case "square":
		values := make([]any, 0, len(item.children))
		for _, child := range item.children {
			value, err := convertMronNode(child)
			if err != nil {
				return nil, err
			}
			values = append(values, value)
		}
		return values, nil
	case "brace":
		return convertMronPairs(item.children)
	default:
		return nil, fmt.Errorf("unsupported MRON node kind: %s", item.kind)
	}
}

func convertMronPairs(nodes []node) (map[string]any, error) {
	if len(nodes)%2 != 0 {
		return nil, fmt.Errorf("odd pair count in MRON object")
	}
	result := make(map[string]any, len(nodes)/2)
	for i := 0; i < len(nodes); i += 2 {
		keyValue, err := convertMronNode(nodes[i])
		if err != nil {
			return nil, err
		}
		value, err := convertMronNode(nodes[i+1])
		if err != nil {
			return nil, err
		}
		result[fmt.Sprint(keyValue)] = value
	}
	return result, nil
}

func writeMronValue(value any) (string, error) {
	switch v := value.(type) {
	case nil:
		return "null", nil
	case bool:
		if v {
			return "true", nil
		}
		return "false", nil
	case int:
		return strconv.Itoa(v), nil
	case int64:
		return strconv.FormatInt(v, 10), nil
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64), nil
	case string:
		if isIdentifierLike(v) {
			return v, nil
		}
		return quote(v), nil
	case []any:
		parts := make([]string, 0, len(v))
		for _, item := range v {
			text, err := writeMronValue(item)
			if err != nil {
				return "", err
			}
			parts = append(parts, text)
		}
		return "[" + strings.Join(parts, " ") + "]", nil
	case map[string]any:
		parts := make([]string, 0, len(v)*2)
		for key, item := range v {
			keyText, err := writeMronValue(key)
			if err != nil {
				return "", err
			}
			valueText, err := writeMronValue(item)
			if err != nil {
				return "", err
			}
			parts = append(parts, keyText, valueText)
		}
		return "{ " + strings.Join(parts, " ") + " }", nil
	default:
		return "", fmt.Errorf("unsupported MRON value for serialisation")
	}
}

func parseMrmlElement(item node) (MrmlElement, error) {
	if item.kind != "brace" || len(item.children) == 0 {
		return MrmlElement{}, fmt.Errorf("invalid MRML element")
	}
	head := item.children[0]
	if head.kind != "scalar" {
		return MrmlElement{}, fmt.Errorf("MRML element name must be a scalar")
	}
	index := 1
	attributes := map[string]string{}
	if index < len(item.children) && item.children[index].kind == "square" {
		var err error
		attributes, err = parseMrmlAttributes(item.children[index].children)
		if err != nil {
			return MrmlElement{}, err
		}
		index++
	}
	children := make([]any, 0, len(item.children)-index)
	for _, child := range item.children[index:] {
		switch child.kind {
		case "brace":
			element, err := parseMrmlElement(child)
			if err != nil {
				return MrmlElement{}, err
			}
			children = append(children, element)
		case "scalar":
			children = append(children, child.text)
		default:
			return MrmlElement{}, fmt.Errorf("unsupported MRML child node")
		}
	}
	return MrmlElement{Name: head.text, Attributes: attributes, Children: children}, nil
}

func parseMrmlAttributes(nodes []node) (map[string]string, error) {
	result := make(map[string]string)
	for i := 0; i < len(nodes); {
		if nodes[i].kind != "scalar" {
			return nil, fmt.Errorf("invalid MRML attribute list")
		}
		key := nodes[i].text
		i++
		if i < len(nodes) && nodes[i].kind == "scalar" && nodes[i].text == "=" {
			i++
		}
		if i >= len(nodes) || nodes[i].kind != "scalar" {
			return nil, fmt.Errorf("missing MRML attribute value")
		}
		result[key] = nodes[i].text
		i++
	}
	return result, nil
}

func writeMrmlElement(element MrmlElement) string {
	var builder strings.Builder
	builder.WriteString("<")
	builder.WriteString(element.Name)
	for key, value := range element.Attributes {
		builder.WriteString(" ")
		builder.WriteString(key)
		builder.WriteString("=\"")
		builder.WriteString(escapeXML(value))
		builder.WriteString("\"")
	}
	if len(element.Children) == 0 {
		builder.WriteString("/>")
		return builder.String()
	}
	builder.WriteString(">")
	for _, child := range element.Children {
		switch value := child.(type) {
		case MrmlElement:
			builder.WriteString(writeMrmlElement(value))
		case string:
			builder.WriteString(escapeXML(value))
		default:
			builder.WriteString(escapeXML(fmt.Sprint(value)))
		}
	}
	builder.WriteString("</")
	builder.WriteString(element.Name)
	builder.WriteString(">")
	return builder.String()
}

func convertMrtdCell(item node, valueType string) (any, error) {
	if item.kind != "scalar" {
		return nil, fmt.Errorf("MRTD cells must be scalar values")
	}
	value := convertScalar(item.text, item.quoted)
	switch valueType {
	case "string":
		return fmt.Sprint(value), nil
	case "int":
		switch v := value.(type) {
		case int:
			return v, nil
		case int64:
			return int(v), nil
		default:
			return nil, fmt.Errorf("MRTD value does not match int field")
		}
	case "float":
		switch v := value.(type) {
		case int:
			return float64(v), nil
		case int64:
			return float64(v), nil
		case float64:
			return v, nil
		default:
			return nil, fmt.Errorf("MRTD value does not match float field")
		}
	case "bool":
		if v, ok := value.(bool); ok {
			return v, nil
		}
		return nil, fmt.Errorf("MRTD value does not match bool field")
	default:
		return nil, fmt.Errorf("unsupported MRTD field type: %s", valueType)
	}
}

func writeMrtdCell(value any) string {
	switch v := value.(type) {
	case bool:
		if v {
			return "true"
		}
		return "false"
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	default:
		text := fmt.Sprint(v)
		if isIdentifierLike(text) {
			return text
		}
		return quote(text)
	}
}

func quoteName(value string) string {
	if isIdentifierLike(value) {
		return value
	}
	return quote(value)
}

func convertScalar(text string, quoted bool) any {
	if quoted {
		return text
	}
	switch text {
	case "null":
		return nil
	case "true":
		return true
	case "false":
		return false
	}
	if value, err := strconv.Atoi(text); err == nil {
		return value
	}
	if value, err := strconv.ParseFloat(text, 64); err == nil && strings.Contains(text, ".") {
		return value
	}
	return text
}

func parseMiniMbf(source string) ([]node, error) {
	tokens, err := tokeniseMiniMbf(source)
	if err != nil {
		return nil, err
	}
	index := 0
	nodes := make([]node, 0)
	for index < len(tokens) {
		item, err := parseMiniMbfNode(tokens, &index)
		if err != nil {
			return nil, err
		}
		nodes = append(nodes, item)
	}
	return nodes, nil
}

type token struct {
	kind   string
	text   string
	quoted bool
}

func parseMiniMbfNode(tokens []token, index *int) (node, error) {
	if *index >= len(tokens) {
		return node{}, fmt.Errorf("unexpected end of input")
	}
	item := tokens[*index]
	*index++
	switch item.kind {
	case "scalar", "=":
		return node{kind: "scalar", text: item.text, quoted: item.quoted}, nil
	case "{":
		children, err := parseMiniMbfGroup(tokens, index, "}")
		return node{kind: "brace", children: children}, err
	case "[":
		children, err := parseMiniMbfGroup(tokens, index, "]")
		return node{kind: "square", children: children}, err
	case "(":
		children, err := parseMiniMbfGroup(tokens, index, ")")
		return node{kind: "paren", children: children}, err
	default:
		return node{}, fmt.Errorf("unexpected token: %s", item.text)
	}
}

func parseMiniMbfGroup(tokens []token, index *int, closing string) ([]node, error) {
	items := make([]node, 0)
	for *index < len(tokens) && tokens[*index].kind != closing {
		item, err := parseMiniMbfNode(tokens, index)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if *index >= len(tokens) {
		return nil, fmt.Errorf("unclosed group")
	}
	*index++
	return items, nil
}

func tokeniseMiniMbf(source string) ([]token, error) {
	tokens := make([]token, 0)
	for i := 0; i < len(source); {
		ch := source[i]
		if ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n' || ch == ',' {
			i++
			continue
		}
		if ch == '#' {
			for i < len(source) && source[i] != '\n' {
				i++
			}
			continue
		}
		if ch == '/' && i+1 < len(source) && source[i+1] == '/' {
			i += 2
			for i < len(source) && source[i] != '\n' {
				i++
			}
			continue
		}
		switch ch {
		case '{', '}', '[', ']', '(', ')', '=':
			tokens = append(tokens, token{kind: string(ch), text: string(ch)})
			i++
			continue
		case '"':
			i++
			var builder strings.Builder
			escaping := false
			for i < len(source) {
				c := source[i]
				i++
				if escaping {
					switch c {
					case 'n':
						builder.WriteByte('\n')
					case 'r':
						builder.WriteByte('\r')
					case 't':
						builder.WriteByte('\t')
					case '"', '\\':
						builder.WriteByte(c)
					default:
						builder.WriteByte(c)
					}
					escaping = false
					continue
				}
				if c == '\\' {
					escaping = true
					continue
				}
				if c == '"' {
					break
				}
				builder.WriteByte(c)
			}
			tokens = append(tokens, token{kind: "scalar", text: builder.String(), quoted: true})
			continue
		}

		start := i
		for i < len(source) {
			c := source[i]
			if c == ' ' || c == '\t' || c == '\r' || c == '\n' || c == ',' || c == '#' || strings.ContainsRune("{}[]()=\"", rune(c)) {
				break
			}
			if c == '/' && i+1 < len(source) && source[i+1] == '/' {
				break
			}
			i++
		}
		if start == i {
			return nil, fmt.Errorf("unexpected token: %c", ch)
		}
		tokens = append(tokens, token{kind: "scalar", text: source[start:i]})
	}
	return tokens, nil
}

func escapeXML(value string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		"\"", "&quot;",
	)
	return replacer.Replace(value)
}

func isIdentifierLike(value string) bool {
	if value == "" {
		return false
	}
	first := value[0]
	if !((first >= 'A' && first <= 'Z') || (first >= 'a' && first <= 'z') || first == '_') {
		return false
	}
	for i := 1; i < len(value); i++ {
		ch := value[i]
		if !((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '_' || ch == '-') {
			return false
		}
	}
	return true
}

func quote(value string) string {
	replacer := strings.NewReplacer("\\", "\\\\", "\"", "\\\"")
	return "\"" + replacer.Replace(value) + "\""
}
