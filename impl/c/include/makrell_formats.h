#pragma once

#include <stddef.h>

typedef enum {
    MF_NULL,
    MF_BOOL,
    MF_INT,
    MF_FLOAT,
    MF_STRING,
    MF_TAGGED_STRING,
    MF_ARRAY,
    MF_OBJECT
} mf_kind;

typedef struct mf_value mf_value;
typedef struct mf_mrml_element mf_mrml_element;

typedef struct {
    char* key;
    mf_value* value;
} mf_pair;

struct mf_value {
    mf_kind kind;
    union {
        int bool_value;
        long long int_value;
        double float_value;
        char* string_value;
        struct {
            char* value;
            char* suffix;
        } tagged_string;
        struct {
            mf_value** items;
            size_t count;
        } array;
        struct {
            mf_pair* items;
            size_t count;
        } object;
    } as;
};

struct mf_mrml_element {
    char* name;
    char** keys;
    char** values;
    size_t attribute_count;
    char** text_children;
    size_t text_count;
    mf_mrml_element** element_children;
    size_t element_count;
};

typedef struct {
    char* name;
    char* type;
} mf_mrtd_column;

typedef struct {
    mf_mrtd_column* columns;
    size_t column_count;
    mf_value*** rows;
    size_t row_count;
} mf_mrtd_document;

typedef struct {
    char* value;
    char* suffix;
} mf_numeric_suffix_parts;

mf_value* mf_parse_mron_string(const char* source);
mf_value* mf_parse_mron_file(const char* path);
char* mf_write_mron_string(const mf_value* value);
void mf_free_value(mf_value* value);

mf_mrml_element* mf_parse_mrml_string(const char* source);
mf_mrml_element* mf_parse_mrml_file(const char* path);
char* mf_write_mrml_string(const mf_mrml_element* element);
void mf_free_mrml_element(mf_mrml_element* element);

mf_mrtd_document* mf_parse_mrtd_string(const char* source);
mf_mrtd_document* mf_parse_mrtd_file(const char* path);
char* mf_write_mrtd_string(const mf_mrtd_document* document);
void mf_free_mrtd_document(mf_mrtd_document* document);

mf_value* mf_apply_basic_suffix_profile(const char* kind, const char* value, const char* suffix);
mf_numeric_suffix_parts mf_split_numeric_literal_suffix(const char* text);
