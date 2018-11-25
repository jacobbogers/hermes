const { resolve } = require('path');
const {
    external: {
        wPackNodeExternals
    },
    rule: {
        tscMw,
        tsLintMw,
        sql
    },
    plugin: {
        rm,
        uglify
    },
    resolve: {
        extensionsMw,
        plugins
    }

} = require('webpack-helpers');


module.exports = function(env) {
    const isProd = /^([^:]+\:)*prod?(:[^:])*$/i.test(env);

    const config = {
        target: "node",
        entry: {
            'hermes-mw': resolve('src/lib/adapters/mock/AdapterMock.ts'),
            'hermes-mw.min': resolve('src/lib/adapters/mock/AdapterMock.ts')
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
        externals: [wPackNodeExternals()], // add more external module filter functions, if needed
        module: {
            rules: [
                tsLintMw(),
                tscMw({ configFile: resolve('tsconfig.webpack.json') }),
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