const { resolve } = require('path');
const { merge } = require('lodash');

const proto = {
    raw: o => ({
        loader: 'raw-loader',
        options: merge({}, o)
    }),
    tslint: o => ({
        loader: 'tslint-loader',
        options: merge({
            configFile: resolve('tslint.json'),
            emitErrors: true,
            failOnHint: true,
            //https://github.com/wbuchwalter/tslint-loader/issues/76
            typeCheck: false,
            fix: true,
            tsConfigFile: resolve('tsconfig.webpack.json')
        }, o)
    }),
    atl: o => ({
        loader: 'awesome-typescript-loader',
        options: merge({
            configFileName: resolve('tsconfig.webpack.json'),
            // Babel configuration
            babelOptions: {
                babelrc: false,
                presets: [
                    ['env',
                        {
                            loose: true,
                            modules: false,
                            "targets": "last 2 versions, ie 11"
                        }
                    ],
                    'stage-0'
                ]
            },
            // Tells ATL to use Babel
            useBabel: false,
            // Cache output for quicker compilation WHEN using babel
            useCache: true
        }, o)
    }),
    tsl: (o) => ({
        loader: 'ts-loader',
        options: merge({
            transpileOnly: false,
            happyPackMode: false, //set this to true later, see doc,
            logInfoToStdOut: true, //stderr to stdout
            configFile: resolve('tsconfig.webpack.json'),
        }, o)
    })
};

module.exports = proto;