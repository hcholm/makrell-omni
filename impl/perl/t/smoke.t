use strict;
use warnings;
use Test::More;
use FindBin;
use lib "$FindBin::Bin/../lib";
use Makrell::Formats qw(mbf_support_profile parse_mbf_level2_nodes apply_basic_suffix_profile split_numeric_literal_suffix parse_mron_string parse_mron_file parse_mrml_file write_mrml_string parse_mrtd_string parse_mrtd_file write_mrtd_string);

sub fixture {
    my ($group, $file) = @_;
    return "$FindBin::Bin/../../../shared/format-fixtures/$group/$file";
}

sub read_fixture {
    my ($group, $file) = @_;
    open my $fh, '<:encoding(UTF-8)', fixture($group, $file) or die "Could not read fixture";
    local $/;
    return <$fh>;
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

my $conformance_mron = parse_mron_string(read_fixture('conformance/mron', 'comments-and-identifiers.mron'));
is($conformance_mron->{name}, 'Makrell', 'Conformance MRON name');
is($conformance_mron->{features}[1], 'typed_scalars', 'Conformance MRON identifier array item');

my $block_comment_mron = parse_mron_string(read_fixture('conformance/mron', 'block-comments.mron'));
is($block_comment_mron->{name}, 'Makrell', 'Block-comment MRON name');
is($block_comment_mron->{features}[1], 'typed_scalars', 'Block-comment MRON identifier array item');

my $negative_mron = parse_mron_string(read_fixture('conformance/mron', 'negative-numbers.mron'));
is($negative_mron->{offset}, -2, 'Conformance MRON negative scalar');
is($negative_mron->{temps}[0], -1, 'Conformance MRON negative array item');

my $idtable = parse_mrtd_string(read_fixture('conformance/mrtd', 'untyped-headers.mrtd'));
is($idtable->{records}[0]{status}, 'active', 'MRTD identifier string');
ok(!defined $idtable->{columns}[1]{type}, 'MRTD untyped header stays untyped');
ok(!defined $idtable->{columns}[2]{type}, 'MRTD second untyped header stays untyped');

my $negative_table = parse_mrtd_string(read_fixture('conformance/mrtd', 'negative-numbers.mrtd'));
is($negative_table->{records}[0]{delta}, -2, 'Conformance MRTD negative int');
is($negative_table->{records}[0]{ratio}, -3.5, 'Conformance MRTD negative float');

my $block_comment_table = parse_mrtd_string(read_fixture('conformance/mrtd', 'block-comments.mrtd'));
is($block_comment_table->{records}[0]{status}, 'active', 'Block-comment MRTD first row');
is($block_comment_table->{records}[1]{note}, 'review', 'Block-comment MRTD second row');

my $suffix_value = apply_basic_suffix_profile('string', '2026-04-11', 'dt');
is_deeply($suffix_value, { value => '2026-04-11', suffix => 'dt', __basic_suffix_profile => 1 }, 'Perl basic suffix profile string helper');
is(apply_basic_suffix_profile('number', '3', 'k'), 3000, 'Perl basic suffix profile number helper');
is_deeply([split_numeric_literal_suffix('0.5tau')], ['0.5', 'tau'], 'Perl numeric suffix splitting');

my $suffix_mron = parse_mron_string(read_fixture('conformance/mron', 'base-suffixes.mron'));
is_deeply($suffix_mron->{when}, { value => '2026-04-11', suffix => 'dt', __basic_suffix_profile => 1 }, 'Suffix MRON dt');
is($suffix_mron->{bits}, 10, 'Suffix MRON bin');
is($suffix_mron->{octal}, 15, 'Suffix MRON oct');
is($suffix_mron->{mask}, 255, 'Suffix MRON hex');
is($suffix_mron->{bonus}, 3000, 'Suffix MRON k');
is($suffix_mron->{scale}, 2_000_000, 'Suffix MRON M');

my $suffix_table = parse_mrtd_string(read_fixture('conformance/mrtd', 'base-suffixes.mrtd'));
is_deeply($suffix_table->{records}[0]{when}, { value => '2026-04-11', suffix => 'dt', __basic_suffix_profile => 1 }, 'Suffix MRTD dt');
is($suffix_table->{records}[0]{bits}, 10, 'Suffix MRTD bin');
is($suffix_table->{records}[0]{octal}, 15, 'Suffix MRTD oct');
is($suffix_table->{records}[0]{mask}, 255, 'Suffix MRTD hex');
is($suffix_table->{records}[0]{bonus}, 3000, 'Suffix MRTD k');
is($suffix_table->{records}[0]{scale}, 2_000_000, 'Suffix MRTD M');

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

eval { parse_mron_string(read_fixture('conformance/mron', 'hyphenated-bareword.invalid.mron')) };
ok($@, 'MRON rejects hyphenated bareword');

eval { parse_mrtd_string(read_fixture('conformance/mrtd', 'hyphenated-bareword.invalid.mrtd')) };
ok($@, 'MRTD rejects hyphenated bareword');

eval { parse_mron_string(read_fixture('conformance/mron', 'unclosed-array.invalid.mron')) };
ok($@, 'MRON rejects unclosed array');

eval { parse_mbf_level2_nodes('name value') };
like($@, qr/not implemented yet/, 'MBF level 2 reserved hook');

done_testing();
