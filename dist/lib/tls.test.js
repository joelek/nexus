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
const libnet = require("net");
const wtf = require("@joelek/wtf");
const tls = require("./tls");
const utils = require("./utils");
wtf.test(`getServernameAndBuffer() should reject when failing to parse a TLS plaintext message with servername within a set number of seconds.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 5 * 1000);
        let server = libnet.createServer();
        server.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                let { servername, buffer } = yield tls.getServernameAndBuffer({
                    socket: socket,
                    timeoutSeconds: 1
                });
                reject();
            }
            catch (error) {
                resolve();
            }
        }));
        server.listen(undefined, () => {
            let address = utils.getServerAddress(server);
            let socket = libnet.connect({
                port: address.port
            });
            socket.on("error", (error) => { }); // NOTE: Prevent errors from being thrown.
            socket.once("close", (had_error) => { });
            socket.once("connect", () => { });
        });
    });
}));
wtf.test(`getServernameAndBuffer() should reject when failing to parse a TLS plaintext message with servername within a set number of bytes.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 5 * 1000);
        let server = libnet.createServer();
        server.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                let { servername, buffer } = yield tls.getServernameAndBuffer({
                    socket: socket,
                    timeoutSeconds: 1
                });
                reject();
            }
            catch (error) {
                resolve();
            }
        }));
        server.listen(undefined, () => {
            let address = utils.getServerAddress(server);
            let socket = libnet.connect({
                port: address.port
            });
            socket.on("error", (error) => { }); // NOTE: Prevent errors from being thrown.
            socket.once("close", (had_error) => { });
            socket.once("connect", () => {
                socket.write(Buffer.alloc(64 * 1024));
            });
        });
    });
}));
