package Makrell::Formats;

use strict;
use warnings;
use Exporter 'import';

our @EXPORT_OK = qw(
  mbf_support_profile
  tokenize_mbf_level0
  parse_mbf_level1_nodes
  parse_mbf_level2_nodes
  tokenize_mbf
  parse_mbf_nodes
  apply_basic_suffix_profile
  split_numeric_literal_suffix
  parse_mron_string parse_mron_file write_mron_string
  parse_mrml_string parse_mrml_file write_mrml_string
  parse_mrtd_string parse_mrtd_file write_mrtd_string
);

sub mbf_support_profile {
    return {
        implemented_levels => [0, 1],
        reserved_levels => [2],
        max_data_format_level => 1,
    };
}

sub tokenize_mbf_level0 {
    my ($source) = @_;
    my @tokens;
    pos($source) = 0;
    while (pos($source) < length($source)) {
        if ($source =~ /\G(?:\s+|,)/gc) { next; }
        if ($source =~ /\G\#.*?(?:\n|\z)/gc) { next; }
        if ($source =~ /\G\/\/.*?(?:\n|\z)/gc) { next; }
        if ($source =~ /\G\/\*.*?\*\//gcs) { next; }
        if ($source =~ /\G(-?\d+(?:\.\d+)?(?:[A-Za-z_][A-Za-z0-9_]*)?)/gc) {
            my $text = $1;
            my ($raw, $suffix) = split_numeric_literal_suffix($text);
            push @tokens, { kind => 'number', text => $text, quoted => 0, suffix => ($suffix // '') };
            next;
        }
        if ($source =~ /\G([\{\}\[\]\(\)])/gc) {
            push @tokens, { kind => $1, text => $1, quoted => 0 };
            next;
        }
        if ($source =~ /\G(=)/gc) {
            push @tokens, { kind => '=', text => '=', quoted => 0 };
            next;
        }
        if ($source =~ /\G(-)/gc) {
            push @tokens, { kind => 'operator', text => '-', quoted => 0 };
            next;
        }
        if ($source =~ /\G"((?:\\.|[^"])*)"([A-Za-z0-9_]*)/gc) {
            my $text = $1;
            my $suffix = $2 // '';
            $text =~ s/\\n/\n/g;
            $text =~ s/\\r/\r/g;
            $text =~ s/\\t/\t/g;
            $text =~ s/\\"/"/g;
            $text =~ s/\\\\/\\/g;
            push @tokens, { kind => 'string', text => $text, quoted => 1, suffix => $suffix };
            next;
        }
        if ($source =~ /\G([A-Za-z_\$][A-Za-z0-9_\$:]*)(?!-)/gc) {
            push @tokens, { kind => 'identifier', text => $1, quoted => 0 };
            next;
        }
        if ($source =~ /\G([^\s]+)/gc) {
            die "Unexpected token: $1";
        }
    }
    return \@tokens;
}

sub parse_mbf_level1_nodes {
    my ($source) = @_;
    my $tokens = tokenize_mbf_level0($source);
    my $index = 0;
    my @nodes;
    while ($index < @$tokens) {
        push @nodes, _parse_node($tokens, \$index);
    }
    return \@nodes;
}

sub parse_mbf_level2_nodes {
    die "MBF level 2 is reserved in Makrell::Formats but not implemented yet";
}

sub tokenize_mbf { return tokenize_mbf_level0(@_); }
sub parse_mbf_nodes { return parse_mbf_level1_nodes(@_); }

sub split_numeric_literal_suffix {
    my ($text) = @_;
    for (my $boundary = length($text); $boundary > 0; $boundary--) {
        my $value = substr($text, 0, $boundary);
        my $suffix = substr($text, $boundary);
        next if $suffix ne '' && $suffix !~ /^[A-Za-z_][A-Za-z0-9_]*$/;
        return ($value, $suffix) if $value =~ /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
    }
    return;
}

sub apply_basic_suffix_profile {
    my ($kind, $value, $suffix) = @_;
    $suffix //= '';
    if ($kind eq 'string') {
        return $value if $suffix eq '';
        return { value => $value, suffix => $suffix, __basic_suffix_profile => 1 } if $suffix eq 'dt';
        return oct("0b$value") if $suffix eq 'bin';
        return oct("0$value") if $suffix eq 'oct';
        return hex($value) if $suffix eq 'hex';
        die "Unsupported basic suffix profile string suffix '$suffix'.";
    }

    die "Invalid numeric literal '$value'." unless defined $value && $value =~ /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
    my $base = 0 + $value;
    return $base if $suffix eq '';
    return $base * 1e3 if $suffix eq 'k';
    return $base * 1e6 if $suffix eq 'M';
    return $base * 1e9 if $suffix eq 'G';
    return $base * 1e12 if $suffix eq 'T';
    return $base * 1e15 if $suffix eq 'P';
    return $base * 1e18 if $suffix eq 'E';
    return $base * exp(1) if $suffix eq 'e';
    return $base * (atan2(0, -1) * 2) if $suffix eq 'tau';
    return $base * (atan2(0, -1) / 180) if $suffix eq 'deg';
    return $base * atan2(0, -1) if $suffix eq 'pi';
    die "Unsupported basic suffix profile numeric suffix '$suffix'.";
}

sub _parse_node {
    my ($tokens, $index_ref) = @_;
    my $token = $tokens->[$$index_ref++] // die "Unexpected end of input";
    return { kind => 'scalar', text => $token->{text}, quoted => $token->{quoted}, suffix => ($token->{suffix} // '') }
      if $token->{kind} eq 'identifier' || $token->{kind} eq 'number' || $token->{kind} eq 'string' || $token->{kind} eq '=';
    die "Unexpected token: $token->{text}" if $token->{kind} eq 'operator';
    return { kind => 'brace', children => _parse_group($tokens, $index_ref, '}') } if $token->{kind} eq '{';
    return { kind => 'square', children => _parse_group($tokens, $index_ref, ']') } if $token->{kind} eq '[';
    return { kind => 'paren', children => _parse_group($tokens, $index_ref, ')') } if $token->{kind} eq '(';
    die "Unexpected token: $token->{text}";
}

sub _parse_group {
    my ($tokens, $index_ref, $closing) = @_;
    my @items;
    while ($$index_ref < @$tokens && $tokens->[$$index_ref]{kind} ne $closing) {
        push @items, _parse_node($tokens, $index_ref);
    }
    die "Unclosed group" if $$index_ref >= @$tokens;
    $$index_ref++;
    return \@items;
}

sub parse_mron_string {
    my ($source) = @_;
    my $nodes = parse_mbf_nodes($source);
    return undef if !@$nodes;
    return _mron_node($nodes->[0]) if @$nodes == 1;
    die "Illegal number (" . scalar(@$nodes) . ") of root level expressions for MRON object." if @$nodes % 2;
    return _mron_pairs($nodes);
}

sub parse_mron_file {
    my ($path) = @_;
    open my $fh, '<:encoding(UTF-8)', $path or die "Could not read MRON file: $path";
    local $/;
    return parse_mron_string(<$fh>);
}

sub _mron_node {
    my ($node) = @_;
    return _scalar($node->{text}, $node->{quoted}, $node->{suffix}) if $node->{kind} eq 'scalar';
    return [ map { _mron_node($_) } @{$node->{children}} ] if $node->{kind} eq 'square';
    return _mron_pairs($node->{children}) if $node->{kind} eq 'brace';
    die "Unsupported MRON node kind";
}

sub _mron_pairs {
    my ($nodes) = @_;
    die "Odd pair count in MRON object." if @$nodes % 2;
    my %out;
    for (my $i = 0; $i < @$nodes; $i += 2) {
        $out{ _key(_mron_node($nodes->[$i])) } = _mron_node($nodes->[$i + 1]);
    }
    return \%out;
}

sub parse_mrml_string {
    my ($source) = @_;
    my $nodes = parse_mbf_nodes($source);
    die "MRML expects exactly one root element." unless @$nodes == 1 && $nodes->[0]{kind} eq 'brace';
    return _mrml_element($nodes->[0]);
}

sub parse_mrml_file {
    my ($path) = @_;
    open my $fh, '<:encoding(UTF-8)', $path or die "Could not read MRML file: $path";
    local $/;
    return parse_mrml_string(<$fh>);
}

sub _mrml_element {
    my ($node) = @_;
    my $children = $node->{children};
    die "Invalid MRML element" unless @$children && $children->[0]{kind} eq 'scalar';
    my $element = { name => $children->[0]{text}, attributes => {}, children => [] };
    my $index = 1;
    if ($index < @$children && $children->[$index]{kind} eq 'square') {
        my $attrs = $children->[$index]{children};
        for (my $i = 0; $i < @$attrs;) {
            my $key = $attrs->[$i++]{text};
            $i++ if $i < @$attrs && $attrs->[$i]{kind} eq 'scalar' && $attrs->[$i]{text} eq '=';
            $element->{attributes}{$key} = $attrs->[$i++]{text};
        }
        $index++;
    }
    for (; $index < @$children; $index++) {
        push @{$element->{children}}, $children->[$index]{kind} eq 'brace' ? _mrml_element($children->[$index]) : $children->[$index]{text};
    }
    return $element;
}

sub parse_mrtd_string {
    my ($source) = @_;
    my @lines = _split_mrtd_lines($source);
    return { columns => [], rows => [], records => [] } if !@lines;
    my @header_nodes = @{ parse_mbf_nodes($lines[0]) };
    my @columns = map {
        my ($name, $type) = split /:/, $_->{text}, 2;
        +{ name => $name, type => $type }
    } @header_nodes;
    my (@rows, @records);
    for my $line (@lines[1 .. $#lines]) {
        $line =~ s/^\((.*)\)$/$1/;
        my @cells = @{ parse_mbf_nodes($line) };
        die "MRTD row width mismatch" if @cells != @columns;
        my @row;
        my %record;
        for my $i (0 .. $#columns) {
            my $value = _coerce_mrtd(_scalar($cells[$i]{text}, $cells[$i]{quoted}, $cells[$i]{suffix}), $columns[$i]{type});
            push @row, $value;
            $record{$columns[$i]{name}} = $value;
        }
        push @rows, \@row;
        push @records, \%record;
    }
    return { columns => \@columns, rows => \@rows, records => \@records };
}

sub _split_mrtd_lines {
    my ($source) = @_;
    my @lines;
    my $buffer = '';
    my $in_string = 0;
    my $escaping = 0;
    my $in_line_comment = 0;
    my $in_block_comment = 0;
    my @chars = split //, $source;

    for (my $i = 0; $i < @chars; $i++) {
        my $char = $chars[$i];
        my $next = $chars[$i + 1] // '';
        if ($in_line_comment) {
            if ($char eq "\n") {
                $in_line_comment = 0;
                my $trimmed = $buffer;
                $trimmed =~ s/^\s+|\s+$//g;
                push @lines, $trimmed if $trimmed ne '';
                $buffer = '';
            }
            next;
        }
        if ($in_block_comment) {
            if ($char eq '*' && $next eq '/') {
                $in_block_comment = 0;
                $i++;
            }
            next;
        }
        if ($in_string) {
            $buffer .= $char;
            if ($escaping) {
                $escaping = 0;
            } elsif ($char eq '\\') {
                $escaping = 1;
            } elsif ($char eq '"') {
                $in_string = 0;
            }
            next;
        }

        if ($char eq '"') {
            $in_string = 1;
            $buffer .= $char;
            next;
        }
        if ($char eq '#') {
            $in_line_comment = 1;
            next;
        }
        if ($char eq '/' && $next eq '/') {
            $in_line_comment = 1;
            $i++;
            next;
        }
        if ($char eq '/' && $next eq '*') {
            $in_block_comment = 1;
            $i++;
            next;
        }
        if ($char eq "\r") {
            next;
        }
        if ($char eq "\n") {
            my $trimmed = $buffer;
            $trimmed =~ s/^\s+|\s+$//g;
            push @lines, $trimmed if $trimmed ne '';
            $buffer = '';
            next;
        }

        $buffer .= $char;
    }

    die "Unterminated block comment" if $in_block_comment;

    $buffer =~ s/^\s+|\s+$//g;
    push @lines, $buffer if $buffer ne '';
    return @lines;
}

sub parse_mrtd_file {
    my ($path) = @_;
    open my $fh, '<:encoding(UTF-8)', $path or die "Could not read MRTD file: $path";
    local $/;
    return parse_mrtd_string(<$fh>);
}

sub write_mron_string {
    my ($value) = @_;
    return 'null' if !defined $value;
    return $value ? 'true' : 'false' if !ref($value) && ($value eq '0' || $value eq '1');
    return $value if !ref($value) && $value =~ /^-?\d+(?:\.\d+)?$/;
    return _quote_if_needed($value->{value}) . $value->{suffix} if ref($value) eq 'HASH' && $value->{__basic_suffix_profile};
    return _quote_if_needed($value) if !ref($value);
    return '[' . join(' ', map { write_mron_string($_) } @$value) . ']' if ref($value) eq 'ARRAY';
    return '{ ' . join(' ', map { _quote_if_needed($_) . ' ' . write_mron_string($value->{$_}) } keys %$value) . ' }';
}

sub write_mrml_string {
    my ($element) = @_;
    my $attrs = join '', map { ' ' . $_ . '="' . _xml_escape($element->{attributes}{$_}) . '"' } sort keys %{$element->{attributes}};
    my $children = join '', map { ref($_) ? write_mrml_string($_) : _xml_escape($_) } @{$element->{children}};
    return "<$element->{name}$attrs/>" if $children eq '';
    return "<$element->{name}$attrs>$children</$element->{name}>";
}

sub write_mrtd_string {
    my ($doc) = @_;
    my $header = join ' ', map {
        _quote_if_needed($_->{name}) . (defined $_->{type} ? ':' . $_->{type} : '')
    } @{$doc->{columns}};
    my @lines = ($header);
    for my $row (@{$doc->{rows}}) {
        push @lines, join ' ', map { _mrtd_cell($_) } @$row;
    }
    return join "\n", @lines;
}

sub _scalar {
    my ($text, $quoted, $suffix) = @_;
    return apply_basic_suffix_profile('string', $text, $suffix) if $quoted;
    return undef if $text eq 'null';
    return 1 if $text eq 'true';
    return 0 if $text eq 'false';
    my ($raw, $numeric_suffix) = split_numeric_literal_suffix($text);
    return apply_basic_suffix_profile('number', $raw, $numeric_suffix) if defined $raw;
    return $text;
}

sub _coerce_mrtd {
    my ($value, $type) = @_;
    return $value if !defined $type || $type eq '';
    return $value if $type eq 'string' && ref($value) eq 'HASH' && $value->{__basic_suffix_profile};
    return defined($value) ? "$value" : 'null' if $type eq 'string';
    die "MRTD value does not match int field" if $type eq 'int' && ref($value);
    return int($value) if $type eq 'int' && $value =~ /^-?\d+$/;
    return 0 + $value if $type eq 'float' && $value =~ /^-?\d+(?:\.\d+)?$/;
    return $value ? 1 : 0 if $type eq 'bool' && ($value eq '0' || $value eq '1');
    die "Unsupported MRTD field type: $type" unless $type =~ /^(string|int|float|bool)$/;
    die "MRTD value does not match $type field";
}

sub _mrtd_cell {
    my ($value) = @_;
    return $value ? 'true' : 'false' if !ref($value) && ($value eq '0' || $value eq '1');
    return $value if !ref($value) && $value =~ /^-?\d+(?:\.\d+)?$/;
    return _quote_if_needed($value->{value}) . $value->{suffix} if ref($value) eq 'HASH' && $value->{__basic_suffix_profile};
    return _quote_if_needed("$value");
}

sub _key {
    my ($value) = @_;
    return 'null' if !defined $value;
    return "$value";
}

sub _quote_if_needed {
    my ($text) = @_;
    return $text if defined($text) && $text =~ /^[A-Za-z_\$][A-Za-z0-9_\$]*$/;
    $text =~ s/\\/\\\\/g;
    $text =~ s/"/\\"/g;
    return qq("$text");
}

sub _xml_escape {
    my ($text) = @_;
    $text =~ s/&/&amp;/g;
    $text =~ s/</&lt;/g;
    $text =~ s/>/&gt;/g;
    $text =~ s/"/&quot;/g;
    return $text;
}

1;
