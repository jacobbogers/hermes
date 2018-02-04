const configClient = require('./client');
const configServer = require('./server');

module.exports = function(env) {

    const configs = [];
    //true if env='w:arg1:client:hello:prod:something'
    const targetClient = /^([^:]+\:)*client?(:[^:])*$/i.test(env);
    const targetServer = /^([^:]+\:)*server?(:[^:])*$/i.test(env);

    if (targetClient) {
        configs.push(configClient(env));
    }
    if (targetServer) {
        configs.push(configServer(env));
    }
    if (configs.length === 0) {
        return undefined;
    }
    return configs;
}