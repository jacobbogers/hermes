'use strict';

const path = require('path');
const fs = require('fs');

const resolve = path.resolve;
const join = path.join;

const dist = path.join(__dirname, 'dist');

console.log('[dist]:%s', dist);

var nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function (x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function (mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });


module.exports = {
    externals: nodeModules,
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    target: 'node',
    node: {
        __dirname: false,
        __filename: false,
    },
    entry: resolve('index.ts'),
    output: {
        path: resolve('dist'),
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.tsx?$/,
                loader: 'tslint-loader',
                exclude: /(node_modules)/,
            },
           /* {
                test: /\.ts$/,
                enforce: 'pre',
                loader: 'tslint-loader',
                options: { //Loader options go here 
                 }
},*/

            /*{
                enforce: 'pre',
                test: /\.tsx?$/,
                exclude: /node_modules/,
                include: [
                    resolve('index.ts'),
                    resolve('lib')
                ],
                use: [
                    {
                        loader: 'tslint-loader',
                        options: {
                            extends: resolve('tslint.json')
                        }
                    }
                ]
            },*/
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader'
            },
            {
                test: /\.sql$/,
                loader: 'raw-loader'
            }
        ]
    }
};