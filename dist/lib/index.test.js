"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const libhttp = require("http");
const libhttps = require("https");
const wtf = require("@joelek/wtf");
const index = require("./index");
const utils = require("./utils");
const CREDENTIALS = index.generateSelfSignedCertificate("localhost", 1);
wtf.test(`HTTP server should support HTTP request proxying.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    let events = new Array();
    yield new Promise((resolve, reject) => {
        setTimeout(reject, 5 * 1000);
        let sockets = new Set();
        function trackSocket(socket) {
            sockets.add(socket);
            socket.once("close", () => {
                sockets.delete(socket);
                if (sockets.size === 0) {
                    resolve();
                }
            });
        }
        ;
        let options = {
            domains: [
                {
                    root: `./public/`
                }
            ]
        };
        let config = index.createConfigFromOptions(options);
        let server = index.createHttpServer(config, options);
        server.on("connection", trackSocket);
        server.on("connect", trackSocket);
        server.on("listening", () => {
            let serverAddress = utils.getServerAddress(server);
            let options = {
                domains: [
                    {
                        root: `http://localhost:${serverAddress.port}`
                    }
                ]
            };
            let config = index.createConfigFromOptions(options);
            let proxy = index.createHttpServer(config, options);
            proxy.on("connection", trackSocket);
            proxy.on("connect", trackSocket);
            proxy.on("listening", () => {
                let proxyAddress = utils.getServerAddress(proxy);
                let request = libhttp.request({
                    port: proxyAddress.port,
                    headers: [
                        "Host", "localhost",
                        "Connection", "close"
                    ]
                });
                request.on("response", (response) => {
                    events.push({
                        type: "request.response",
                        status: response.statusCode
                    });
                });
                request.end();
            });
            proxy.listen(undefined, "0.0.0.0");
        });
        server.listen(undefined, "0.0.0.0");
    });
    assert.equals(events, [
        {
            type: "request.response",
            status: 404
        }
    ]);
}));
wtf.test(`HTTP server should support HTTPS request proxying.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    let events = new Array();
    yield new Promise((resolve, reject) => {
        setTimeout(reject, 5 * 1000);
        let sockets = new Set();
        function trackSocket(socket) {
            sockets.add(socket);
            socket.once("close", () => {
                sockets.delete(socket);
                if (sockets.size === 0) {
                    resolve();
                }
            });
        }
        ;
        let options = {
            domains: [
                {
                    root: `./public/`,
                    cert: CREDENTIALS.cert,
                    key: CREDENTIALS.key
                }
            ]
        };
        let config = index.createConfigFromOptions(options);
        let server = index.createHttpsServer(config, options);
        server.on("connection", trackSocket);
        server.on("connect", trackSocket);
        server.on("listening", () => {
            let serverAddress = utils.getServerAddress(server);
            let options = {
                domains: [
                    {
                        root: `https://localhost:${serverAddress.port}`
                    }
                ],
                trust: [
                    "localhost"
                ]
            };
            let config = index.createConfigFromOptions(options);
            let proxy = index.createHttpServer(config, options);
            proxy.on("connection", trackSocket);
            proxy.on("connect", trackSocket);
            proxy.on("listening", () => {
                let proxyAddress = utils.getServerAddress(proxy);
                let request = libhttp.request({
                    port: proxyAddress.port,
                    headers: [
                        "Host", "localhost",
                        "Connection", "close"
                    ]
                });
                request.on("response", (response) => {
                    events.push({
                        type: "request.response",
                        status: response.statusCode
                    });
                });
                request.end();
            });
            proxy.listen(undefined, "0.0.0.0");
        });
        server.listen(undefined, "0.0.0.0");
    });
    assert.equals(events, [
        {
            type: "request.response",
            status: 404
        }
    ]);
}));
wtf.test(`HTTPS server should support unterminated PIPE connection proxying.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    let events = new Array();
    yield new Promise((resolve, reject) => {
        setTimeout(reject, 5 * 1000);
        let sockets = new Set();
        function trackSocket(socket) {
            sockets.add(socket);
            socket.once("close", () => {
                sockets.delete(socket);
                if (sockets.size === 0) {
                    resolve();
                }
            });
        }
        ;
        let options = {
            domains: [
                {
                    root: `./public/`,
                    cert: CREDENTIALS.cert,
                    key: CREDENTIALS.key
                }
            ]
        };
        let config = index.createConfigFromOptions(options);
        let server = index.createHttpsServer(config, options);
        server.on("connection", trackSocket);
        server.on("connect", trackSocket);
        server.on("listening", () => {
            let serverAddress = utils.getServerAddress(server);
            let options = {
                domains: [
                    {
                        root: `pipe://localhost:${serverAddress.port}`
                    }
                ]
            };
            let config = index.createConfigFromOptions(options);
            let proxy = index.createHttpsServer(config, options);
            proxy.on("connection", trackSocket);
            proxy.on("connect", trackSocket);
            proxy.on("listening", () => {
                let proxyAddress = utils.getServerAddress(proxy);
                let request = libhttps.request({
                    port: proxyAddress.port,
                    headers: [
                        "Host", "localhost",
                        "Connection", "close"
                    ],
                    rejectUnauthorized: false
                });
                request.on("response", (response) => {
                    events.push({
                        type: "request.response",
                        status: response.statusCode
                    });
                });
                request.end();
            });
            proxy.listen(undefined, "0.0.0.0");
        });
        server.listen(undefined, "0.0.0.0");
    });
    assert.equals(events, [
        {
            type: "request.response",
            status: 404
        }
    ]);
}));
wtf.test(`HTTPS server should support unterminated PROXY connection proxying.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    let events = new Array();
    yield new Promise((resolve, reject) => {
        setTimeout(reject, 5 * 1000);
        let sockets = new Set();
        function trackSocket(socket) {
            sockets.add(socket);
            socket.once("close", () => {
                sockets.delete(socket);
                if (sockets.size === 0) {
                    resolve();
                }
            });
        }
        ;
        let options = {
            domains: [
                {
                    root: `./public/`,
                    cert: CREDENTIALS.cert,
                    key: CREDENTIALS.key
                }
            ]
        };
        let config = index.createConfigFromOptions(options);
        let server = index.createHttpsServer(config, options);
        server.on("connection", trackSocket);
        server.on("connect", trackSocket);
        server.on("listening", () => {
            let serverAddress = utils.getServerAddress(server);
            let options = {
                domains: [
                    {
                        root: `proxy://localhost:${serverAddress.port}`
                    }
                ]
            };
            let config = index.createConfigFromOptions(options);
            let proxy = index.createHttpsServer(config, options);
            proxy.on("connection", trackSocket);
            proxy.on("connect", trackSocket);
            proxy.on("listening", () => {
                let proxyAddress = utils.getServerAddress(proxy);
                let request = libhttps.request({
                    port: proxyAddress.port,
                    headers: [
                        "Host", "localhost",
                        "Connection", "close"
                    ],
                    rejectUnauthorized: false
                });
                request.on("response", (response) => {
                    events.push({
                        type: "request.response",
                        status: response.statusCode
                    });
                });
                request.end();
            });
            proxy.listen(undefined, "0.0.0.0");
        });
        server.listen(undefined, "0.0.0.0");
    });
    assert.equals(events, [
        {
            type: "request.response",
            status: 404
        }
    ]);
}));
