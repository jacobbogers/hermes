const { resolve } = require('path');
const { wPackN_Ext } = require('../externals');
const { lintmw, tscmw, sql } = require('../module/rules');
const { extensionsMw, plugins } = require('../resolve');
const { rm, defines, uglify } = require('../plugins');


module.exports = function(env) {
    const isProd = /^([^:]+\:)*prod?(:[^:])*$/i.test(env);

    const config = {
        target: "node",
        entry: {
            'hermes-mw': resolve('src/lib/adaptors/mock/AdaptorMock.ts'),
            'hermes-mw.min': resolve('src/lib/adaptors/mock/AdaptorMock.ts')
        },
        output: {
            path: resolve('dist/lib'),
            filename: '[name].js',
            libraryTarget: 'umd2',
            library: 'hermes-mw'
        },
        /*node: {
            __dirname: false,
            __filename: false,
        },*/
        devtool: 'source-map',
        externals: [wPackN_Ext()], // add more external module filter functions, if needed
        module: {
            rules: [
                lintmw(),
                tscmw( /*{ declaration: true }*/ ),
                sql()
            ]
        },
        plugins: [
            rm({ paths: ['lib'] }),
            uglify(),
        ],
        resolve: {
            extensions: extensionsMw, //array of file extentions to resolve '*js,*ts,..' etc 
            plugins // only 1 for now , to resolve tsconfig paths aka "~whatever"
        },
    };

    // Server files live in <projectRoot>/src/{server,lib}
    for (const rule of config.module.rules) {
        rule.include = rule.include || [];
        rule.include.push(resolve('src/server'), resolve('src/lib'));
    }

    return config;
};