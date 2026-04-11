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

static char* read_fixture_text(const char* group, const char* file) {
    char* path = fixture(group, file);
    FILE* input = fopen(path, "rb");
    long size;
    char* text;
    assert(input != NULL);
    fseek(input, 0, SEEK_END);
    size = ftell(input);
    fseek(input, 0, SEEK_SET);
    text = (char*) malloc((size_t) size + 1);
    fread(text, 1, (size_t) size, input);
    text[size] = 0;
    fclose(input);
    free(path);
    return text;
}

int main(void) {
    char* path = fixture("mron", "sample.mron");
    mf_value* mron = mf_parse_mron_file(path);
    free(path);
    assert(mron != NULL);
    assert(mron->kind == MF_OBJECT);

    mf_value* iddoc = mf_parse_mron_string("title Makrell tags [alpha beta gamma] nested { kind article status draft }");
    assert(iddoc != NULL && iddoc->kind == MF_OBJECT);

    {
        char* text = read_fixture_text("conformance\\mron", "comments-and-identifiers.mron");
        mf_value* conformance_mron = mf_parse_mron_string(text);
        assert(conformance_mron != NULL && conformance_mron->kind == MF_OBJECT);
        free(text);
        mf_free_value(conformance_mron);
    }

    {
        char* text = read_fixture_text("conformance\\mron", "block-comments.mron");
        mf_value* block_comment_mron = mf_parse_mron_string(text);
        assert(block_comment_mron != NULL && block_comment_mron->kind == MF_OBJECT);
        free(text);
        mf_free_value(block_comment_mron);
    }

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

    {
        char* text = read_fixture_text("conformance\\mrtd", "untyped-headers.mrtd");
        mf_mrtd_document* untyped = mf_parse_mrtd_string(text);
        assert(untyped != NULL);
        assert(untyped->columns[1].type == NULL);
        assert(untyped->columns[2].type == NULL);
        free(text);
        mf_free_mrtd_document(untyped);
    }

    {
        char* text = read_fixture_text("conformance\\mrtd", "block-comments.mrtd");
        mf_mrtd_document* block_comment_mrtd = mf_parse_mrtd_string(text);
        assert(block_comment_mrtd != NULL);
        free(text);
        mf_free_mrtd_document(block_comment_mrtd);
    }

    {
        char* text = read_fixture_text("conformance\\mron", "hyphenated-bareword.invalid.mron");
        mf_value* invalid_mron = mf_parse_mron_string(text);
        assert(invalid_mron == NULL);
        free(text);
    }

    {
        char* text = read_fixture_text("conformance\\mrtd", "hyphenated-bareword.invalid.mrtd");
        mf_mrtd_document* invalid_mrtd = mf_parse_mrtd_string(text);
        assert(invalid_mrtd == NULL);
        free(text);
    }

    puts("C smoke tests passed.");
    mf_free_value(mron);
    mf_free_value(iddoc);
    mf_free_mrml_element(mrml);
    mf_free_mrtd_document(mrtd);
    return 0;
}
