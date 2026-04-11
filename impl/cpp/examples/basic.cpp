#include "makrell_formats.hpp"

#include <iostream>

int main() {
    auto value = makrell::formats::parse_mron_string(
        "name Makrell features [comments \"trailing-commas\" \"typed-scalars\"] stable false");
    std::cout << makrell::formats::write_mron_string(value) << "\n";
}
