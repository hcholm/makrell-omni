local M = {}

local function token(kind, text, quoted)
  return { kind = kind, text = text, quoted = quoted or false }
end

function M.mbf_support_profile()
  return {
    implemented_levels = { 0, 1 },
    reserved_levels = { 2 },
    max_data_format_level = 1,
  }
end

local function is_space_or_comma(char)
  return char == " " or char == "\t" or char == "\r" or char == "\n" or char == ","
end

local function is_digit(char)
  return char and char:match("%d") ~= nil
end

local function is_identifier_start(char)
  return char and char:match("[A-Za-z_$]") ~= nil
end

local function is_identifier_part(char)
  return char and char:match("[A-Za-z0-9_$:]") ~= nil
end

local function consume_line_comment(source, index)
  while index <= #source and source:sub(index, index) ~= "\n" do
    index = index + 1
  end
  return index
end

local function consume_block_comment(source, index)
  while index < #source do
    if source:sub(index, index + 1) == "*/" then
      return index + 2
    end
    index = index + 1
  end
  error("Unterminated block comment")
end

local function read_number(source, index)
  local finish = index
  if source:sub(finish, finish) == "-" then
    finish = finish + 1
  end
  while finish <= #source and is_digit(source:sub(finish, finish)) do
    finish = finish + 1
  end
  if finish <= #source and source:sub(finish, finish) == "." then
    finish = finish + 1
    while finish <= #source and is_digit(source:sub(finish, finish)) do
      finish = finish + 1
    end
  end
  return source:sub(index, finish - 1), finish
end

local function read_string(source, index)
  local out = {}
  while index <= #source do
    local char = source:sub(index, index)
    if char == "\\" then
      index = index + 1
      if index > #source then
        error("Unterminated string")
      end
      local escaped = source:sub(index, index)
      if escaped == "n" then table.insert(out, "\n")
      elseif escaped == "r" then table.insert(out, "\r")
      elseif escaped == "t" then table.insert(out, "\t")
      else table.insert(out, escaped)
      end
      index = index + 1
    elseif char == '"' then
      return table.concat(out), index + 1
    else
      table.insert(out, char)
      index = index + 1
    end
  end
  error("Unterminated string")
end

local function read_identifier(source, index)
  local finish = index
  while finish <= #source and is_identifier_part(source:sub(finish, finish)) do
    finish = finish + 1
  end
  return source:sub(index, finish - 1), finish
end

local function read_unexpected(source, index)
  local finish = index
  while finish <= #source do
    local char = source:sub(finish, finish)
    if is_space_or_comma(char) or string.find("{}[]()", char, 1, true) then
      break
    end
    finish = finish + 1
  end
  return source:sub(index, finish - 1)
end

function M.tokenize_mbf_level0(source)
  local tokens = {}
  local index = 1
  while index <= #source do
    local char = source:sub(index, index)
    local next_char = source:sub(index + 1, index + 1)
    if is_space_or_comma(char) then
      index = index + 1
    elseif char == "/" and next_char == "/" then
      index = consume_line_comment(source, index + 2)
    elseif char == "/" and next_char == "*" then
      index = consume_block_comment(source, index + 2)
    elseif char == "#" then
      index = consume_line_comment(source, index + 1)
    elseif (char == "-" and is_digit(next_char)) or is_digit(char) then
      local text
      text, index = read_number(source, index)
      table.insert(tokens, token("number", text, false))
    elseif string.find("{}[]()", char, 1, true) then
      table.insert(tokens, token(char, char, false))
      index = index + 1
    elseif char == "=" then
      table.insert(tokens, token("=", char, false))
      index = index + 1
    elseif char == "-" then
      table.insert(tokens, token("operator", char, false))
      index = index + 1
    elseif char == '"' then
      local text
      text, index = read_string(source, index + 1)
      table.insert(tokens, token("string", text, true))
    elseif is_identifier_start(char) then
      local text
      text, index = read_identifier(source, index)
      table.insert(tokens, token("identifier", text, false))
    else
      error("Unexpected token: " .. read_unexpected(source, index))
    end
  end
  return tokens
end

local function split_mrtd_lines(source)
  local lines = {}
  local buffer = {}
  local index = 1
  local in_string = false
  local escaping = false
  local in_line_comment = false
  local in_block_comment = false

  while index <= #source do
    local char = source:sub(index, index)
    local next_char = source:sub(index + 1, index + 1)
    if in_line_comment then
      if char == "\n" then
        in_line_comment = false
        local trimmed = table.concat(buffer):match("^%s*(.-)%s*$")
        if trimmed ~= "" then
          table.insert(lines, trimmed)
        end
        buffer = {}
      end
      index = index + 1
    elseif in_block_comment then
      if char == "*" and next_char == "/" then
        in_block_comment = false
        index = index + 2
      else
        index = index + 1
      end
    elseif in_string then
      table.insert(buffer, char)
      if escaping then
        escaping = false
      elseif char == "\\" then
        escaping = true
      elseif char == '"' then
        in_string = false
      end
      index = index + 1
    elseif char == '"' then
      in_string = true
      table.insert(buffer, char)
      index = index + 1
    elseif char == "/" and next_char == "/" then
      in_line_comment = true
      index = index + 2
    elseif char == "/" and next_char == "*" then
      in_block_comment = true
      index = index + 2
    elseif char == "#" then
      in_line_comment = true
      index = index + 1
    elseif char == "\r" then
      index = index + 1
    elseif char == "\n" then
      local trimmed = table.concat(buffer):match("^%s*(.-)%s*$")
      if trimmed ~= "" then
        table.insert(lines, trimmed)
      end
      buffer = {}
      index = index + 1
    else
      table.insert(buffer, char)
      index = index + 1
    end
  end

  if in_block_comment then
    error("Unterminated block comment")
  end
  local trimmed = table.concat(buffer):match("^%s*(.-)%s*$")
  if trimmed ~= "" then
    table.insert(lines, trimmed)
  end
  return lines
end

local parse_node

local function parse_group(tokens, index, closing)
  local items = {}
  while index <= #tokens and tokens[index].kind ~= closing do
    local item
    item, index = parse_node(tokens, index)
    table.insert(items, item)
  end
  if index > #tokens then
    error("Unclosed group")
  end
  return items, index + 1
end

parse_node = function(tokens, index)
  local token_value = tokens[index]
  if not token_value then
    error("Unexpected end of input")
  end
  if token_value.kind == "identifier" or token_value.kind == "number" or token_value.kind == "string" or token_value.kind == "=" then
    return { kind = "scalar", text = token_value.text, quoted = token_value.quoted }, index + 1
  end
  if token_value.kind == "operator" then
    error("Unexpected token: " .. token_value.text)
  end
  if token_value.kind == "{" then
    local children, next_index = parse_group(tokens, index + 1, "}")
    return { kind = "brace", children = children }, next_index
  end
  if token_value.kind == "[" then
    local children, next_index = parse_group(tokens, index + 1, "]")
    return { kind = "square", children = children }, next_index
  end
  if token_value.kind == "(" then
    local children, next_index = parse_group(tokens, index + 1, ")")
    return { kind = "paren", children = children }, next_index
  end
  error("Unexpected token: " .. token_value.text)
end

function M.parse_mbf_level1_nodes(source)
  local tokens = M.tokenize_mbf_level0(source)
  local nodes = {}
  local index = 1
  while index <= #tokens do
    local node
    node, index = parse_node(tokens, index)
    table.insert(nodes, node)
  end
  return nodes
end

function M.parse_mbf_level2_nodes(_source)
  error("MBF level 2 is reserved in makrell-formats for Lua but not implemented yet")
end

function M.tokenize_mbf(source)
  return M.tokenize_mbf_level0(source)
end

function M.parse_mbf_nodes(source)
  return M.parse_mbf_level1_nodes(source)
end

local function scalar(text, quoted)
  if quoted then
    return text
  end
  if text == "null" then
    return nil
  end
  if text == "true" then
    return true
  end
  if text == "false" then
    return false
  end
  if text:match("^%-?%d+$") then
    return tonumber(text)
  end
  if text:match("^%-?%d+%.%d+$") then
    return tonumber(text)
  end
  return text
end

local function quote_if_needed(text)
  if text:match("^[A-Za-z_$][A-Za-z0-9_$]*$") then
    return text
  end
  text = text:gsub("\\", "\\\\"):gsub('"', '\\"')
  return '"' .. text .. '"'
end

local function xml_escape(text)
  local out = text:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;")
  return out
end

local function mron_node(node)
  if node.kind == "scalar" then
    return scalar(node.text, node.quoted)
  end
  if node.kind == "square" then
    local out = {}
    for _, child in ipairs(node.children) do
      table.insert(out, mron_node(child))
    end
    return out
  end
  if node.kind == "brace" then
    local out = {}
    if #node.children % 2 ~= 0 then
      error("Odd pair count in MRON object.")
    end
    for i = 1, #node.children, 2 do
      out[tostring(mron_node(node.children[i]))] = mron_node(node.children[i + 1])
    end
    return out
  end
  error("Unsupported MRON node kind")
end

function M.parse_mron_string(source)
  local nodes = M.parse_mbf_level1_nodes(source)
  if #nodes == 0 then
    return nil
  end
  if #nodes == 1 then
    return mron_node(nodes[1])
  end
  if #nodes % 2 ~= 0 then
    error("Illegal number (" .. tostring(#nodes) .. ") of root level expressions for MRON object.")
  end
  return mron_node({ kind = "brace", children = nodes })
end

function M.parse_mron_file(path)
  local file = assert(io.open(path, "r"))
  local content = file:read("*a")
  file:close()
  return M.parse_mron_string(content)
end

function M.write_mron_string(value)
  if value == nil then
    return "null"
  end
  if type(value) == "boolean" then
    return value and "true" or "false"
  end
  if type(value) == "number" then
    return tostring(value)
  end
  if type(value) == "string" then
    return quote_if_needed(value)
  end
  local is_array = (#value > 0)
  if is_array then
    local parts = {}
    for _, item in ipairs(value) do
      table.insert(parts, M.write_mron_string(item))
    end
    return "[" .. table.concat(parts, " ") .. "]"
  end
  local parts = {}
  for key, item in pairs(value) do
    table.insert(parts, quote_if_needed(tostring(key)) .. " " .. M.write_mron_string(item))
  end
  table.sort(parts)
  return "{ " .. table.concat(parts, " ") .. " }"
end

local function mrml_element(node)
  if #node.children == 0 or node.children[1].kind ~= "scalar" then
    error("Invalid MRML element")
  end
  local element = { name = node.children[1].text, attributes = {}, children = {} }
  local index = 2
  if index <= #node.children and node.children[index].kind == "square" then
    local attrs = node.children[index].children
    local cursor = 1
    while cursor <= #attrs do
      local key = attrs[cursor].text
      cursor = cursor + 1
      if cursor <= #attrs and attrs[cursor].kind == "scalar" and attrs[cursor].text == "=" then
        cursor = cursor + 1
      end
      element.attributes[key] = attrs[cursor].text
      cursor = cursor + 1
    end
    index = index + 1
  end
  while index <= #node.children do
    local child = node.children[index]
    if child.kind == "brace" then
      table.insert(element.children, mrml_element(child))
    else
      table.insert(element.children, child.text)
    end
    index = index + 1
  end
  return element
end

function M.parse_mrml_string(source)
  local nodes = M.parse_mbf_level1_nodes(source)
  if #nodes ~= 1 or nodes[1].kind ~= "brace" then
    error("MRML expects exactly one root element.")
  end
  return mrml_element(nodes[1])
end

function M.parse_mrml_file(path)
  local file = assert(io.open(path, "r"))
  local content = file:read("*a")
  file:close()
  return M.parse_mrml_string(content)
end

function M.write_mrml_string(element)
  local attr_keys = {}
  for key in pairs(element.attributes) do
    table.insert(attr_keys, key)
  end
  table.sort(attr_keys)
  local attrs = {}
  for _, key in ipairs(attr_keys) do
    table.insert(attrs, " " .. key .. '="' .. xml_escape(tostring(element.attributes[key])) .. '"')
  end
  local children = {}
  for _, child in ipairs(element.children) do
    if type(child) == "table" and child.name then
      table.insert(children, M.write_mrml_string(child))
    else
      table.insert(children, xml_escape(tostring(child)))
    end
  end
  local child_text = table.concat(children)
  if child_text == "" then
    return "<" .. element.name .. table.concat(attrs) .. "/>"
  end
  return "<" .. element.name .. table.concat(attrs) .. ">" .. child_text .. "</" .. element.name .. ">"
end

local function coerce_mrtd(value, field_type)
  if field_type == nil or field_type == "" then
    field_type = "string"
  end
  if field_type == "string" then
    return value == nil and "null" or tostring(value)
  end
  if field_type == "int" then
    if type(value) ~= "number" or math.type and math.type(value) ~= "integer" and value % 1 ~= 0 then
      error("MRTD value does not match int field")
    end
    return math.tointeger and math.tointeger(value) or value
  end
  if field_type == "float" then
    if type(value) ~= "number" then
      error("MRTD value does not match float field")
    end
    return value
  end
  if field_type == "bool" then
    if type(value) ~= "boolean" then
      error("MRTD value does not match bool field")
    end
    return value
  end
  error("Unsupported MRTD field type: " .. tostring(field_type))
end

local function mrtd_cell(value)
  if type(value) == "boolean" then
    return value and "true" or "false"
  end
  if type(value) == "number" then
    return tostring(value)
  end
  return quote_if_needed(tostring(value))
end

function M.parse_mrtd_string(source)
  local lines = split_mrtd_lines(source)
  if #lines == 0 then
    return { columns = {}, rows = {}, records = {} }
  end
  local columns = {}
  for _, node in ipairs(M.parse_mbf_level1_nodes(lines[1])) do
    local name, field_type = node.text:match("^(.-):(.*)$")
    table.insert(columns, { name = name or node.text, type = (field_type ~= nil and field_type ~= "") and field_type or nil })
  end
  local rows, records = {}, {}
  for line_index = 2, #lines do
    local body = lines[line_index]
    if body:sub(1, 1) == "(" and body:sub(-1) == ")" then
      body = body:sub(2, -2)
    end
    local cells = M.parse_mbf_level1_nodes(body)
    if #cells ~= #columns then
      error("MRTD row width mismatch")
    end
    local row, record = {}, {}
    for i, column in ipairs(columns) do
      local value = coerce_mrtd(scalar(cells[i].text, cells[i].quoted), column.type)
      table.insert(row, value)
      record[column.name] = value
    end
    table.insert(rows, row)
    table.insert(records, record)
  end
  return { columns = columns, rows = rows, records = records }
end

function M.parse_mrtd_file(path)
  local file = assert(io.open(path, "r"))
  local content = file:read("*a")
  file:close()
  return M.parse_mrtd_string(content)
end

function M.write_mrtd_string(doc)
  local lines = {}
  local header = {}
  for _, column in ipairs(doc.columns) do
    table.insert(header, quote_if_needed(column.name) .. (column.type and (":" .. column.type) or ""))
  end
  table.insert(lines, table.concat(header, " "))
  for _, row in ipairs(doc.rows) do
    local cells = {}
    for _, value in ipairs(row) do
      table.insert(cells, mrtd_cell(value))
    end
    table.insert(lines, table.concat(cells, " "))
  end
  return table.concat(lines, "\n")
end

return M
