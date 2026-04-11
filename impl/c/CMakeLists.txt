cmake_minimum_required(VERSION 3.20)
project(makrell_formats_c LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

add_library(makrell_formats_c src/makrell_formats.c)
target_include_directories(makrell_formats_c PUBLIC include)

add_executable(makrell_formats_c_smoke tests/smoke.c)
target_link_libraries(makrell_formats_c_smoke PRIVATE makrell_formats_c)

add_executable(makrell_formats_c_example examples/basic.c)
target_link_libraries(makrell_formats_c_example PRIVATE makrell_formats_c)
