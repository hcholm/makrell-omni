<?php

declare(strict_types=1);

namespace Makrell\Formats;

final class BasicSuffixProfile
{
    public static function applyString(string $value, string $suffix): mixed
    {
        if ($suffix === '') {
            return $value;
        }

        return match ($suffix) {
            'dt' => ['value' => $value, 'suffix' => $suffix],
            'bin' => self::parseBase($value, 2, 'binary'),
            'oct' => self::parseBase($value, 8, 'octal'),
            'hex' => self::parseBase($value, 16, 'hexadecimal'),
            default => throw new MakrellFormatException("Unsupported basic suffix profile string suffix '{$suffix}'."),
        };
    }

    public static function applyNumber(string $value, string $suffix): int|float
    {
        if ($suffix === '') {
            if (str_contains($value, '.') || str_contains($value, 'e') || str_contains($value, 'E')) {
                return (float) $value;
            }
            return (int) $value;
        }

        if (str_contains($value, '.') || str_contains($value, 'e') || str_contains($value, 'E')) {
            return self::applyFloatSuffix((float) $value, $suffix);
        }

        $base = (int) $value;
        return match ($suffix) {
            'k' => $base * 1_000,
            'M' => $base * 1_000_000,
            'G' => $base * 1_000_000_000,
            'T' => $base * 1_000_000_000_000,
            'P' => $base * 1_000_000_000_000_000,
            'E' => $base * 1_000_000_000_000_000_000,
            default => self::applyFloatSuffix((float) $base, $suffix),
        };
    }

    public static function splitNumericLiteralSuffix(string $text): ?array
    {
        $length = strlen($text);
        for ($boundary = $length; $boundary > 0; $boundary--) {
            $value = substr($text, 0, $boundary);
            $suffix = substr($text, $boundary);
            if ($suffix !== '' && !self::isSuffixIdentifier($suffix)) {
                continue;
            }
            if (filter_var($value, FILTER_VALIDATE_INT) !== false || is_numeric($value)) {
                return [$value, $suffix];
            }
        }
        return null;
    }

    public static function isTaggedString(mixed $value): bool
    {
        return is_array($value)
            && array_keys($value) === ['value', 'suffix']
            && is_string($value['value'])
            && is_string($value['suffix']);
    }

    private static function parseBase(string $value, int $base, string $label): int
    {
        $parsed = intval($value, $base);
        if (strtolower(base_convert((string) $parsed, 10, $base)) !== strtolower(ltrim($value, '0')) && $value !== '0') {
            throw new MakrellFormatException("Invalid {$label} literal '{$value}'.");
        }
        return $parsed;
    }

    private static function applyFloatSuffix(float $base, string $suffix): float
    {
        return match ($suffix) {
            'k' => $base * 1e3,
            'M' => $base * 1e6,
            'G' => $base * 1e9,
            'T' => $base * 1e12,
            'P' => $base * 1e15,
            'E' => $base * 1e18,
            'pi' => $base * M_PI,
            'tau' => $base * (2 * M_PI),
            'deg' => $base * (M_PI / 180.0),
            'e' => $base * exp(1),
            default => throw new MakrellFormatException("Unsupported basic suffix profile numeric suffix '{$suffix}'."),
        };
    }

    private static function isSuffixIdentifier(string $suffix): bool
    {
        return preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $suffix) === 1;
    }
}
