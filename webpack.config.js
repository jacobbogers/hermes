'use strict';

const { resolve } = require('path');

module.exports = {
    target: 'node',
    entry: resolve(__dirname, 'index.ts'),
    output: {
        path: resolve(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
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
            },
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                include: [
                    resolve('index.ts'),
                    resolve('lib')
                ],
                use: 'awesome-typescript-loader'
            }
        ]
    }
};