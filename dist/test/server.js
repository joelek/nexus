"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const libnet = require("net");
const libtls = require("tls");
const libfs = require("fs");
libnet.createServer({}, (proxy) => {
    console.log(`proxy connected to server`);
    proxy.on("error", (error) => {
        if (error.code === "ECONNRESET") {
            console.log("server got ECONNRESET from proxy");
        }
    });
    proxy.on("close", (had_error) => {
        console.log(`proxy disconnected from server`, had_error);
    });
    proxy.on("data", (data) => {
        console.log(data.toString("ascii"));
    });
    proxy.write("hello from server");
}).listen(40005);
libtls.createServer({
    key: libfs.readFileSync("./public/test/key.pem"),
    cert: libfs.readFileSync("./public/test/cert.pem")
}, (proxy) => {
    console.log(`proxy connected to server`);
    proxy.on("error", (error) => {
        if (error.code === "ECONNRESET") {
            console.log("server got ECONNRESET from proxy");
        }
    });
    proxy.on("close", (had_error) => {
        console.log(`proxy disconnected from server`, had_error);
    });
    proxy.on("data", (data) => {
        console.log(data.toString("ascii"));
    });
    proxy.write("hello from server");
}).listen(40006);
