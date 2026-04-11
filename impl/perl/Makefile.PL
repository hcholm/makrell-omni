use strict;
use warnings;
use ExtUtils::MakeMaker;

WriteMakefile(
    NAME         => 'Makrell::Formats',
    VERSION_FROM => undef,
    VERSION      => '0.10.0',
    PM           => {
        'lib/Makrell/Formats.pm' => '$(INST_LIBDIR)/Formats.pm',
    },
);
