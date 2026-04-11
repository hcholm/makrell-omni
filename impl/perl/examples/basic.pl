use strict;
use warnings;
use FindBin;
use lib "$FindBin::Bin/../lib";
use Makrell::Formats qw(parse_mron_string write_mron_string);

my $doc = parse_mron_string(q{name Makrell features [comments "trailing-commas" "typed-scalars"] stable false});
print write_mron_string($doc), "\n";
