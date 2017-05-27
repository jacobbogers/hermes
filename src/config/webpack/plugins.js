const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const { resolve } = require('path');
const webpack = require('webpack');

const p = process.env.NODE_ENV === 'production';

const plugins = [
    new CleanWebpackPlugin(['dist'], {
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
    // Extract CSS from bundled JS
    new ExtractTextPlugin('styles.css'),
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
    })
]);

const server = plugins.concat([]);

module.exports = { client, server };
