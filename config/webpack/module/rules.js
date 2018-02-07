const { atl, tsl, tslint, raw } = require('../loader')
const { defaults } = require('lodash');

const rules = {
    lintmw: (lo, ro) => defaults({
        enforce: 'pre',
        use: tslint(lo),
        test: /\.ts$/i
    }, ro),
    tscmw: (lo, ro) => defaults({
        test: /\.ts$/i,
        use: tsl(lo)
    }, ro),
    sql: (lo, ro) => defaults({
        test: /\.sql$/i,
        use: raw(lo)
    }, ro),
    gql: (lo, ro) => defaults({
        test: /\.gql$/i,
        use: raw(lo)
    }, ro)
};


module.exports = rules;