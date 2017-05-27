const { resolve } = require('path');

module.exports = {
    entry: {
        app: resolve('client/app.tsx')
    },
    output: {
        path: resolve('dist/client'),
        filename: '[name].js'
    },
    devtool: require('./devtool'),
    module: require('./module'),
    plugins: require('./plugins').clientPlugins,
    resolve: require('./resolve'),
};

// Include <projectRoot>/client in loaders
for (const rule of module.exports.module.rules)
    rule.include = rule.include.concat([resolve('client')]);
