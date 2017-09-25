#!/usr/bin/env bash

shopt -s globstar

make_file() {
    dest_directory="test/$(dirname ${1#src/})"
    dest_file="${dest_directory}/$(basename -s ${2} ${1#src/}).test${2}"

    mkdir -p ${dest_directory}
    touch ${dest_file}
}

export -f make_file
find src/**/*.ts -type f -exec bash -c 'make_file "$0" ".ts"' {} \;
find src/**/*.tsx -type f -exec bash -c 'make_file "$0" ".tsx"' {} \;
