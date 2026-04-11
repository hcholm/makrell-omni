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
        mf_value* suffix_value = mf_apply_basic_suffix_profile("string", "2026-04-11", "dt");
        mf_numeric_suffix_parts parts = mf_split_numeric_literal_suffix("0.5tau");
        assert(suffix_value != NULL && suffix_value->kind == MF_TAGGED_STRING);
        assert(strcmp(suffix_value->as.tagged_string.value, "2026-04-11") == 0);
        assert(strcmp(suffix_value->as.tagged_string.suffix, "dt") == 0);
        assert(parts.value != NULL && strcmp(parts.value, "0.5") == 0);
        assert(parts.suffix != NULL && strcmp(parts.suffix, "tau") == 0);
        free(parts.value);
        free(parts.suffix);
        mf_free_value(suffix_value);
        suffix_value = mf_apply_basic_suffix_profile("number", "3", "k");
        assert(suffix_value != NULL && suffix_value->kind == MF_INT && suffix_value->as.int_value == 3000);
        mf_free_value(suffix_value);
    }

    {
        char* text = read_fixture_text("conformance\\mron", "base-suffixes.mron");
        mf_value* suffix_mron = mf_parse_mron_string(text);
        assert(suffix_mron != NULL && suffix_mron->kind == MF_OBJECT);
        free(text);
        mf_free_value(suffix_mron);
    }

    {
        char* text = read_fixture_text("conformance\\mrtd", "base-suffixes.mrtd");
        mf_mrtd_document* suffix_mrtd = mf_parse_mrtd_string(text);
        assert(suffix_mrtd != NULL);
        assert(suffix_mrtd->rows[0][0]->kind == MF_TAGGED_STRING);
        assert(suffix_mrtd->rows[0][1]->kind == MF_INT && suffix_mrtd->rows[0][1]->as.int_value == 10);
        assert(suffix_mrtd->rows[0][4]->kind == MF_INT && suffix_mrtd->rows[0][4]->as.int_value == 3000);
        free(text);
        mf_free_mrtd_document(suffix_mrtd);
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
