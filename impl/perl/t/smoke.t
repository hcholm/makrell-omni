use strict;
use warnings;
use Test::More;
use FindBin;
use lib "$FindBin::Bin/../lib";
use Makrell::Formats qw(mbf_support_profile parse_mbf_level2_nodes parse_mron_string parse_mron_file parse_mrml_file write_mrml_string parse_mrtd_string parse_mrtd_file write_mrtd_string);

sub fixture {
    my ($group, $file) = @_;
    return "$FindBin::Bin/../../../shared/format-fixtures/$group/$file";
}

is_deeply(mbf_support_profile(), {
    implemented_levels => [0, 1],
    reserved_levels => [2],
    max_data_format_level => 1,
}, 'MBF support profile');

my $mron = parse_mron_file(fixture('mron', 'sample.mron'));
is($mron->{name}, 'Makrell', 'MRON fixture name');
ok(!$mron->{stable}, 'MRON fixture bool');

my $mrml = parse_mrml_file(fixture('mrml', 'sample.mrml'));
is($mrml->{name}, 'page', 'MRML root');
is(write_mrml_string($mrml), '<page lang="en"><title>Makrell</title><p>A small MRML fixture.</p></page>', 'MRML writer');

my $mrtd = parse_mrtd_file(fixture('mrtd', 'sample.mrtd'));
is(scalar @{$mrtd->{columns}}, 3, 'MRTD columns');
is($mrtd->{records}[0]{name}, 'Ada', 'MRTD record');

my $idtable = parse_mrtd_string("name:string status note\nAda active draft\nBen inactive review");
is($idtable->{records}[0]{status}, 'active', 'MRTD identifier string');
ok(!defined $idtable->{columns}[1]{type}, 'MRTD untyped header stays untyped');
ok(!defined $idtable->{columns}[2]{type}, 'MRTD second untyped header stays untyped');

my $out = write_mrtd_string({
    columns => [
        { name => 'name', type => 'string' },
        { name => 'age', type => 'int' },
        { name => 'active', type => 'bool' },
    ],
    rows => [
        ['Ada', 32, 1],
        ['Ben', 41, 0],
    ],
});
is($out, "name:string age:int active:bool\nAda 32 true\nBen 41 false", 'MRTD writer output');

my $untyped_out = write_mrtd_string({
    columns => [
        { name => 'name' },
        { name => 'status' },
    ],
    rows => [
        ['Ada', 'active'],
    ],
});
is($untyped_out, "name status\nAda active", 'MRTD writer keeps untyped headers untyped');

eval { parse_mron_string('name trailing-commas') };
ok($@, 'MRON rejects hyphenated bareword');

eval { parse_mrtd_string("name:string\ntrailing-commas") };
ok($@, 'MRTD rejects hyphenated bareword');

eval { parse_mbf_level2_nodes('name value') };
like($@, qr/not implemented yet/, 'MBF level 2 reserved hook');

done_testing();
