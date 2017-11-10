const { TsConfigPathsPlugin } = require('awesome-typescript-loader');

module.exports = {
    // try to auto resolve files names without explicit extentions,if they have these extentions
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.scss', '.sass', '.css', '.svg', '.woff', '.ttf', '.eot'],
    plugins: [new TsConfigPathsPlugin()]
};