const { resolve } = require('path');

const p = process.env.NODE_ENV === 'production';

module.exports = {
    entry: {
        app: resolve('src/client/App.tsx')
    },
    output: {
        path: resolve('dist/client'),
        filename: p ? '[name].[chunkhash].js' : '[name].js'
    },
    devtool: require('./devtool'),
    module: require('./module'),
    plugins: require('./plugins').client,
    resolve: require('./resolve'),
};

// Include <projectRoot>/client in loaders
for (const rule of module.exports.module.rules)
    rule.include = rule.include.concat([resolve('src/client')]);
