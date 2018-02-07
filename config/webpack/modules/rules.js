'use strict';

const { resolve } = require('path');


const {
    // misc
    file_loader,
    load_as_string,
    // css
    scss,
    post_css,
    css_dependencies,
    embed_css,
    // pre-loaders
    tslinter,
    atl
} = require('../loaders/proto');

const rules = {
    fonts: isProd => ({
        test: /(\.svg|\.woff|\.woff2|\.[ot]tf|\.eot)$/,
        use: file_loader()
    }),
    emit_js_css: isProd => ({
        test: /\.(js|css)$/,
        include: [resolve('src/lib/vendor/cdn')],
        use: file_loader()
    }),
    embed_sql_gql: isProd => ({
        test: /\.(sql|gql)$/,
        use: load_as_string()
    }),
    css_files: isProd => ({
        test: [/\.s[ca]ss$/, /\.css$/],
        use: [embed_css(), css_dependencies(), post_css(), scss()]
    }),
    tslinter: isProd => ({
        enforce: 'pre',
        test: /\.tsx?$/,
        use: tslinter()
    }),
    tsc: () => ({
        test: /\.tsx?$/,
        use: atl()
    })

};

module.exports = rules;