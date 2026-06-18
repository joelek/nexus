"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = void 0;
const libhttp = require("http");
const utils = require("./utils");
const DEFAULT_REQUEST_LISTENER = (request, response) => {
    response.writeHead(404);
    response.end();
};
const DEFAULT_UPGRADE_LISTENER = (request, socket, head) => {
    socket.end();
};
function createServer(options) {
    var _a, _b, _c;
    let requestListeners = (_a = options.requestListeners) !== null && _a !== void 0 ? _a : [];
    let upgradeListeners = (_b = options.upgradeListeners) !== null && _b !== void 0 ? _b : [];
    let httpKeepAliveTimeoutSeconds = (_c = options.httpKeepAliveTimeoutSeconds) !== null && _c !== void 0 ? _c : 60;
    let server = libhttp.createServer({});
    server.keepAliveTimeout = httpKeepAliveTimeoutSeconds * 1000;
    server.on("request", ((request, response) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let requestListener = (_c = (_b = requestListeners.find((requestListener) => {
            return utils.matchesHostnamePattern(hostname, requestListener.hostname);
        })) === null || _b === void 0 ? void 0 : _b.listener) !== null && _c !== void 0 ? _c : DEFAULT_REQUEST_LISTENER;
        return requestListener(request, response);
    }));
    server.on("upgrade", ((request, socket, head) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let upgradeListener = (_c = (_b = upgradeListeners.find((upgradeListener) => {
            return utils.matchesHostnamePattern(hostname, upgradeListener.hostname);
        })) === null || _b === void 0 ? void 0 : _b.listener) !== null && _c !== void 0 ? _c : DEFAULT_UPGRADE_LISTENER;
        return upgradeListener(request, socket, head);
    }));
    return server;
}
exports.createServer = createServer;
;
