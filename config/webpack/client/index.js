module.exports = function(env) {
    const isProd = /^([^:]+\:)*prod?(:[^:])*$/i.test(env);

    return {};
};