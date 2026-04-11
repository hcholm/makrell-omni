#include "makrell_formats.h"

#include <stdio.h>
#include <stdlib.h>

int main(void) {
    mf_value* value = mf_parse_mron_string("name Makrell features [comments \"trailing-commas\" \"typed-scalars\"] stable false");
    char* text = mf_write_mron_string(value);
    puts(text);
    free(text);
    mf_free_value(value);
    return 0;
}
