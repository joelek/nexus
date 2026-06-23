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
        let server = libhttp.createServer({});
        server.on("request", (request, response) => {
            response.writeHead(404);
            response.end();
        });
        server.on("listening", () => {
            let serverAddress = utils.getServerAddress(server);
            let options = {
                domains: [
                    {
                        root: `http://localhost:${serverAddress.port}`
                    }
                ],
                trust: [
                    "localhost"
                ]
            };
            let config = index.createConfigFromOptions(options);
            let proxy = index.createHttpServer(config, options);
            proxy.on("listening", () => {
                let proxyAddress = utils.getServerAddress(proxy);
                let request = libhttp.request({
                    port: proxyAddress.port
                });
                request.on("finish", () => { });
                request.on("response", (response) => {
                    events.push({
                        type: "request.response",
                        status: response.statusCode
                    });
                    response.on("data", () => { });
                    response.on("end", () => { });
                    response.on("close", resolve);
                });
                request.on("close", () => { });
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
        let server = libhttps.createServer(CREDENTIALS);
        server.on("request", (request, response) => {
            response.writeHead(404);
            response.end();
        });
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
            proxy.on("listening", () => {
                let proxyAddress = utils.getServerAddress(proxy);
                let request = libhttp.request({
                    port: proxyAddress.port
                });
                request.on("finish", () => { });
                request.on("response", (response) => {
                    events.push({
                        type: "request.response",
                        status: response.statusCode
                    });
                    response.on("data", () => { });
                    response.on("end", () => { });
                    response.on("close", resolve);
                });
                request.on("close", () => { });
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
wtf.test(`HTTPS server should support PIPE connection proxying.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    let events = new Array();
    yield new Promise((resolve, reject) => {
        setTimeout(reject, 5 * 1000);
        let server = libhttps.createServer(CREDENTIALS);
        server.on("request", (request, response) => {
            response.writeHead(404);
            response.end();
        });
        server.on("listening", () => {
            let serverAddress = utils.getServerAddress(server);
            let options = {
                domains: [
                    {
                        root: `pipe://localhost:${serverAddress.port}`
                    }
                ],
                trust: [
                    "localhost"
                ]
            };
            let config = index.createConfigFromOptions(options);
            let proxy = index.createHttpsServer(config, options);
            proxy.on("listening", () => {
                let proxyAddress = utils.getServerAddress(proxy);
                let request = libhttps.request({
                    port: proxyAddress.port,
                    rejectUnauthorized: false
                });
                request.on("finish", () => { });
                request.on("response", (response) => {
                    events.push({
                        type: "request.response",
                        status: response.statusCode
                    });
                    response.on("data", () => { });
                    response.on("end", () => { });
                    response.on("close", resolve);
                });
                request.on("close", () => { });
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
wtf.test(`HTTPS server should support PROXY connection proxying.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    let events = new Array();
    yield new Promise((resolve, reject) => {
        setTimeout(reject, 5 * 1000);
        let server = libhttp.createServer({});
        server.on("request", (request, response) => {
            response.writeHead(404);
            response.end();
        });
        server.on("listening", () => {
            let serverAddress = utils.getServerAddress(server);
            let options = {
                domains: [
                    {
                        root: `http://localhost:${serverAddress.port}`,
                        cert: CREDENTIALS.cert,
                        key: CREDENTIALS.key
                    }
                ],
                trust: [
                    "localhost"
                ]
            };
            let config = index.createConfigFromOptions(options);
            let inner = index.createHttpsServer(config, options);
            inner.on("listening", () => {
                let innerAddress = utils.getServerAddress(inner);
                let options = {
                    domains: [
                        {
                            root: `proxy://localhost:${innerAddress.port}`
                        }
                    ],
                    trust: [
                        "localhost"
                    ]
                };
                let config = index.createConfigFromOptions(options);
                let outer = index.createHttpsServer(config, options);
                outer.on("listening", () => {
                    let outerAddress = utils.getServerAddress(outer);
                    let request = libhttps.request({
                        port: outerAddress.port,
                        rejectUnauthorized: false
                    });
                    request.on("finish", () => { });
                    request.on("response", (response) => {
                        events.push({
                            type: "request.response",
                            status: response.statusCode
                        });
                        response.on("data", () => { });
                        response.on("end", () => { });
                        response.on("close", resolve);
                    });
                    request.on("close", () => { });
                    request.end();
                });
                outer.listen(undefined, "0.0.0.0");
            });
            inner.listen(undefined, "0.0.0.0");
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
