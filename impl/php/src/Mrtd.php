<?php

declare(strict_types=1);

namespace Makrell\Formats;

final class Mrtd
{
    public static function parseString(string $source): array
    {
        $lines = array_values(array_filter(
            array_map(static fn (string $line): string => trim($line), preg_split('/\R/', $source) ?: []),
            static fn (string $line): bool => $line !== '' && !str_starts_with($line, '#'),
        ));

        if ($lines === []) {
            return ['columns' => [], 'rows' => [], 'records' => []];
        }

        $headerNodes = MiniMbf::parse($lines[0]);
        $columns = array_map(static function (array $node): array {
            if ($node['kind'] !== 'scalar') {
                throw new MakrellFormatException('Invalid MRTD header field.');
            }
            $parts = explode(':', $node['text'], 2);
            return ['name' => $parts[0], 'type' => $parts[1] ?? 'string'];
        }, $headerNodes);

        $rows = [];
        $records = [];
        for ($i = 1; $i < count($lines); $i++) {
            $line = $lines[$i];
            if (str_starts_with($line, '(') && str_ends_with($line, ')')) {
                $line = trim(substr($line, 1, -1));
            }
            $cells = MiniMbf::parse($line);
            if (count($cells) !== count($columns)) {
                throw new MakrellFormatException('MRTD row width mismatch.');
            }
            $row = [];
            $record = [];
            foreach ($columns as $index => $column) {
                $value = self::convertCell($cells[$index], $column['type']);
                $row[] = $value;
                $record[$column['name']] = $value;
            }
            $rows[] = $row;
            $records[] = $record;
        }

        return ['columns' => $columns, 'rows' => $rows, 'records' => $records];
    }

    public static function parseFile(string $path): array
    {
        $source = @file_get_contents($path);
        if ($source === false) {
            throw new MakrellFormatException('Could not read MRTD file: ' . $path);
        }
        return self::parseString($source);
    }

    public static function writeString(mixed $value): string
    {
        if (!is_array($value) || !isset($value['columns'], $value['rows'])) {
            throw new MakrellFormatException('Unsupported MRTD value for serialisation.');
        }
        $header = implode(' ', array_map(
            static fn (array $column): string => self::quoteName($column['name']) . ':' . $column['type'],
            $value['columns'],
        ));
        $lines = [$header];
        foreach ($value['rows'] as $row) {
            $lines[] = implode(' ', array_map(self::writeCell(...), $row));
        }
        return implode("\n", $lines);
    }

    private static function convertCell(array $node, string $type): mixed
    {
        if ($node['kind'] !== 'scalar') {
            throw new MakrellFormatException('MRTD cells must be scalar values.');
        }
        $value = self::convertScalar($node['text'], $node['quoted']);
        return match ($type) {
            'string' => is_string($value) ? $value : (string) json_encode($value, JSON_THROW_ON_ERROR),
            'int' => is_int($value) ? $value : throw new MakrellFormatException('MRTD value does not match int field.'),
            'float' => is_int($value) || is_float($value) ? (float) $value : throw new MakrellFormatException('MRTD value does not match float field.'),
            'bool' => is_bool($value) ? $value : throw new MakrellFormatException('MRTD value does not match bool field.'),
            default => throw new MakrellFormatException('Unsupported MRTD field type: ' . $type),
        };
    }

    private static function convertScalar(string $text, bool $quoted): mixed
    {
        if ($quoted) {
            return $text;
        }
        return match ($text) {
            'true' => true,
            'false' => false,
            default => self::parseNumberOrString($text),
        };
    }

    private static function parseNumberOrString(string $text): mixed
    {
        if (preg_match('/^-?\d+$/', $text) === 1) {
            return (int) $text;
        }
        if (preg_match('/^-?\d+\.\d+$/', $text) === 1) {
            return (float) $text;
        }
        return $text;
    }

    private static function writeCell(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }
        $text = (string) $value;
        return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $text) === 1 ? $text : '"' . addcslashes($text, "\\\"") . '"';
    }

    private static function quoteName(string $value): string
    {
        return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $value) === 1 ? $value : '"' . addcslashes($value, "\\\"") . '"';
    }
}
