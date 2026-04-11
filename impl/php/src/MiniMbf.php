<?php

declare(strict_types=1);

namespace Makrell\Formats;

final class MiniMbf
{
    public static function parse(string $source): array
    {
        $tokens = self::tokenise($source);
        $index = 0;
        $nodes = [];
        while ($index < count($tokens)) {
            $nodes[] = self::parseNode($tokens, $index);
        }
        return $nodes;
    }

    private static function parseNode(array $tokens, int &$index): array
    {
        $token = $tokens[$index++] ?? null;
        if ($token === null) {
            throw new MakrellFormatException('Unexpected end of input.');
        }

        return match ($token['kind']) {
            'scalar', '=' => ['kind' => 'scalar', 'text' => $token['text'], 'quoted' => $token['quoted']],
            '{' => ['kind' => 'brace', 'children' => self::parseGroup($tokens, $index, '}')],
            '[' => ['kind' => 'square', 'children' => self::parseGroup($tokens, $index, ']')],
            '(' => ['kind' => 'paren', 'children' => self::parseGroup($tokens, $index, ')')],
            default => throw new MakrellFormatException('Unexpected token: ' . $token['text']),
        };
    }

    private static function parseGroup(array $tokens, int &$index, string $closing): array
    {
        $items = [];
        while (($tokens[$index]['kind'] ?? null) !== $closing) {
            if ($index >= count($tokens)) {
                throw new MakrellFormatException('Unclosed group.');
            }
            $items[] = self::parseNode($tokens, $index);
        }
        $index++;
        return $items;
    }

    private static function tokenise(string $source): array
    {
        $tokens = [];
        $length = strlen($source);
        $i = 0;

        while ($i < $length) {
            $ch = $source[$i];
            if (ctype_space($ch) || $ch === ',') {
                $i++;
                continue;
            }
            if ($ch === '#') {
                while ($i < $length && $source[$i] !== "\n") {
                    $i++;
                }
                continue;
            }
            if ($ch === '/' && ($source[$i + 1] ?? '') === '/') {
                $i += 2;
                while ($i < $length && $source[$i] !== "\n") {
                    $i++;
                }
                continue;
            }
            if (in_array($ch, ['{', '}', '[', ']', '(', ')', '='], true)) {
                $tokens[] = ['kind' => $ch, 'text' => $ch, 'quoted' => false];
                $i++;
                continue;
            }
            if ($ch === '"') {
                $i++;
                $text = '';
                $escaping = false;
                while ($i < $length) {
                    $c = $source[$i++];
                    if ($escaping) {
                        $text .= match ($c) {
                            'n' => "\n",
                            'r' => "\r",
                            't' => "\t",
                            '"', '\\' => $c,
                            default => $c,
                        };
                        $escaping = false;
                        continue;
                    }
                    if ($c === '\\') {
                        $escaping = true;
                        continue;
                    }
                    if ($c === '"') {
                        break;
                    }
                    $text .= $c;
                }
                $tokens[] = ['kind' => 'scalar', 'text' => $text, 'quoted' => true];
                continue;
            }

            $start = $i;
            while ($i < $length) {
                $c = $source[$i];
                if (ctype_space($c) || $c === ',' || $c === '#' || str_contains('{}[]()="', $c)) {
                    break;
                }
                if ($c === '/' && ($source[$i + 1] ?? '') === '/') {
                    break;
                }
                $i++;
            }
            if ($start === $i) {
                throw new MakrellFormatException('Unexpected token: ' . $ch);
            }
            $tokens[] = ['kind' => 'scalar', 'text' => substr($source, $start, $i - $start), 'quoted' => false];
        }

        return $tokens;
    }
}
