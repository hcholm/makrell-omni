<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/MakrellFormatException.php';
require_once __DIR__ . '/../src/MiniMbf.php';
require_once __DIR__ . '/../src/Mron.php';
require_once __DIR__ . '/../src/Mrml.php';
require_once __DIR__ . '/../src/Mrtd.php';

use Makrell\Formats\MakrellFormatException;
use Makrell\Formats\Mron;
use Makrell\Formats\Mrml;
use Makrell\Formats\Mrtd;

assertSame(
    [
        'name' => 'Makrell',
        'features' => ['comments', 'trailing commas', 'typed scalars'],
        'stable' => false,
    ],
    Mron::parseFile(fixturePath('mron/sample.mron')),
);

assertSame(
    [
        'title' => 'Makrell',
        'tags' => ['alpha', 'beta', 'gamma'],
        'nested' => ['kind' => 'article', 'status' => 'draft'],
    ],
    Mron::parseString('title Makrell tags [alpha beta gamma] nested { kind article status draft }'),
);

$mrml = Mrml::parseFile(fixturePath('mrml/sample.mrml'));
assertSame('page', $mrml['name']);
assertSame(['lang' => 'en'], $mrml['attributes']);
assertSame('<page lang="en"><title>Makrell</title><p>A small MRML fixture.</p></page>', Mrml::writeString($mrml));

$mrtd = Mrtd::parseFile(fixturePath('mrtd/sample.mrtd'));
assertSame(
    [
        ['name' => 'name', 'type' => 'string'],
        ['name' => 'age', 'type' => 'int'],
        ['name' => 'active', 'type' => 'bool'],
    ],
    $mrtd['columns'],
);
assertSame(
    [
        ['name' => 'Ada', 'age' => 32, 'active' => true],
        ['name' => 'Ben', 'age' => 41, 'active' => false],
    ],
    $mrtd['records'],
);

$identifierDoc = Mrtd::parseString("name:string status note\nAda active draft\nBen inactive review");
assertSame('active', $identifierDoc['records'][0]['status']);
assertSame('review', $identifierDoc['records'][1]['note']);

assertSame(
    "name:string age:int active:bool\nAda 32 true\nBen 41 false",
    Mrtd::writeString([
        'columns' => [
            ['name' => 'name', 'type' => 'string'],
            ['name' => 'age', 'type' => 'int'],
            ['name' => 'active', 'type' => 'bool'],
        ],
        'rows' => [
            ['Ada', 32, true],
            ['Ben', 41, false],
        ],
    ]),
);

assertThrows(
    static fn () => Mrtd::parseString("name:date\nAda"),
    'Unsupported MRTD field type',
);
assertThrows(
    static fn () => Mron::parseString('name trailing-commas'),
    'Unexpected token',
);
assertThrows(
    static fn () => Mrtd::parseString("name:string\ntrailing-commas"),
    'Unexpected token',
);

echo "PHP API smoke tests passed.\n";

function fixturePath(string $relative): string
{
    return __DIR__ . '/../../../shared/format-fixtures/' . $relative;
}

function assertSame(mixed $expected, mixed $actual): void
{
    if ($expected !== $actual) {
        throw new RuntimeException("Assertion failed.\nExpected: " . var_export($expected, true) . "\nActual: " . var_export($actual, true));
    }
}

function assertThrows(callable $fn, string $expectedMessagePart): void
{
    try {
        $fn();
    } catch (MakrellFormatException $ex) {
        if (str_contains($ex->getMessage(), $expectedMessagePart)) {
            return;
        }
        throw new RuntimeException('Unexpected exception message: ' . $ex->getMessage());
    }

    throw new RuntimeException('Expected MakrellFormatException.');
}
