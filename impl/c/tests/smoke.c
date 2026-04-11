#include "makrell_formats.h"

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char* fixture(const char* group, const char* file) {
    FILE* probe;
    size_t len = strlen(group) + strlen(file) + 40;
    char* path = (char*) malloc(len);
    snprintf(path, len, "shared\\format-fixtures\\%s\\%s", group, file);
    probe = fopen(path, "rb");
    if (probe != NULL) {
        fclose(probe);
        return path;
    }
    snprintf(path, len, "..\\..\\shared\\format-fixtures\\%s\\%s", group, file);
    return path;
}

int main(void) {
    char* path = fixture("mron", "sample.mron");
    mf_value* mron = mf_parse_mron_file(path);
    free(path);
    assert(mron != NULL);
    assert(mron->kind == MF_OBJECT);

    mf_value* iddoc = mf_parse_mron_string("title Makrell tags [alpha beta gamma] nested { kind article status draft }");
    assert(iddoc != NULL && iddoc->kind == MF_OBJECT);

    path = fixture("mrml", "sample.mrml");
    mf_mrml_element* mrml = mf_parse_mrml_file(path);
    free(path);
    assert(mrml != NULL);
    assert(strcmp(mrml->name, "page") == 0);

    path = fixture("mrtd", "sample.mrtd");
    mf_mrtd_document* mrtd = mf_parse_mrtd_file(path);
    free(path);
    assert(mrtd != NULL);
    assert(mrtd->column_count == 3);

    puts("C smoke tests passed.");
    mf_free_value(mron);
    mf_free_value(iddoc);
    mf_free_mrml_element(mrml);
    mf_free_mrtd_document(mrtd);
    return 0;
}
