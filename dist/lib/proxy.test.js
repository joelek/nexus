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
const proxy = require("./proxy");
wtf.test(`Server should immediately reset connections sending bad proxy headers.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 1 * 1000);
        let server = proxy.createServer({
            trustedRemoteAddresses: []
        }, (socket, header) => { });
        server.listen(undefined, () => {
            let address = proxy.getServerAddress(server);
            let socket = libnet.connect({
                port: address.port
            });
            socket.on("error", (error) => { }); // NOTE: Prevent errors from being thrown.
            socket.once("close", (had_error) => {
                if (socket.errored != null && socket.errored.code === "ECONNRESET") {
                    resolve();
                }
                else {
                    reject();
                }
            });
            socket.once("connect", () => {
                socket.write("PROXY\r\n");
            });
        });
    });
}));
wtf.test(`Server should pass PROXY header when remote address is trusted.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 1 * 1000);
        let server = proxy.createServer({
            trustedRemoteAddresses: ["localhost"]
        }, (socket, header) => {
            if (header != null) {
                resolve();
            }
            else {
                reject();
            }
        });
        server.listen(undefined, () => {
            let address = proxy.getServerAddress(server);
            let socket = libnet.connect({
                port: address.port
            });
            socket.on("error", (error) => { }); // NOTE: Prevent errors from being thrown.
            socket.once("close", (had_error) => {
                reject();
            });
            socket.once("connect", () => {
                socket.write("PROXY TCP4 0.1.2.3 4.5.6.7 8 9\r\n");
            });
        });
    });
}));
wtf.test(`Server should not pass PROXY header when remote address is untrusted.`, (assert) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        setTimeout(reject, 1 * 1000);
        let server = proxy.createServer({
            trustedRemoteAddresses: []
        }, (socket, header) => {
            if (header != null) {
                reject();
            }
            else {
                resolve();
            }
        });
        server.listen(undefined, () => {
            let address = proxy.getServerAddress(server);
            let socket = libnet.connect({
                port: address.port
            });
            socket.on("error", (error) => { }); // NOTE: Prevent errors from being thrown.
            socket.once("close", (had_error) => {
                reject();
            });
            socket.once("connect", () => {
                socket.write("PROXY TCP4 0.1.2.3 4.5.6.7 8 9\r\n");
            });
        });
    });
}));
