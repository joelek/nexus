"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const libnet = require("net");
const libtls = require("tls");
{
    let proxy = libnet.connect({
        host: "localhost",
        port: 40001
    }, () => {
        console.log(`client connected to proxy`);
        proxy.on("error", (error) => {
            if (error.code === "ECONNRESET") {
                console.log("client got ECONNRESET from proxy");
            }
        });
        proxy.on("close", (had_error) => {
            console.log(`client disconnected from proxy`, had_error);
        });
        proxy.on("data", (data) => {
            console.log(data.toString("ascii"));
        });
        proxy.write("hello from client");
    });
}
{
    let proxy = libtls.connect({
        host: "localhost",
        port: 40002,
        rejectUnauthorized: false
    }, () => {
        console.log(`client connected to proxy`);
        proxy.on("error", (error) => {
            if (error.code === "ECONNRESET") {
                console.log("client got ECONNRESET from proxy");
            }
        });
        proxy.on("close", (had_error) => {
            console.log(`client disconnected from proxy`, had_error);
        });
        proxy.on("data", (data) => {
            console.log(data.toString("ascii"));
        });
        proxy.write("hello from client");
    });
}
{
    let proxy = libnet.connect({
        host: "localhost",
        port: 40003
    }, () => {
        console.log(`client connected to proxy`);
        proxy.on("error", (error) => {
            if (error.code === "ECONNRESET") {
                console.log("client got ECONNRESET from proxy");
            }
        });
        proxy.on("close", (had_error) => {
            console.log(`client disconnected from proxy`, had_error);
        });
        proxy.on("data", (data) => {
            console.log(data.toString("ascii"));
        });
        proxy.write("hello from client");
    });
}
{
    let proxy = libtls.connect({
        host: "localhost",
        port: 40004,
        rejectUnauthorized: false
    }, () => {
        console.log(`client connected to proxy`);
        proxy.on("error", (error) => {
            if (error.code === "ECONNRESET") {
                console.log("client got ECONNRESET from proxy");
            }
        });
        proxy.on("close", (had_error) => {
            console.log(`client disconnected from proxy`, had_error);
        });
        proxy.on("data", (data) => {
            console.log(data.toString("ascii"));
        });
        proxy.write("hello from client");
    });
}
