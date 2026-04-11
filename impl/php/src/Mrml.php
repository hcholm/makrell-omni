<?php

declare(strict_types=1);

namespace Makrell\Formats;

final class Mrml
{
    public static function parseString(string $source): array
    {
        $nodes = MiniMbf::parse($source);
        if (count($nodes) !== 1 || $nodes[0]['kind'] !== 'brace') {
            throw new MakrellFormatException('MRML expects exactly one root element.');
        }
        return self::parseElement($nodes[0]);
    }

    public static function parseFile(string $path): array
    {
        $source = @file_get_contents($path);
        if ($source === false) {
            throw new MakrellFormatException('Could not read MRML file: ' . $path);
        }
        return self::parseString($source);
    }

    public static function writeString(mixed $value): string
    {
        if (!is_array($value) || !isset($value['name'], $value['attributes'], $value['children'])) {
            throw new MakrellFormatException('Unsupported MRML value for serialisation.');
        }
        return self::writeElement($value);
    }

    private static function parseElement(array $node): array
    {
        $children = $node['children'];
        $head = $children[0] ?? null;
        if (($head['kind'] ?? null) !== 'scalar') {
            throw new MakrellFormatException('MRML element name must be a scalar.');
        }
        $index = 1;
        $attributes = [];
        if (($children[$index]['kind'] ?? null) === 'square') {
            $attributes = self::parseAttributes($children[$index]['children']);
            $index++;
        }
        $parsedChildren = [];
        for (; $index < count($children); $index++) {
            $child = $children[$index];
            if ($child['kind'] === 'brace') {
                $parsedChildren[] = self::parseElement($child);
            } elseif ($child['kind'] === 'scalar') {
                $parsedChildren[] = $child['text'];
            } else {
                throw new MakrellFormatException('Unsupported MRML child node.');
            }
        }
        return [
            'name' => $head['text'],
            'attributes' => $attributes,
            'children' => $parsedChildren,
        ];
    }

    private static function parseAttributes(array $nodes): array
    {
        $attributes = [];
        $index = 0;
        while ($index < count($nodes)) {
            $key = $nodes[$index++] ?? null;
            if (($key['kind'] ?? null) !== 'scalar') {
                throw new MakrellFormatException('Invalid MRML attribute list.');
            }
            if (($nodes[$index]['kind'] ?? null) === 'scalar' && ($nodes[$index]['text'] ?? null) === '=') {
                $index++;
            }
            $value = $nodes[$index++] ?? null;
            if (($value['kind'] ?? null) !== 'scalar') {
                throw new MakrellFormatException('Missing MRML attribute value.');
            }
            $attributes[$key['text']] = $value['text'];
        }
        return $attributes;
    }

    private static function writeElement(array $element): string
    {
        $xml = '<' . $element['name'];
        foreach ($element['attributes'] as $key => $value) {
            $xml .= ' ' . $key . '="' . self::escape((string) $value) . '"';
        }
        if ($element['children'] === []) {
            return $xml . '/>';
        }
        $xml .= '>';
        foreach ($element['children'] as $child) {
            if (is_array($child)) {
                $xml .= self::writeElement($child);
            } else {
                $xml .= self::escape((string) $child);
            }
        }
        return $xml . '</' . $element['name'] . '>';
    }

    private static function escape(string $value): string
    {
        return str_replace(
            ['&', '<', '>', '"'],
            ['&amp;', '&lt;', '&gt;', '&quot;'],
            $value,
        );
    }
}
