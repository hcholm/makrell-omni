<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/MakrellFormatException.php';
require_once __DIR__ . '/../src/BasicSuffixProfile.php';
require_once __DIR__ . '/../src/MiniMbf.php';
require_once __DIR__ . '/../src/Mron.php';
require_once __DIR__ . '/../src/Mrml.php';
require_once __DIR__ . '/../src/Mrtd.php';

use Makrell\Formats\BasicSuffixProfile;
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

assertSame(
    [
        'name' => 'Makrell',
        'features' => ['comments', 'typed_scalars'],
        'stable' => false,
    ],
    Mron::parseFile(fixturePath('conformance/mron/comments-and-identifiers.mron')),
);

assertSame(
    [
        'name' => 'Makrell',
        'features' => ['comments', 'typed_scalars'],
        'stable' => false,
    ],
    Mron::parseFile(fixturePath('conformance/mron/block-comments.mron')),
);

assertSame(
    [
        'when' => ['value' => '2026-04-11', 'suffix' => 'dt'],
        'bits' => 10,
        'octal' => 15,
        'mask' => 255,
        'bonus' => 3000,
        'scale' => 2000000,
        'turn' => M_PI,
        'angle' => M_PI,
        'half' => M_PI / 2,
    ],
    Mron::parseFile(fixturePath('conformance/mron/base-suffixes.mron')),
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

$identifierDoc = Mrtd::parseFile(fixturePath('conformance/mrtd/untyped-headers.mrtd'));
assertSame('active', $identifierDoc['records'][0]['status']);
assertSame('review', $identifierDoc['records'][1]['note']);
assertSame(['name' => 'status'], $identifierDoc['columns'][1]);
assertSame(['name' => 'note'], $identifierDoc['columns'][2]);

$blockCommentDoc = Mrtd::parseFile(fixturePath('conformance/mrtd/block-comments.mrtd'));
assertSame(
    [
        ['name' => 'Ada', 'status' => 'active', 'note' => 'draft'],
        ['name' => 'Ben', 'status' => 'inactive', 'note' => 'review'],
    ],
    $blockCommentDoc['records'],
);

$suffixDoc = Mrtd::parseFile(fixturePath('conformance/mrtd/base-suffixes.mrtd'));
assertSame(['value' => '2026-04-11', 'suffix' => 'dt'], $suffixDoc['rows'][0][0]);
assertSame(10, $suffixDoc['rows'][0][1]);
assertSame(15, $suffixDoc['rows'][0][2]);
assertSame(255, $suffixDoc['rows'][0][3]);
assertSame(3000, $suffixDoc['rows'][0][4]);
assertSame(2000000, $suffixDoc['rows'][0][5]);
assertSame(M_PI, $suffixDoc['rows'][0][6]);
assertSame(M_PI, $suffixDoc['rows'][0][7]);
assertSame(M_PI / 2, $suffixDoc['rows'][0][8]);

assertSame(['value' => '2026-04-11', 'suffix' => 'dt'], BasicSuffixProfile::applyString('2026-04-11', 'dt'));
assertSame(3000, BasicSuffixProfile::applyNumber('3', 'k'));

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
    static fn () => Mron::parseFile(fixturePath('conformance/mron/hyphenated-bareword.invalid.mron')),
    'Unexpected token',
);
assertThrows(
    static fn () => Mrtd::parseFile(fixturePath('conformance/mrtd/hyphenated-bareword.invalid.mrtd')),
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
