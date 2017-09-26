#!/usr/bin/env bash

shopt -s globstar

make_file() {
    directory=$(dirname ${1#src/})
    filename="$(basename -s ${2} ${1##*/})"
    dest_directory="test/${directory}"
    dest_file="${dest_directory}/$(basename -s ${2} ${1#src/}).test${2}"

    if [[ ! -f "${dest_file}" ]]; then
        mkdir -p "${dest_directory}"
        cat <<-EOF >> "${dest_file}"
		import { expect } from 'chai';

		import { ${filename} } from '~${directory}/${filename}';

		describe('~${directory}/${filename}', () => {
		    it('');
		});
		EOF
    fi
}

export -f make_file
find src/**/*.ts -type f -exec bash -c 'make_file "$0" ".ts"' {} \;
find src/**/*.tsx -type f -exec bash -c 'make_file "$0" ".tsx"' {} \;
