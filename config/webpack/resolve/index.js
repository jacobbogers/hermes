const { TsConfigPathsPlugin } = require('awesome-typescript-loader');

module.exports = {
    // List of extensions that webpack should resolve to
    extensionsCient: [
        '.jsx',
        '.tsx',
    ],
    extensionsMw: [
        '.js',
        '.ts',
        //'.scss',
        //'.sass',
        //'.css',
        //'.svg',
        //'.woff',
        //'.ttf',
        //'.eot'
    ],
    plugins: [new TsConfigPathsPlugin()]
};