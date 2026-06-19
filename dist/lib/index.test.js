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
const wtf = require("@joelek/wtf");
const index = require("./index");
const utils = require("./utils");
wtf.test(`Server should support http protocol.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
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
                ]
            };
            let config = index.createConfigFromOptions(options);
            let proxy = index.createHttpServer(config, options);
            proxy.on("listening", () => {
                let proxyAddress = utils.getServerAddress(proxy);
                let request = libhttp.request({
                    port: proxyAddress.port,
                });
                request.on("finish", () => { });
                request.on("response", (response) => {
                    response.on("data", () => { });
                    response.on("end", () => { });
                    response.on("close", resolve);
                });
                request.on("close", () => { });
                request.end();
            });
            proxy.listen({
                port: 8080,
                host: "0.0.0.0"
            });
        });
        server.listen(undefined);
    });
}));
