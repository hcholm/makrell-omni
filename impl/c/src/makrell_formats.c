#include "makrell_formats.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char kind[8];
    char* text;
    int quoted;
    char* suffix;
} token;

typedef struct node {
    char kind[8];
    char* text;
    int quoted;
    char* suffix;
    struct node* children;
    size_t count;
} node;

typedef struct {
    char* data;
    size_t len;
    size_t cap;
} string_builder;

static char* mf_strdup(const char* text) {
    size_t len = strlen(text);
    char* out = (char*) malloc(len + 1);
    memcpy(out, text, len + 1);
    return out;
}

static char* mf_strndup(const char* text, size_t len) {
    char* out = (char*) malloc(len + 1);
    memcpy(out, text, len);
    out[len] = 0;
    return out;
}

static char* read_file(const char* path) {
    FILE* file = fopen(path, "rb");
    long size;
    char* buffer;
    if (!file) return NULL;
    fseek(file, 0, SEEK_END);
    size = ftell(file);
    fseek(file, 0, SEEK_SET);
    buffer = (char*) malloc((size_t) size + 1);
    fread(buffer, 1, (size_t) size, file);
    buffer[size] = 0;
    fclose(file);
    return buffer;
}

static void sb_init(string_builder* sb) {
    sb->cap = 128;
    sb->len = 0;
    sb->data = (char*) malloc(sb->cap);
    sb->data[0] = 0;
}

static void sb_append(string_builder* sb, const char* text) {
    size_t len = strlen(text);
    if (sb->len + len + 1 > sb->cap) {
        while (sb->len + len + 1 > sb->cap) sb->cap *= 2;
        sb->data = (char*) realloc(sb->data, sb->cap);
    }
    memcpy(sb->data + sb->len, text, len + 1);
    sb->len += len;
}

static void token_push(token** items, size_t* count, token item) {
    *items = (token*) realloc(*items, sizeof(token) * (*count + 1));
    (*items)[(*count)++] = item;
}

static char* read_suffix(const char* source, size_t* index) {
    size_t start = *index;
    while (source[*index] != 0 && (isalnum((unsigned char) source[*index]) || source[*index] == '_')) ++*index;
    return mf_strndup(source + start, *index - start);
}

static void node_push(node** items, size_t* count, node item) {
    *items = (node*) realloc(*items, sizeof(node) * (*count + 1));
    (*items)[(*count)++] = item;
}

static token* tokenize(const char* source, size_t* out_count) {
    token* tokens = NULL;
    size_t count = 0;
    size_t i = 0;
    while (source[i] != 0) {
        char ch = source[i];
        if (isspace((unsigned char) ch) || ch == ',') {
            ++i;
            continue;
        }
        if (ch == '#') {
            while (source[i] != 0 && source[i] != '\n') ++i;
            continue;
        }
        if (ch == '/' && source[i + 1] == '/') {
            i += 2;
            while (source[i] != 0 && source[i] != '\n') ++i;
            continue;
        }
        if (ch == '/' && source[i + 1] == '*') {
            i += 2;
            while (source[i] != 0 && !(source[i] == '*' && source[i + 1] == '/')) ++i;
            if (source[i] == 0) return NULL;
            i += 2;
            continue;
        }
        if (ch == '-' && isdigit((unsigned char) source[i + 1])) {
            size_t start = i++;
            while (source[i] != 0) {
                char c = source[i];
                if (isspace((unsigned char) c) || c == ',' || c == '#' || strchr("{}[]()=\"", c) != NULL) break;
                if (c == '/' && (source[i + 1] == '/' || source[i + 1] == '*')) break;
                ++i;
            }
            token_push(&tokens, &count, (token){"scalar", (char*) malloc(i - start + 1), 0, NULL});
            memcpy(tokens[count - 1].text, source + start, i - start);
            tokens[count - 1].text[i - start] = 0;
            tokens[count - 1].suffix = mf_strdup("");
            continue;
        }
        if (strchr("{}[]()=-", ch) != NULL) {
            char text[2] = {ch, 0};
            token_push(&tokens, &count, (token){"", mf_strdup(text), 0, mf_strdup("")});
            strcpy(tokens[count - 1].kind, text);
            ++i;
            continue;
        }
        if (ch == '"') {
            string_builder sb;
            int escaping = 0;
            sb_init(&sb);
            ++i;
            while (source[i] != 0) {
                char c = source[i++];
                if (escaping) {
                    char text[2] = {c == 'n' ? '\n' : c == 'r' ? '\r' : c == 't' ? '\t' : c, 0};
                    sb_append(&sb, text);
                    escaping = 0;
                    continue;
                }
                if (c == '\\') {
                    escaping = 1;
                    continue;
                }
                if (c == '"') break;
                char text[2] = {c, 0};
                sb_append(&sb, text);
            }
            token_push(&tokens, &count, (token){"scalar", sb.data, 1, NULL});
            tokens[count - 1].suffix = read_suffix(source, &i);
            continue;
        }
        {
            size_t start = i;
            while (source[i] != 0) {
                char c = source[i];
                if (isspace((unsigned char) c) || c == ',' || c == '#' || strchr("{}[]()=\"-", c) != NULL) break;
                if (c == '/' && (source[i + 1] == '/' || source[i + 1] == '*')) break;
                ++i;
            }
            token_push(&tokens, &count, (token){"scalar", (char*) malloc(i - start + 1), 0, NULL});
            memcpy(tokens[count - 1].text, source + start, i - start);
            tokens[count - 1].text[i - start] = 0;
            tokens[count - 1].suffix = mf_strdup("");
        }
    }
    *out_count = count;
    return tokens;
}

static node parse_node(token* tokens, size_t count, size_t* index);

static node* parse_group(token* tokens, size_t count, size_t* index, const char* closing, size_t* out_count) {
    node* items = NULL;
    size_t item_count = 0;
    while (*index < count && strcmp(tokens[*index].kind, closing) != 0) {
        node_push(&items, &item_count, parse_node(tokens, count, index));
    }
    if (*index < count) ++*index;
    *out_count = item_count;
    return items;
}

static node parse_node(token* tokens, size_t count, size_t* index) {
    token token = tokens[(*index)++];
    node out;
    memset(&out, 0, sizeof(out));
    if (strcmp(token.kind, "scalar") == 0 || strcmp(token.kind, "=") == 0) {
        strcpy(out.kind, "scalar");
        out.text = mf_strdup(token.text);
        out.quoted = token.quoted;
        out.suffix = mf_strdup(token.suffix ? token.suffix : "");
        return out;
    }
    if (strcmp(token.kind, "{") == 0) {
        strcpy(out.kind, "brace");
        out.children = parse_group(tokens, count, index, "}", &out.count);
        return out;
    }
    if (strcmp(token.kind, "[") == 0) {
        strcpy(out.kind, "square");
        out.children = parse_group(tokens, count, index, "]", &out.count);
        return out;
    }
    if (strcmp(token.kind, "(") == 0) {
        strcpy(out.kind, "paren");
        out.children = parse_group(tokens, count, index, ")", &out.count);
        return out;
    }
    strcpy(out.kind, "invalid");
    out.text = mf_strdup(token.text);
    out.suffix = mf_strdup(token.suffix ? token.suffix : "");
    return out;
}

static node* parse_nodes(const char* source, size_t* out_count) {
    size_t token_count = 0;
    size_t index = 0;
    token* tokens = tokenize(source, &token_count);
    node* items = NULL;
    size_t count = 0;
    while (index < token_count) {
        node_push(&items, &count, parse_node(tokens, token_count, &index));
    }
    for (index = 0; index < token_count; ++index) {
        free(tokens[index].text);
        free(tokens[index].suffix);
    }
    free(tokens);
    *out_count = count;
    return items;
}

static int node_contains_invalid(const node* item) {
    size_t i;
    if (strcmp(item->kind, "invalid") == 0) return 1;
    for (i = 0; i < item->count; ++i) {
        if (node_contains_invalid(&item->children[i])) return 1;
    }
    return 0;
}

static int nodes_contain_invalid(const node* items, size_t count) {
    size_t i;
    for (i = 0; i < count; ++i) {
        if (node_contains_invalid(&items[i])) return 1;
    }
    return 0;
}

static mf_value* alloc_value(mf_kind kind) {
    mf_value* value = (mf_value*) calloc(1, sizeof(mf_value));
    value->kind = kind;
    return value;
}

mf_numeric_suffix_parts mf_split_numeric_literal_suffix(const char* text) {
    size_t len = strlen(text);
    size_t boundary;
    mf_numeric_suffix_parts parts = {NULL, NULL};
    for (boundary = len; boundary > 0; --boundary) {
        char* value = mf_strndup(text, boundary);
        char* suffix = mf_strdup(text + boundary);
        char* end = NULL;
        int suffix_ok = suffix[0] == 0 || (isalpha((unsigned char) suffix[0]) || suffix[0] == '_');
        size_t i;
        for (i = 1; suffix_ok && suffix[i] != 0; ++i) {
            if (!(isalnum((unsigned char) suffix[i]) || suffix[i] == '_')) suffix_ok = 0;
        }
        if (suffix_ok) {
            strtod(value, &end);
            if (*value != 0 && end != NULL && *end == 0) {
                parts.value = value;
                parts.suffix = suffix;
                return parts;
            }
        }
        free(value);
        free(suffix);
    }
    return parts;
}

mf_value* mf_apply_basic_suffix_profile(const char* kind, const char* raw, const char* suffix) {
    char* end = NULL;
    mf_value* out;
    if (strcmp(kind, "string") == 0) {
        if (suffix == NULL || suffix[0] == 0) {
            out = alloc_value(MF_STRING);
            out->as.string_value = mf_strdup(raw);
            return out;
        }
        if (strcmp(suffix, "dt") == 0) {
            out = alloc_value(MF_TAGGED_STRING);
            out->as.tagged_string.value = mf_strdup(raw);
            out->as.tagged_string.suffix = mf_strdup(suffix);
            return out;
        }
        if (strcmp(suffix, "bin") == 0 || strcmp(suffix, "oct") == 0 || strcmp(suffix, "hex") == 0) {
            int base = strcmp(suffix, "bin") == 0 ? 2 : strcmp(suffix, "oct") == 0 ? 8 : 16;
            long long parsed = strtoll(raw, &end, base);
            if (*raw != 0 && end != NULL && *end == 0) {
                out = alloc_value(MF_INT);
                out->as.int_value = parsed;
                return out;
            }
            return NULL;
        }
        return NULL;
    }

    {
        double base = strtod(raw, &end);
        if (*raw == 0 || end == NULL || *end != 0) return NULL;
        if (suffix == NULL || suffix[0] == 0) {
            long long i = strtoll(raw, &end, 10);
            if (*raw != 0 && end != NULL && *end == 0 && strchr(raw, '.') == NULL && strchr(raw, 'e') == NULL && strchr(raw, 'E') == NULL) {
                out = alloc_value(MF_INT);
                out->as.int_value = i;
                return out;
            }
            out = alloc_value(MF_FLOAT);
            out->as.float_value = base;
            return out;
        }
        if (strcmp(suffix, "k") == 0) base *= 1e3;
        else if (strcmp(suffix, "M") == 0) base *= 1e6;
        else if (strcmp(suffix, "G") == 0) base *= 1e9;
        else if (strcmp(suffix, "T") == 0) base *= 1e12;
        else if (strcmp(suffix, "P") == 0) base *= 1e15;
        else if (strcmp(suffix, "E") == 0) base *= 1e18;
        else if (strcmp(suffix, "e") == 0) base *= 2.718281828459045;
        else if (strcmp(suffix, "tau") == 0) base *= 6.283185307179586;
        else if (strcmp(suffix, "deg") == 0) base *= 0.017453292519943295;
        else if (strcmp(suffix, "pi") == 0) base *= 3.141592653589793;
        else return NULL;
        {
            long long i = (long long) base;
            if (base == (double) i && strchr(raw, '.') == NULL && strchr(raw, 'e') == NULL && strchr(raw, 'E') == NULL &&
                strcmp(suffix, "e") != 0 && strcmp(suffix, "tau") != 0 && strcmp(suffix, "deg") != 0 && strcmp(suffix, "pi") != 0) {
                out = alloc_value(MF_INT);
                out->as.int_value = i;
                return out;
            }
        }
        out = alloc_value(MF_FLOAT);
        out->as.float_value = base;
        return out;
    }
}

static mf_value* convert_scalar(const char* text, int quoted, const char* suffix) {
    mf_numeric_suffix_parts parts;
    mf_value* out;
    if (quoted) {
        return mf_apply_basic_suffix_profile("string", text, suffix);
    }
    if (strcmp(text, "null") == 0) return alloc_value(MF_NULL);
    if (strcmp(text, "true") == 0) {
        out = alloc_value(MF_BOOL);
        out->as.bool_value = 1;
        return out;
    }
    if (strcmp(text, "false") == 0) {
        out = alloc_value(MF_BOOL);
        out->as.bool_value = 0;
        return out;
    }
    parts = mf_split_numeric_literal_suffix(text);
    if (parts.value != NULL) {
        mf_value* parsed = mf_apply_basic_suffix_profile("number", parts.value, parts.suffix);
        free(parts.value);
        free(parts.suffix);
        if (parsed) return parsed;
    }
    out = alloc_value(MF_STRING);
    out->as.string_value = mf_strdup(text);
    return out;
}

static const char* value_key(const mf_value* value, char* buffer, size_t size) {
    switch (value->kind) {
        case MF_STRING: return value->as.string_value;
        case MF_TAGGED_STRING: return value->as.tagged_string.value;
        case MF_BOOL: return value->as.bool_value ? "true" : "false";
        case MF_NULL: return "null";
        case MF_INT: snprintf(buffer, size, "%lld", value->as.int_value); return buffer;
        case MF_FLOAT: snprintf(buffer, size, "%g", value->as.float_value); return buffer;
        default: return "[complex]";
    }
}

static mf_value* convert_mron_node(node* item);

static mf_value* convert_mron_pairs(node* items, size_t count) {
    size_t i;
    char buffer[64];
    mf_value* value = alloc_value(MF_OBJECT);
    value->as.object.items = NULL;
    value->as.object.count = 0;
    for (i = 0; i + 1 < count; i += 2) {
        mf_value* key = convert_mron_node(&items[i]);
        mf_value* entry = convert_mron_node(&items[i + 1]);
        value->as.object.items = (mf_pair*) realloc(value->as.object.items, sizeof(mf_pair) * (value->as.object.count + 1));
        value->as.object.items[value->as.object.count].key = mf_strdup(value_key(key, buffer, sizeof(buffer)));
        value->as.object.items[value->as.object.count].value = entry;
        value->as.object.count++;
        mf_free_value(key);
    }
    return value;
}

static mf_value* convert_mron_node(node* item) {
    size_t i;
    if (strcmp(item->kind, "scalar") == 0) return convert_scalar(item->text, item->quoted, item->suffix);
    if (strcmp(item->kind, "square") == 0) {
        mf_value* value = alloc_value(MF_ARRAY);
        value->as.array.items = NULL;
        value->as.array.count = item->count;
        value->as.array.items = (mf_value**) calloc(item->count, sizeof(mf_value*));
        for (i = 0; i < item->count; ++i) value->as.array.items[i] = convert_mron_node(&item->children[i]);
        return value;
    }
    return convert_mron_pairs(item->children, item->count);
}

static int is_identifier_like(const char* value) {
    size_t i;
    if (value[0] == 0) return 0;
    if (!(isalpha((unsigned char) value[0]) || value[0] == '_')) return 0;
    for (i = 1; value[i] != 0; ++i) {
        if (!(isalnum((unsigned char) value[i]) || value[i] == '_')) return 0;
    }
    return 1;
}

static void append_quoted(string_builder* sb, const char* text) {
    size_t i;
    sb_append(sb, "\"");
    for (i = 0; text[i] != 0; ++i) {
        if (text[i] == '\\' || text[i] == '"') sb_append(sb, "\\");
        {
            char ch[2] = {text[i], 0};
            sb_append(sb, ch);
        }
    }
    sb_append(sb, "\"");
}

static void write_mron_value(string_builder* sb, const mf_value* value) {
    size_t i;
    char buffer[64];
    switch (value->kind) {
        case MF_NULL: sb_append(sb, "null"); break;
        case MF_BOOL: sb_append(sb, value->as.bool_value ? "true" : "false"); break;
        case MF_INT: snprintf(buffer, sizeof(buffer), "%lld", value->as.int_value); sb_append(sb, buffer); break;
        case MF_FLOAT: snprintf(buffer, sizeof(buffer), "%g", value->as.float_value); sb_append(sb, buffer); break;
        case MF_STRING: if (is_identifier_like(value->as.string_value)) sb_append(sb, value->as.string_value); else append_quoted(sb, value->as.string_value); break;
        case MF_TAGGED_STRING:
            if (is_identifier_like(value->as.tagged_string.value)) sb_append(sb, value->as.tagged_string.value);
            else append_quoted(sb, value->as.tagged_string.value);
            sb_append(sb, value->as.tagged_string.suffix);
            break;
        case MF_ARRAY:
            sb_append(sb, "[");
            for (i = 0; i < value->as.array.count; ++i) {
                if (i) sb_append(sb, " ");
                write_mron_value(sb, value->as.array.items[i]);
            }
            sb_append(sb, "]");
            break;
        case MF_OBJECT:
            sb_append(sb, "{ ");
            for (i = 0; i < value->as.object.count; ++i) {
                if (i) sb_append(sb, " ");
                if (is_identifier_like(value->as.object.items[i].key)) sb_append(sb, value->as.object.items[i].key);
                else append_quoted(sb, value->as.object.items[i].key);
                sb_append(sb, " ");
                write_mron_value(sb, value->as.object.items[i].value);
            }
            sb_append(sb, " }");
            break;
    }
}

mf_value* mf_parse_mron_string(const char* source) {
    size_t count = 0;
    node* items = parse_nodes(source, &count);
    if (nodes_contain_invalid(items, count)) return NULL;
    if (count == 0) return alloc_value(MF_NULL);
    if (count == 1) return convert_mron_node(&items[0]);
    return convert_mron_pairs(items, count);
}

mf_value* mf_parse_mron_file(const char* path) {
    char* source = read_file(path);
    mf_value* value;
    if (!source) return NULL;
    value = mf_parse_mron_string(source);
    free(source);
    return value;
}

char* mf_write_mron_string(const mf_value* value) {
    string_builder sb;
    sb_init(&sb);
    write_mron_value(&sb, value);
    return sb.data;
}

static mf_mrml_element* parse_mrml_element(node* item) {
    size_t i, index = 1;
    mf_mrml_element* element = (mf_mrml_element*) calloc(1, sizeof(mf_mrml_element));
    element->name = mf_strdup(item->children[0].text);
    if (index < item->count && strcmp(item->children[index].kind, "square") == 0) {
        node* attrs = item->children[index].children;
        size_t count = item->children[index].count;
        for (i = 0; i < count;) {
            char* key = mf_strdup(attrs[i++].text);
            if (i < count && strcmp(attrs[i].kind, "scalar") == 0 && strcmp(attrs[i].text, "=") == 0) ++i;
            element->keys = (char**) realloc(element->keys, sizeof(char*) * (element->attribute_count + 1));
            element->values = (char**) realloc(element->values, sizeof(char*) * (element->attribute_count + 1));
            element->keys[element->attribute_count] = key;
            element->values[element->attribute_count] = mf_strdup(attrs[i++].text);
            element->attribute_count++;
        }
        index++;
    }
    for (; index < item->count; ++index) {
        if (strcmp(item->children[index].kind, "brace") == 0) {
            element->element_children = (mf_mrml_element**) realloc(element->element_children, sizeof(mf_mrml_element*) * (element->element_count + 1));
            element->element_children[element->element_count++] = parse_mrml_element(&item->children[index]);
        } else {
            element->text_children = (char**) realloc(element->text_children, sizeof(char*) * (element->text_count + 1));
            element->text_children[element->text_count++] = mf_strdup(item->children[index].text);
        }
    }
    return element;
}

mf_mrml_element* mf_parse_mrml_string(const char* source) {
    size_t count = 0;
    node* items = parse_nodes(source, &count);
    if (count != 1 || strcmp(items[0].kind, "brace") != 0) return NULL;
    return parse_mrml_element(&items[0]);
}

mf_mrml_element* mf_parse_mrml_file(const char* path) {
    char* source = read_file(path);
    mf_mrml_element* value;
    if (!source) return NULL;
    value = mf_parse_mrml_string(source);
    free(source);
    return value;
}

static void append_xml_escaped(string_builder* sb, const char* text) {
    size_t i;
    for (i = 0; text[i] != 0; ++i) {
        switch (text[i]) {
            case '&': sb_append(sb, "&amp;"); break;
            case '<': sb_append(sb, "&lt;"); break;
            case '>': sb_append(sb, "&gt;"); break;
            case '"': sb_append(sb, "&quot;"); break;
            default: { char ch[2] = {text[i], 0}; sb_append(sb, ch); } break;
        }
    }
}

static void write_mrml_element(string_builder* sb, const mf_mrml_element* element) {
    size_t i;
    sb_append(sb, "<");
    sb_append(sb, element->name);
    for (i = 0; i < element->attribute_count; ++i) {
        sb_append(sb, " ");
        sb_append(sb, element->keys[i]);
        sb_append(sb, "=\"");
        append_xml_escaped(sb, element->values[i]);
        sb_append(sb, "\"");
    }
    if (element->text_count == 0 && element->element_count == 0) {
        sb_append(sb, "/>");
        return;
    }
    sb_append(sb, ">");
    for (i = 0; i < element->text_count; ++i) append_xml_escaped(sb, element->text_children[i]);
    for (i = 0; i < element->element_count; ++i) write_mrml_element(sb, element->element_children[i]);
    sb_append(sb, "</");
    sb_append(sb, element->name);
    sb_append(sb, ">");
}

char* mf_write_mrml_string(const mf_mrml_element* element) {
    string_builder sb;
    sb_init(&sb);
    write_mrml_element(&sb, element);
    return sb.data;
}

mf_mrtd_document* mf_parse_mrtd_string(const char* source) {
    char* copy = mf_strdup(source);
    char* line = strtok(copy, "\r\n");
    mf_mrtd_document* document = (mf_mrtd_document*) calloc(1, sizeof(mf_mrtd_document));
    if (!line) {
        free(copy);
        return document;
    }
    while (line && (line[0] == 0 || line[0] == '#')) line = strtok(NULL, "\r\n");
    if (!line) {
        free(copy);
        return document;
    }
    {
        size_t header_count = 0, i;
        node* header = parse_nodes(line, &header_count);
        document->columns = (mf_mrtd_column*) calloc(header_count, sizeof(mf_mrtd_column));
        document->column_count = header_count;
        for (i = 0; i < header_count; ++i) {
            char* colon = strchr(header[i].text, ':');
            if (colon) {
                *colon = 0;
                document->columns[i].name = mf_strdup(header[i].text);
                document->columns[i].type = mf_strdup(colon + 1);
            } else {
                document->columns[i].name = mf_strdup(header[i].text);
                document->columns[i].type = NULL;
            }
        }
    }
    while ((line = strtok(NULL, "\r\n")) != NULL) {
        size_t i, count = 0;
        node* cells;
        while (*line && isspace((unsigned char) *line)) ++line;
        if (*line == 0 || *line == '#') continue;
        if (*line == '(') {
            size_t len = strlen(line);
            if (len > 1 && line[len - 1] == ')') {
                line[len - 1] = 0;
                line++;
            }
        }
        cells = parse_nodes(line, &count);
        if (nodes_contain_invalid(cells, count)) return NULL;
        document->rows = (mf_value***) realloc(document->rows, sizeof(mf_value**) * (document->row_count + 1));
        document->rows[document->row_count] = (mf_value**) calloc(document->column_count, sizeof(mf_value*));
        for (i = 0; i < document->column_count && i < count; ++i) {
            mf_value* scalar = convert_scalar(cells[i].text, cells[i].quoted, cells[i].suffix);
            const char* type = document->columns[i].type;
            if (type == NULL) {
                document->rows[document->row_count][i] = scalar;
                continue;
            }
            if (strcmp(type, "int") == 0 && scalar->kind != MF_INT) return NULL;
            if (strcmp(type, "float") == 0 && scalar->kind != MF_FLOAT && scalar->kind != MF_INT) return NULL;
            if (strcmp(type, "bool") == 0 && scalar->kind != MF_BOOL) return NULL;
            if (strcmp(type, "string") == 0 && scalar->kind != MF_STRING && scalar->kind != MF_TAGGED_STRING) {
                char buffer[64];
                const char* key = value_key(scalar, buffer, sizeof(buffer));
                mf_free_value(scalar);
                scalar = alloc_value(MF_STRING);
                scalar->as.string_value = mf_strdup(key);
            }
            document->rows[document->row_count][i] = scalar;
        }
        document->row_count++;
    }
    free(copy);
    return document;
}

mf_mrtd_document* mf_parse_mrtd_file(const char* path) {
    char* source = read_file(path);
    mf_mrtd_document* value;
    if (!source) return NULL;
    value = mf_parse_mrtd_string(source);
    free(source);
    return value;
}

char* mf_write_mrtd_string(const mf_mrtd_document* document) {
    size_t i, j;
    string_builder sb;
    sb_init(&sb);
    for (i = 0; i < document->column_count; ++i) {
        if (i) sb_append(&sb, " ");
        if (is_identifier_like(document->columns[i].name)) sb_append(&sb, document->columns[i].name);
        else append_quoted(&sb, document->columns[i].name);
        if (document->columns[i].type) {
            sb_append(&sb, ":");
            sb_append(&sb, document->columns[i].type);
        }
    }
    for (i = 0; i < document->row_count; ++i) {
        sb_append(&sb, "\n");
        for (j = 0; j < document->column_count; ++j) {
            if (j) sb_append(&sb, " ");
            write_mron_value(&sb, document->rows[i][j]);
        }
    }
    return sb.data;
}

void mf_free_value(mf_value* value) {
    size_t i;
    if (!value) return;
    if (value->kind == MF_STRING) free(value->as.string_value);
    if (value->kind == MF_TAGGED_STRING) {
        free(value->as.tagged_string.value);
        free(value->as.tagged_string.suffix);
    }
    if (value->kind == MF_ARRAY) {
        for (i = 0; i < value->as.array.count; ++i) mf_free_value(value->as.array.items[i]);
        free(value->as.array.items);
    }
    if (value->kind == MF_OBJECT) {
        for (i = 0; i < value->as.object.count; ++i) {
            free(value->as.object.items[i].key);
            mf_free_value(value->as.object.items[i].value);
        }
        free(value->as.object.items);
    }
    free(value);
}

void mf_free_mrml_element(mf_mrml_element* element) {
    size_t i;
    if (!element) return;
    free(element->name);
    for (i = 0; i < element->attribute_count; ++i) {
        free(element->keys[i]);
        free(element->values[i]);
    }
    free(element->keys);
    free(element->values);
    for (i = 0; i < element->text_count; ++i) free(element->text_children[i]);
    free(element->text_children);
    for (i = 0; i < element->element_count; ++i) mf_free_mrml_element(element->element_children[i]);
    free(element->element_children);
    free(element);
}

void mf_free_mrtd_document(mf_mrtd_document* document) {
    size_t i, j;
    if (!document) return;
    for (i = 0; i < document->column_count; ++i) {
        free(document->columns[i].name);
        free(document->columns[i].type);
    }
    free(document->columns);
    for (i = 0; i < document->row_count; ++i) {
        for (j = 0; j < document->column_count; ++j) mf_free_value(document->rows[i][j]);
        free(document->rows[i]);
    }
    free(document->rows);
    free(document);
}
