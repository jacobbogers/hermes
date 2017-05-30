const { resolve } = require('path');
const webpack = require('webpack');

const p = process.env.NODE_ENV === 'production';

const plugins = [
    new (require('clean-webpack-plugin'))(['dist'], {
        root: resolve(),
        verbose: true
    })
];

if (p) {
    plugins.push(
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        }),
        new webpack.optimize.UglifyJsPlugin({
            sourceMap: true
        })
    );
}

const client = plugins.concat([
    new (require('html-webpack-plugin'))({
        title: 'BookBarter',
        filename: 'index.html',
        template: require('html-webpack-template'),
        appMountId: 'app',
        inject: false,
        favicon: false,
        minify: p ? {
            caseSensitive: true,
            collapseBooleanAttributes: true,
            collapseInlineTagWhitespace: true,
            collapseWhitespace: true,
            conservativeCollapse: true,
            html5: true,
            keepClosingSlash: true,
            useShortDoctype: true
        } : false,
        hash: p,
        cache: p,
        showErrors: true,
        xhtml: true,
        baseHref: p ? 'https://www.jacob-bogers.com/' : false,
        mobile: true,
        inlineManifestWebpackName: p ? 'webpackManifest' : false,
        links: [
            'https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
            'https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700',
            'https://s3-us-west-2.amazonaws.com/s.cdpn.io/594328/fonts.css'
        ],
        meta: [
            {
                name: 'description',
                content: 'Book/DVD/Blue-ray trading club, don\'t copy but trade your second hand movies/books for others you haven\'t seen.'
            }
        ]
    })
]);

if (p) client.push(
    // Extract CSS from bundled JS
    new (require('extract-text-webpack-plugin'))('styles.css'),
    // Extract external code into a separate "vendor" bundle
    new webpack.optimize.CommonsChunkPlugin({
        name: "vendor",
        // Create implicit vendor bundle
        minChunks: function (module) {
            // Prevent vendor CSS/SASS from being bundled into "vendor.js"
            if (module.resource && (/^.*\.(css|scss)$/).test(module.resource)) {
                return false;
            }
            return module.context && module.context.indexOf("node_modules") !== -1;
        }
    }),
    new webpack.optimize.CommonsChunkPlugin({
        name: "manifest",
        minChunks: Infinity
    }),
    new (require('inline-manifest-webpack-plugin'))({
        name: 'webpackManifest'
    })
);

const server = plugins.concat([]);

module.exports = { client, server };
