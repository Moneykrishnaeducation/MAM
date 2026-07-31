const { proxy, ServerProxy } = require("./api-client");

module.exports = proxy;
module.exports.proxy = proxy;
module.exports.ServerProxy = ServerProxy;
module.exports.default = proxy;
