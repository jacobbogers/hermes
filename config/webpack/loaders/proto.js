'use strict';
const { resolve } = require('path');
const fp = require('lodash/fp');
const { sync: uid } = require('uid-safe');

const proto = {
    file_loader: o => ({
        // info: https://github.com/webpack-contrib/file-loader#options
        loader: 'file-loader',
        options: fp.merge({
            name: '[name].[ext]'
        })(o)
    }),
    load_as_string: () => ({
        loader: 'raw-loader' // no options
    }),
    scss: o => ({
        // info:
        loader: 'sass-loader',
        options: fp.merge({
            sourceMap: uid(32), // not a real file just an internal target designator
            precision: 5
        })(o)
    }),
    css_dependencies: o => ({
        // info: https://github.com/webpack-contrib/css-loader#options
        loader: 'css-loader',
        options: fp.merge({
            url: true,
            import: true,
            modules: true,
            minimize: false,
            sourceMap: true,
            camelCase: false,
            // css can be big fat files, no base64 hashing please
            localIdentName: '[local]_[path][name]',
            importLoaders: 2
        })(o)
    }),
    post_css: o => ({
        // info: https://github.com/postcss/postcss-loader#options
        loader: 'postcss-loader',
        options: fp.merge({
            plugins: {
                'postcss-cssnext': {},
                autoprefixer: {},
                'postcss-sorting': {
                    'properties-order': 'alphabetical'
                }
            },
            sourceMap: true
        })(o)
    }),
    embed_css: o => ({
        // info: https://github.com/webpack-contrib/style-loader#options
        loader: 'style-loader',
        options: fp.merge({
            sourceMap: true
        })(o)
    }),
    tslinter: o => ({
        loader: 'tslint-loader',
        options: fp.merge({
            configFile: resolve('tslint.json'),
            emitErrors: false,
            failOnHint: false,
            typeCheck: true,
            fix: true,
            tsConfigFile: resolve('tsconfig.json')
        })(o)
    }),
    atl: o => ({
        loader: 'awesome-typescript-loader',
        options: fp.merge({
            // Babel configuration
            babelOptions: {
                presets: [
                    ['env', { loose: true, modules: false }], 'stage-0', 'react'
                ]
            },
            // Tells ATL to use Babel
            useBabel: true,
            // Cache output for quicker compilation
            useCache: true
        })(o)
    })
};

module.exports = proto;