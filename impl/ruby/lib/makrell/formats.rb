module Makrell
  module Formats
    module_function

    Token = Struct.new(:kind, :text, :quoted, :suffix, keyword_init: true)

    def mbf_support_profile
      {
        implemented_levels: [0, 1],
        reserved_levels: [2],
        max_data_format_level: 1
      }
    end

    def tokenize_mbf_level0(source)
      tokens = []
      i = 0
      while i < source.length
        char = source[i]
        if whitespace_or_comma?(char)
          i += 1
          next
        end
        if source[i, 2] == "//"
          i = consume_line_comment(source, i + 2)
          next
        end
        if source[i, 2] == "/*"
          i = consume_block_comment(source, i + 2)
          next
        end
        if char == "#"
          i = consume_line_comment(source, i + 1)
          next
        end
        if negative_number_start?(source, i) || digit?(char)
          text, i = read_number(source, i)
          raw, suffix = split_numeric_literal_suffix(text)
          tokens << Token.new(kind: :number, text: text, quoted: false, suffix: suffix || "")
          next
        end
        if "{}[]()".include?(char)
          tokens << Token.new(kind: char.to_sym, text: char, quoted: false)
          i += 1
          next
        end
        if char == "="
          tokens << Token.new(kind: :"=", text: char, quoted: false)
          i += 1
          next
        end
        if char == "-"
          tokens << Token.new(kind: :operator, text: char, quoted: false)
          i += 1
          next
        end
        if char == '"'
          text, i = read_string(source, i + 1)
          suffix, i = read_suffix(source, i)
          tokens << Token.new(kind: :string, text: text, quoted: true, suffix: suffix)
          next
        end
        if identifier_start?(char)
          text, i = read_identifier(source, i)
          tokens << Token.new(kind: :identifier, text: text, quoted: false)
          next
        end

        raise "Unexpected token: #{read_unexpected(source, i)}"
      end
      tokens
    end

    def parse_mbf_level1_nodes(source)
      tokens = tokenize_mbf_level0(source)
      index = 0
      nodes = []
      while index < tokens.length
        node, index = parse_node(tokens, index)
        nodes << node
      end
      nodes
    end

    def parse_mbf_level2_nodes(_source)
      raise "MBF level 2 is reserved in makrell-formats for Ruby but not implemented yet"
    end

    def tokenize_mbf(source)
      tokenize_mbf_level0(source)
    end

    def parse_mbf_nodes(source)
      parse_mbf_level1_nodes(source)
    end

    def split_numeric_literal_suffix(text)
      text.length.downto(1) do |boundary|
        value = text[0...boundary]
        suffix = text[boundary..] || ""
        next if !suffix.empty? && suffix !~ /\A[A-Za-z_][A-Za-z0-9_]*\z/
        return [value, suffix] if value.match?(/\A-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\z/)
      end
      nil
    end

    def apply_basic_suffix_profile(kind, value, suffix)
      suffix ||= ""
      if kind == :string || kind == "string"
        return value if suffix.empty?
        return { value: value, suffix: suffix, __basic_suffix_profile: true } if suffix == "dt"
        return Integer(value, 2) if suffix == "bin"
        return Integer(value, 8) if suffix == "oct"
        return Integer(value, 16) if suffix == "hex"
        raise "Unsupported basic suffix profile string suffix '#{suffix}'."
      end

      raise "Invalid numeric literal '#{value}'." unless value.match?(/\A-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\z/)
      base = value.include?(".") || value.include?("e") || value.include?("E") ? value.to_f : value.to_i
      return base if suffix.empty?
      return base * 1e3 if suffix == "k"
      return base * 1e6 if suffix == "M"
      return base * 1e9 if suffix == "G"
      return base * 1e12 if suffix == "T"
      return base * 1e15 if suffix == "P"
      return base * 1e18 if suffix == "E"
      return base * Math::E if suffix == "e"
      return base * (Math::PI * 2) if suffix == "tau"
      return base * (Math::PI / 180) if suffix == "deg"
      return base * Math::PI if suffix == "pi"
      raise "Unsupported basic suffix profile numeric suffix '#{suffix}'."
    end

    def parse_mron_string(source)
      nodes = parse_mbf_level1_nodes(source)
      return nil if nodes.empty?
      return mron_node(nodes.first) if nodes.length == 1

      raise "Illegal number (#{nodes.length}) of root level expressions for MRON object." if nodes.length.odd?

      mron_pairs(nodes)
    end

    def parse_mron_file(path)
      parse_mron_string(File.read(path, encoding: "UTF-8"))
    end

    def write_mron_string(value)
      case value
      when nil
        "null"
      when true
        "true"
      when false
        "false"
      when Numeric
        value.to_s
      when Hash
        if value[:__basic_suffix_profile]
          quote_if_needed(value[:value].to_s) + value[:suffix].to_s
        else
          inner = value.map { |key, item| "#{quote_if_needed(key.to_s)} #{write_mron_string(item)}" }.join(" ")
          "{ #{inner} }"
        end
      when Array
        "[" + value.map { |item| write_mron_string(item) }.join(" ") + "]"
      else
        quote_if_needed(value.to_s)
      end
    end

    def parse_mrml_string(source)
      nodes = parse_mbf_level1_nodes(source)
      raise "MRML expects exactly one root element." unless nodes.length == 1 && nodes.first[:kind] == :brace

      mrml_element(nodes.first)
    end

    def parse_mrml_file(path)
      parse_mrml_string(File.read(path, encoding: "UTF-8"))
    end

    def write_mrml_string(element)
      attrs = element[:attributes].keys.sort.map do |key|
        %( #{key}="#{xml_escape(element[:attributes][key].to_s)}")
      end.join
      children = element[:children].map do |child|
        child.is_a?(Hash) ? write_mrml_string(child) : xml_escape(child.to_s)
      end.join
      return "<#{element[:name]}#{attrs}/>" if children.empty?

      "<#{element[:name]}#{attrs}>#{children}</#{element[:name]}>"
    end

    def parse_mrtd_string(source)
      lines = split_mrtd_lines(source)
      return { columns: [], rows: [], records: [] } if lines.empty?

      header_nodes = parse_mbf_level1_nodes(lines.first)
      columns = header_nodes.map do |node|
        name, type = node[:text].split(":", 2)
        { name: name, type: type }
      end

      rows = []
      records = []
      lines.drop(1).each do |line|
        trimmed = line.start_with?("(") && line.end_with?(")") ? line[1..-2] : line
        cells = parse_mbf_level1_nodes(trimmed)
        raise "MRTD row width mismatch" unless cells.length == columns.length

        row = []
        record = {}
        columns.each_with_index do |column, index|
          value = coerce_mrtd(scalar(cells[index][:text], cells[index][:quoted], cells[index][:suffix]), column[:type])
          row << value
          record[column[:name]] = value
        end
        rows << row
        records << record
      end

      { columns: columns, rows: rows, records: records }
    end

    def parse_mrtd_file(path)
      parse_mrtd_string(File.read(path, encoding: "UTF-8"))
    end

    def write_mrtd_string(doc)
      lines = []
      lines << doc[:columns].map { |column|
        column[:type] ? "#{quote_if_needed(column[:name])}:#{column[:type]}" : quote_if_needed(column[:name])
      }.join(" ")
      doc[:rows].each do |row|
        lines << row.map { |value| mrtd_cell(value) }.join(" ")
      end
      lines.join("\n")
    end

    def parse_node(tokens, index)
      token = tokens[index]
      raise "Unexpected end of input" if token.nil?

      if [:identifier, :number, :string, :"="].include?(token.kind)
        return [{ kind: :scalar, text: token.text, quoted: token.quoted, suffix: token.suffix || "" }, index + 1]
      end
      raise "Unexpected token: #{token.text}" if token.kind == :operator

      if token.kind == :"{"
        children, next_index = parse_group(tokens, index + 1, :"}")
        return [{ kind: :brace, children: children }, next_index]
      end
      if token.kind == :"["
        children, next_index = parse_group(tokens, index + 1, :"]")
        return [{ kind: :square, children: children }, next_index]
      end
      if token.kind == :"("
        children, next_index = parse_group(tokens, index + 1, :")")
        return [{ kind: :paren, children: children }, next_index]
      end

      raise "Unexpected token: #{token.text}"
    end

    def parse_group(tokens, index, closing)
      items = []
      while index < tokens.length && tokens[index].kind != closing
        item, index = parse_node(tokens, index)
        items << item
      end
      raise "Unclosed group" if index >= tokens.length

      [items, index + 1]
    end

    def mron_node(node)
      case node[:kind]
      when :scalar then scalar(node[:text], node[:quoted], node[:suffix])
      when :square then node[:children].map { |child| mron_node(child) }
      when :brace then mron_pairs(node[:children])
      else
        raise "Unsupported MRON node kind"
      end
    end

    def mron_pairs(nodes)
      raise "Odd pair count in MRON object." if nodes.length.odd?

      out = {}
      nodes.each_slice(2) do |key_node, value_node|
        out[mron_node(key_node).to_s] = mron_node(value_node)
      end
      out
    end

    def mrml_element(node)
      children = node[:children]
      raise "Invalid MRML element" if children.empty? || children.first[:kind] != :scalar

      element = { name: children.first[:text], attributes: {}, children: [] }
      index = 1
      if index < children.length && children[index][:kind] == :square
        attrs = children[index][:children]
        cursor = 0
        while cursor < attrs.length
          key = attrs[cursor][:text]
          cursor += 1
          cursor += 1 if cursor < attrs.length && attrs[cursor][:kind] == :scalar && attrs[cursor][:text] == "="
          element[:attributes][key] = attrs[cursor][:text]
          cursor += 1
        end
        index += 1
      end

      while index < children.length
        child = children[index]
        element[:children] << (child[:kind] == :brace ? mrml_element(child) : child[:text])
        index += 1
      end
      element
    end

    def scalar(text, quoted, suffix = "")
      return apply_basic_suffix_profile(:string, text, suffix) if quoted
      return nil if text == "null"
      return true if text == "true"
      return false if text == "false"
      numeric_literal = split_numeric_literal_suffix(text)
      return apply_basic_suffix_profile(:number, numeric_literal[0], numeric_literal[1]) if numeric_literal

      text
    end

    def coerce_mrtd(value, type)
      return value if type.nil?
      case type
      when "string"
        value.is_a?(Hash) && value[:__basic_suffix_profile] ? value : (value.nil? ? "null" : value.to_s)
      when "int"
        raise "MRTD value does not match int field" unless value.is_a?(Integer)
        value
      when "float"
        raise "MRTD value does not match float field" unless value.is_a?(Numeric)
        value.to_f
      when "bool"
        raise "MRTD value does not match bool field" unless value == true || value == false
        value
      else
        raise "Unsupported MRTD field type: #{type}"
      end
    end

    def mrtd_cell(value)
      case value
      when true then "true"
      when false then "false"
      when Numeric then value.to_s
      when Hash
        if value[:__basic_suffix_profile]
          quote_if_needed(value[:value].to_s) + value[:suffix].to_s
        else
          quote_if_needed(value.to_s)
        end
      else quote_if_needed(value.to_s)
      end
    end

    def quote_if_needed(text)
      return text if text.match?(/\A[A-Za-z_$][A-Za-z0-9_$]*\z/)

      '"' + text.gsub("\\", "\\\\\\\\").gsub('"', '\"') + '"'
    end

    def xml_escape(text)
      text
        .gsub("&", "&amp;")
        .gsub("<", "&lt;")
        .gsub(">", "&gt;")
        .gsub('"', "&quot;")
    end

    def whitespace_or_comma?(char)
      [" ", "\t", "\r", "\n", ","].include?(char)
    end

    def consume_line_comment(source, index)
      index += 1 while index < source.length && source[index] != "\n"
      index
    end

    def consume_block_comment(source, index)
      while index + 1 < source.length
        return index + 2 if source[index, 2] == "*/"
        index += 1
      end
      raise "Unterminated block comment"
    end

    def negative_number_start?(source, index)
      source[index] == "-" && index + 1 < source.length && digit?(source[index + 1])
    end

    def digit?(char)
      !char.nil? && char.match?(/\d/)
    end

    def read_number(source, index)
      finish = index
      finish += 1 if source[finish] == "-"
      finish += 1 while finish < source.length && digit?(source[finish])
      if finish < source.length && source[finish] == "."
        finish += 1
        finish += 1 while finish < source.length && digit?(source[finish])
      end
      finish += 1 while finish < source.length && source[finish].match?(/[A-Za-z0-9_]/)
      [source[index...finish], finish]
    end

    def read_string(source, index)
      result = +""
      while index < source.length
        char = source[index]
        if char == "\\"
          index += 1
          raise "Unterminated string" if index >= source.length
          result << case source[index]
                    when "n" then "\n"
                    when "r" then "\r"
                    when "t" then "\t"
                    when '"', "\\" then source[index]
                    else source[index]
                    end
          index += 1
          next
        end
        return [result, index + 1] if char == '"'
        result << char
        index += 1
      end
      raise "Unterminated string"
    end

    def read_suffix(source, index)
      finish = index
      finish += 1 while finish < source.length && source[finish].match?(/[A-Za-z0-9_]/)
      [source[index...finish], finish]
    end

    def identifier_start?(char)
      !char.nil? && char.match?(/[A-Za-z_$]/)
    end

    def identifier_part?(char)
      !char.nil? && char.match?(/[A-Za-z0-9_$:]/)
    end

    def read_identifier(source, index)
      finish = index
      finish += 1 while finish < source.length && identifier_part?(source[finish])
      [source[index...finish], finish]
    end

    def read_unexpected(source, index)
      finish = index
      finish += 1 while finish < source.length && !whitespace_or_comma?(source[finish]) && !"{}[]()".include?(source[finish])
      source[index...finish]
    end

    def split_mrtd_lines(source)
      lines = []
      buffer = +""
      i = 0
      in_string = false
      escaping = false
      in_line_comment = false
      in_block_comment = false

      while i < source.length
        char = source[i]
        if in_line_comment
          if char == "\n"
            in_line_comment = false
            trimmed = buffer.strip
            lines << trimmed unless trimmed.empty?
            buffer = +""
          end
          i += 1
          next
        end
        if in_block_comment
          if source[i, 2] == "*/"
            in_block_comment = false
            i += 2
          else
            i += 1
          end
          next
        end
        if in_string
          buffer << char
          if escaping
            escaping = false
          elsif char == "\\"
            escaping = true
          elsif char == '"'
            in_string = false
          end
          i += 1
          next
        end

        if char == '"'
          in_string = true
          buffer << char
          i += 1
          next
        end
        if source[i, 2] == "//"
          in_line_comment = true
          i += 2
          next
        end
        if source[i, 2] == "/*"
          in_block_comment = true
          i += 2
          next
        end
        if char == "#"
          in_line_comment = true
          i += 1
          next
        end
        if char == "\r"
          i += 1
          next
        end
        if char == "\n"
          trimmed = buffer.strip
          lines << trimmed unless trimmed.empty?
          buffer = +""
          i += 1
          next
        end

        buffer << char
        i += 1
      end

      raise "Unterminated block comment" if in_block_comment

      trimmed = buffer.strip
      lines << trimmed unless trimmed.empty?
      lines
    end
  end
end
