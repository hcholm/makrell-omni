<?php

declare(strict_types=1);

namespace Makrell\Formats;

final class Mron
{
    public static function parseString(string $source): mixed
    {
        $nodes = MiniMbf::parse($source);
        if ($nodes === []) {
            return null;
        }
        if (count($nodes) === 1) {
            return self::convertNode($nodes[0]);
        }
        if (count($nodes) % 2 !== 0) {
            throw new MakrellFormatException('Illegal number (' . count($nodes) . ') of root level expressions for MRON object.');
        }
        return self::convertPairs($nodes);
    }

    public static function parseFile(string $path): mixed
    {
        $source = @file_get_contents($path);
        if ($source === false) {
            throw new MakrellFormatException('Could not read MRON file: ' . $path);
        }
        return self::parseString($source);
    }

    public static function writeString(mixed $value): string
    {
        return self::writeValue($value);
    }

    private static function convertNode(array $node): mixed
    {
        return match ($node['kind']) {
            'scalar' => self::convertScalar($node['text'], $node['quoted']),
            'square' => array_map(self::convertNode(...), $node['children']),
            'brace' => self::convertPairs($node['children']),
            default => throw new MakrellFormatException('Unsupported MRON node kind: ' . $node['kind']),
        };
    }

    private static function convertPairs(array $nodes): array
    {
        if (count($nodes) % 2 !== 0) {
            throw new MakrellFormatException('Odd pair count in MRON object.');
        }
        $result = [];
        for ($i = 0; $i < count($nodes); $i += 2) {
            $result[(string) self::convertNode($nodes[$i])] = self::convertNode($nodes[$i + 1]);
        }
        return $result;
    }

    private static function convertScalar(string $text, bool $quoted): mixed
    {
        if ($quoted) {
            return $text;
        }
        return match ($text) {
            'null' => null,
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

    private static function writeValue(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }
        if (is_string($value)) {
            return self::isIdentifierLike($value) ? $value : self::quote($value);
        }
        if (is_array($value)) {
            if (array_is_list($value)) {
                return '[' . implode(' ', array_map(self::writeValue(...), $value)) . ']';
            }
            $parts = [];
            foreach ($value as $key => $item) {
                $parts[] = self::writeValue((string) $key);
                $parts[] = self::writeValue($item);
            }
            return '{ ' . implode(' ', $parts) . ' }';
        }
        throw new MakrellFormatException('Unsupported MRON value for serialisation.');
    }

    private static function isIdentifierLike(string $value): bool
    {
        return preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/', $value) === 1;
    }

    private static function quote(string $value): string
    {
        return '"' . addcslashes($value, "\\\"") . '"';
    }
}
