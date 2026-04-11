<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/MakrellFormatException.php';
require_once __DIR__ . '/../src/MiniMbf.php';
require_once __DIR__ . '/../src/Mron.php';

use Makrell\Formats\Mron;

$doc = Mron::parseString('name Makrell features [comments trailing-commas typed-scalars] stable false');

var_export($doc);
echo PHP_EOL;
