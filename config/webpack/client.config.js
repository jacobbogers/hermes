const { resolve } = require('path');

const { clean, html } = require('./plugins/proto');
const { fonts, embed_sql_gql, css_files, tslinter, tsc } = require('./modules/rules');
const { in: _in } = require('./tools');

const config = {
    entry: {
        app: resolve('src/client/Main.tsx')
    },
    output: {
        path: resolve('dist/client'),
        filename: '[name].js'
    },
    devtool: false, //pretty fast
    module: {
        rules: [fonts(), embed_sql_gql(), css_files(), tslinter(), tsc()]
    },
    plugins: [clean('client'), html({ title: 'hermes' })],
    resolve: require('./resolve')
};

const includes_additions = [resolve('src/client'), resolve('src/lib')];

for (const rule of config.module.rules) {
    rule.include = [...(rule.include || []), ...includes_additions];
}

module.exports = function(env) {
    const args = (env || '').toLowerCase().split(':');
    if (_in(args, 'client')) {
        return configClient(args);
    }
    return configServer();
}