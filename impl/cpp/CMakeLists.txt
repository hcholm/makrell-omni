cmake_minimum_required(VERSION 3.20)
project(makrell_formats_cpp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(makrell_formats_cpp src/makrell_formats.cpp)
target_include_directories(makrell_formats_cpp PUBLIC include)

add_executable(makrell_formats_cpp_smoke tests/smoke.cpp)
target_link_libraries(makrell_formats_cpp_smoke PRIVATE makrell_formats_cpp)

add_executable(makrell_formats_cpp_example examples/basic.cpp)
target_link_libraries(makrell_formats_cpp_example PRIVATE makrell_formats_cpp)
