const { flatten } = require('./tools');
const { raw, styles, ts, tslint, fonts } = require('./loaders');
module.exports = {
  rules: flatten([raw, styles, tslint, ts, fonts])
};
