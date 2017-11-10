'use strict';

const { resolve } = require('path');

const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CleanPlugin = require('clean-webpack-plugin');
const HTMLPlugin = require('html-webpack-plugin')
const webpack = require('webpack');


const plugins = {
    extract_css: (cssFilename) => new ExtractTextPlugin(cssFilename),
    uglify: () => new webpack.optimize.UglifyJsPlugin({
        sourceMap: true
    }),
    text_src_replace: defines => {
        const processed = fp.object(fp.map((val, key) => [
            key,
            fp.isString(val) ? JSON.stringify(val) : val
        ])(defines));

        return new webpack.DefinePlugin(processed);
    },
    clean: dir => new CleanPlugin([dir], {
        root: resolve('dist'),
        verbose: true
    }),
    html: ({ title, filename, baseHref, links, metas }) => ({
        title,
        filename: filename || 'index.html',
        template: require('html-webpack-template'),
        appMountId: 'app',
        inject: false,
        favicon: false,
        minify: {
            caseSensitive: true,
            collapseBooleanAttributes: true,
            collapseInlineTagWhitespace: true,
            collapseWhitespace: true,
            conservativeCollapse: true,
            html5: true,
            keepClosingSlash: true,
            useShortDoctype: true
        },
        hash: false,
        cache: true,
        showErrors: true,
        xhtml: true,
        baseHref: baseHref || '/',
        mobile: true,
        inlineManifestWebpackName: false,
        links: [
            'https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
            'https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700',
            'https://s3-us-west-2.amazonaws.com/s.cdpn.io/594328/fonts.css',
            ...(links || [])
        ],
        meta: metas && [
            ...metas
        ]
    }),
}

module.exports = plugins;