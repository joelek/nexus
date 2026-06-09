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
exports.makeServer = exports.createDeferredSecureContext = exports.formatAddress = exports.handleTLS = exports.makeTcpProxyConnection = exports.connectTcp = exports.makeTlsProxyConnection = exports.connectTls = exports.connectProxySockets = exports.endSocket = exports.TimeoutError = exports.parseServernameConnectionConfig = exports.HTTP_PROTOCOLS = exports.TCP_PROTOCOLS = exports.getServerAddress = exports.matchesHostnamePattern = exports.makeProxyUpgradeListener = exports.makeProxyRequestListener = exports.makeProxyRequest = exports.createProxyRawHeaders = exports.makeRedirectRequestListener = exports.makeRequestListener = exports.makeReadStreamResponse = exports.makeDirectoryListingResponse = exports.renderDirectoryListing = exports.formatSize = exports.makeStylesheet = exports.encodeXMLText = exports.computeSimpleHash = exports.loadConfig = exports.Handler = exports.Options = exports.Domain = void 0;
const autoguard = require("@joelek/autoguard/dist/lib-server");
const multipass = require("@joelek/multipass/dist/mod");
const libcp = require("child_process");
const libfs = require("fs");
const libhttp = require("http");
const libhttps = require("https");
const libnet = require("net");
const libpath = require("path");
const libtls = require("tls");
const liburl = require("url");
const libserver = require("./api/server");
const config_1 = require("./config");
var config_2 = require("./config");
Object.defineProperty(exports, "Domain", { enumerable: true, get: function () { return config_2.Domain; } });
Object.defineProperty(exports, "Options", { enumerable: true, get: function () { return config_2.Options; } });
Object.defineProperty(exports, "Handler", { enumerable: true, get: function () { return config_2.Handler; } });
const tls = require("./tls");
const proxy = require("./proxy");
const terminal = require("./terminal");
const CONNECTION_DEBUG = false;
const PROXY_DEBUG = false;
const TCP_DEBUG = false;
const TIMEOUT_SECONDS = 10;
function loadConfig(config) {
    let string = libfs.readFileSync(config, "utf-8");
    let json = JSON.parse(string);
    return config_1.Options.as(json);
}
exports.loadConfig = loadConfig;
;
function computeSimpleHash(string) {
    var _a;
    let hash = string.length;
    for (let char of string) {
        let codePoint = (_a = char.codePointAt(0)) !== null && _a !== void 0 ? _a : 0;
        hash *= 31;
        hash += codePoint;
    }
    return hash;
}
exports.computeSimpleHash = computeSimpleHash;
;
function encodeXMLText(string) {
    return string.replace(/[&<>'"]/g, (match) => {
        var _a;
        return (_a = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            "\"": "&quot;"
        }[match]) !== null && _a !== void 0 ? _a : match;
    });
}
exports.encodeXMLText = encodeXMLText;
;
function makeStylesheet() {
    return `
		* {
			border: none;
			margin: 0px;
			outline: none;
			padding: 0px;
		}

		body {
			background-color: rgb(31, 31, 31);
			padding: 16px;
		}

		a {
			align-items: center;
			color: rgb(191, 191, 191);
			border-radius: 4px;
			display: grid;
			gap: 16px;
			grid-template-columns: auto 1fr auto;
			margin: 0px auto;
			max-width: 1080px;
			padding: 16px;
			text-decoration: none;
			transition: color 0.125s;
		}

		a:nth-child(2n+1) {
			background-color: rgb(47, 47, 47);
		}

		a:hover {
			color: rgb(255, 255, 255);
		}

		p {
			font-family: sans-serif;
			font-size: 16px;
			line-height: 1.25;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		p:nth-child(1) {
			background-color: rgb(255, 255, 255);
			border-radius: 16px;
			padding-bottom: 16px;
			width: 16px;
		}
	`.replace(/\s+/g, " ");
}
exports.makeStylesheet = makeStylesheet;
;
function formatSize(size) {
    let units = ["B", "KiB", "MiB", "GiB", "TiB"];
    for (let i = units.length - 1; i >= 0; i--) {
        let factor = Math.pow(1024, i);
        if (size > factor * 10) {
            return `${Math.round(size / factor)} ${units[i]}`;
        }
    }
    return `${size} B`;
}
exports.formatSize = formatSize;
;
function renderDirectoryListing(directoryListing) {
    let { components, directories, files } = Object.assign({}, directoryListing);
    return [
        `<!DOCTYPE html>`,
        `<html>`,
        `<head>`,
        `<base href="/${components.map((component) => encodeURIComponent(component)).join("/")}"/>`,
        `<meta charset="utf-8"/>`,
        `<meta content="width=device-width,initial-scale=1.0" name="viewport"/>`,
        `<style>${makeStylesheet()}</style>`,
        `<title>${components.join("/")}</title>`,
        `</head>`,
        `<body>`,
        ...directories.map((entry) => {
            return `<a href="${encodeURIComponent(entry.name)}/"><p></p><p>${encodeXMLText(entry.name)}/</p><p></p></a>`;
        }),
        ...files.map((entry) => {
            let hue = (computeSimpleHash(libpath.extname(entry.name)) % 12) * 30;
            return `<a href="${encodeURIComponent(entry.name)}"><p style="background-color: hsl(${hue}, 50%, 50%);"></p><p>${encodeXMLText(entry.name)}</p><p>${formatSize(entry.size)}</p></a>`;
        }),
        `</body>`,
        `</html>`,
    ].join("");
}
exports.renderDirectoryListing = renderDirectoryListing;
;
function makeDirectoryListingResponse(pathPrefix, pathSuffix, request) {
    let directoryListing = autoguard.api.makeDirectoryListing(pathPrefix, pathSuffix, request);
    return {
        status: 200,
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "must-revalidate, max-age=0",
            "Last-Modified": new Date().toUTCString()
        },
        payload: autoguard.api.serializeStringPayload(renderDirectoryListing(directoryListing))
    };
}
exports.makeDirectoryListingResponse = makeDirectoryListingResponse;
;
function makeReadStreamResponse(pathPrefix, pathSuffix, request) {
    var _a, _b;
    let response = autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
    let ifModifiedSinceHeader = (_a = request.headers()) === null || _a === void 0 ? void 0 : _a["if-modified-since"];
    let lastModifiedHeader = (_b = response.headers) === null || _b === void 0 ? void 0 : _b["Last-Modified"];
    if (typeof ifModifiedSinceHeader === "string" && typeof lastModifiedHeader === "string") {
        let ifModifiedSince = new Date(ifModifiedSinceHeader);
        let lastModified = new Date(lastModifiedHeader);
        if (lastModified <= ifModifiedSince) {
            return {
                status: 304,
                headers: Object.assign(Object.assign({}, response.headers), { "Cache-Control": "must-revalidate, max-age=0" }),
                payload: []
            };
        }
    }
    return Object.assign(Object.assign({}, response), { headers: Object.assign(Object.assign({}, response.headers), { "Cache-Control": "must-revalidate, max-age=0" }) });
}
exports.makeReadStreamResponse = makeReadStreamResponse;
;
function defaultRequestHandler(pathPrefix, pathSuffix, request, clientRouting, generateIndices) {
    try {
        return makeReadStreamResponse(pathPrefix, pathSuffix, request);
    }
    catch (error) {
        if (error !== 404) {
            throw error;
        }
    }
    if (clientRouting) {
        try {
            return makeReadStreamResponse(pathPrefix, "index.html", request);
        }
        catch (error) {
            if (error !== 404) {
                throw error;
            }
        }
    }
    if (generateIndices) {
        try {
            return makeDirectoryListingResponse(pathPrefix, pathSuffix, request);
        }
        catch (error) {
            if (error !== 404) {
                throw error;
            }
        }
    }
    throw 404;
}
function getGitRootParts(pathPrefix, pathSuffix) {
    let gitRootParts = [];
    function isGitRoot() {
        let cwd = [pathPrefix, ...gitRootParts].join("/");
        let response = libcp.spawnSync("git", [
            "rev-parse", "--show-prefix"
        ], {
            cwd: cwd,
            encoding: "utf-8"
        });
        if (response.status === 0) {
            if (response.stdout.split(/\r?\n/)[0] === "") {
                return true;
            }
        }
        return false;
    }
    if (isGitRoot()) {
        return gitRootParts;
    }
    let pathSuffixParts = pathSuffix.split("/");
    for (let pathSuffixPart of pathSuffixParts) {
        gitRootParts.push(pathSuffixPart);
        if (isGitRoot()) {
            return gitRootParts;
        }
    }
    return;
}
;
function gitRequestHandler(pathPrefix, pathSuffix, request, clientRouting, generateIndices) {
    var _a;
    let gitRootParts = getGitRootParts(pathPrefix, pathSuffix);
    if (gitRootParts == null) {
        return defaultRequestHandler(pathPrefix, pathSuffix, request, clientRouting, generateIndices);
    }
    let gitParts = pathSuffix.split("/").slice(gitRootParts.length);
    let cwd = [pathPrefix, ...gitRootParts].join("/");
    {
        let response = libcp.spawnSync("git", [
            "ls-tree", "-l", `HEAD:${gitParts.join("/")}`
        ], {
            cwd: cwd,
            encoding: "utf-8"
        });
        if (response.status === 0) {
            let directoryListing = {
                components: [...gitRootParts, ...(gitParts[gitParts.length - 1] === "" ? gitParts : [...gitParts, ""])],
                directories: [],
                files: []
            };
            let lines = response.stdout.split(/\r?\n/);
            for (let line of lines) {
                let parts = /^([0-7]{6})\s+(tree|blob)\s+([0-9a-f]{40})\s+([0-9]+|[-])\s+(.+)$/u.exec(line);
                if (parts == null) {
                    continue;
                }
                if (parts[2] === "tree") {
                    directoryListing.directories.push({
                        name: parts[5]
                    });
                    continue;
                }
                if (parts[2] === "blob") {
                    directoryListing.files.push({
                        name: parts[5],
                        size: Number.parseInt(parts[4]),
                        timestamp: 0
                    });
                    continue;
                }
            }
            return {
                status: 200,
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "must-revalidate, max-age=0",
                    "Last-Modified": new Date().toUTCString()
                },
                payload: autoguard.api.serializeStringPayload(renderDirectoryListing(directoryListing))
            };
        }
    }
    {
        let response = libcp.spawnSync("git", [
            "cat-file", "-p", `HEAD:${gitParts.join("/")}`
        ], {
            cwd: cwd
        });
        if (response.status === 0) {
            return {
                status: 200,
                headers: {
                    "Content-Type": (_a = autoguard.api.getContentTypeFromExtension(libpath.extname(pathSuffix))) !== null && _a !== void 0 ? _a : "text/plain",
                    "Cache-Control": "must-revalidate, max-age=0",
                    "Last-Modified": new Date().toUTCString()
                },
                payload: [response.stdout]
            };
        }
    }
    throw 404;
}
;
const REQUEST_HANDLERS = {
    git: gitRequestHandler
};
function makeRequestListener(pathPrefix, handler, clientRouting, generateIndices) {
    let requestListener = libserver.makeServer({
        getRequest(request) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                let options = request.options();
                let pathSuffixParts = libpath.normalize(((_a = options.filename) !== null && _a !== void 0 ? _a : []).join("/")).split(libpath.sep);
                if (pathSuffixParts[0] === "..") {
                    throw 400;
                }
                if (pathSuffixParts[0] === ".") {
                    pathSuffixParts = pathSuffixParts.slice(1);
                }
                let pathSuffix = pathSuffixParts.join("/");
                if (handler != null) {
                    return REQUEST_HANDLERS[handler](pathPrefix, pathSuffix, request, clientRouting, generateIndices);
                }
                return defaultRequestHandler(pathPrefix, pathSuffix, request, clientRouting, generateIndices);
            });
        },
        headRequest(request) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield this.getRequest(request);
                return Object.assign(Object.assign({}, response), { payload: [] });
            });
        }
    });
    return (request, response) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let path = (_b = request.url) !== null && _b !== void 0 ? _b : "/";
        let method = (_c = request.method) !== null && _c !== void 0 ? _c : "GET";
        let protocol = request.socket instanceof libtls.TLSSocket ? "https" : "http";
        let start = Date.now();
        response.on("finish", () => {
            let duration = Date.now() - start;
            let url = `${protocol}://${hostname}${path}`;
            process.stdout.write(`${terminal.stylize(response.statusCode, response.statusCode >= 400 ? terminal.FG_RED : terminal.FG_GREEN)} ${terminal.stylize(method, terminal.FG_MAGENTA)} ${terminal.stylize(url, terminal.FG_YELLOW)} (${terminal.stylize(duration, terminal.FG_CYAN)} ms)\n`);
        });
        requestListener(request, response);
    };
}
exports.makeRequestListener = makeRequestListener;
;
function makeRedirectRequestListener(httpsPort) {
    return (request, response) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let port = ((_b = request.headers.host) !== null && _b !== void 0 ? _b : "localhost").split(":")[1];
        let path = (_c = request.url) !== null && _c !== void 0 ? _c : "/";
        port = port != null ? `:${httpsPort}` : "";
        response.writeHead(301, {
            "Location": `https://${hostname}${port}${path}`
        });
        response.end();
    };
}
exports.makeRedirectRequestListener = makeRedirectRequestListener;
;
function createProxyRawHeaders(request, overrides) {
    var _a;
    let headers = new Array();
    for (let i = 0; i < request.rawHeaders.length; i += 2) {
        let key = request.rawHeaders[i + 0];
        let value = request.rawHeaders[i + 1];
        if (key.toLowerCase() in overrides) {
            value = overrides[key.toLowerCase()];
        }
        headers.push(key, value);
    }
    let sourceAddress = (_a = proxy.getSourceAddress(request.socket)) !== null && _a !== void 0 ? _a : proxy.getRemoteAddress(request.socket);
    headers.push("X-Forwarded-For", sourceAddress.address);
    return headers;
}
exports.createProxyRawHeaders = createProxyRawHeaders;
;
function makeProxyRequest(clientRequest, clientResponse, scc) {
    let rawHeaders = createProxyRawHeaders(clientRequest, {});
    let proxyRequest = (scc.protocol === "https:" ? libhttps : libhttp).request({
        host: scc.hostname,
        port: scc.port,
        timeout: 0,
        method: clientRequest.method,
        path: clientRequest.url,
        headers: rawHeaders
    });
    let timeout = setTimeout(() => {
        proxyRequest.emit("timeout");
    }, TIMEOUT_SECONDS * 1000);
    proxyRequest.on("response", (proxyResponse) => {
        var _a;
        clearTimeout(timeout);
        if (PROXY_DEBUG)
            process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("response", terminal.FG_CYAN)} event` + "\n");
        clientResponse.writeHead((_a = proxyResponse.statusCode) !== null && _a !== void 0 ? _a : 200, proxyResponse.rawHeaders);
        proxyResponse.pipe(clientResponse);
    });
    proxyRequest.on("timeout", () => {
        if (PROXY_DEBUG)
            process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("timeout", terminal.FG_CYAN)} event` + "\n");
        proxyRequest.destroy(new TimeoutError(TIMEOUT_SECONDS));
    });
    proxyRequest.on("error", (error) => {
        if (PROXY_DEBUG)
            process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("error", terminal.FG_CYAN)} event with message "${error.message}"` + "\n");
        clientResponse.writeHead(error instanceof TimeoutError || error.code === "ETIMEDOUT" ? 504 : 502);
        clientResponse.end();
    });
    proxyRequest.on("close", () => {
        if (PROXY_DEBUG)
            process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("close", terminal.FG_CYAN)} event` + "\n");
    });
    clientRequest.pipe(proxyRequest);
    return proxyRequest;
}
exports.makeProxyRequest = makeProxyRequest;
;
function makeProxyRequestListener(scc) {
    return (request, response) => {
        makeProxyRequest(request, response, scc);
    };
}
exports.makeProxyRequestListener = makeProxyRequestListener;
;
function makeProxyUpgradeListener(scc) {
    return (clientRequest, clientSocket, clientHead) => {
        let clientResponse = new libhttp.ServerResponse(clientRequest);
        clientResponse.assignSocket(clientSocket);
        let proxyRequest = makeProxyRequest(clientRequest, clientResponse, scc);
        proxyRequest.on("upgrade", (serverResponse, serverSocket, serverHead) => {
            var _a;
            clientResponse.writeHead((_a = serverResponse.statusCode) !== null && _a !== void 0 ? _a : 200, serverResponse.rawHeaders);
            clientResponse.end();
            connectProxySockets(clientSocket, serverSocket);
            serverSocket.write(clientHead);
            clientSocket.write(serverHead);
        });
    };
}
exports.makeProxyUpgradeListener = makeProxyUpgradeListener;
;
function matchesHostnamePattern(subject, pattern) {
    let subjectParts = subject.split(".");
    let patternParts = pattern.split(".");
    if (subjectParts.length < patternParts.length) {
        return false;
    }
    if (subjectParts.length > patternParts.length && patternParts[0] !== "*") {
        return false;
    }
    subjectParts = subjectParts.reverse();
    patternParts = patternParts.reverse();
    for (let [index, patternPart] of patternParts.entries()) {
        if (patternPart === "*") {
            continue;
        }
        if (subjectParts[index] !== patternPart) {
            return false;
        }
    }
    return true;
}
exports.matchesHostnamePattern = matchesHostnamePattern;
;
function getServerAddress(server) {
    let address = server.address();
    if (address == null || typeof address === "string") {
        throw `Expected type AddressInfo!`;
    }
    return address;
}
exports.getServerAddress = getServerAddress;
;
exports.TCP_PROTOCOLS = [
    "pipe:",
    "proxy:"
];
exports.HTTP_PROTOCOLS = [
    "http:",
    "https:"
];
function parseServernameConnectionConfig(root, defaultPort) {
    let url;
    try {
        url = new liburl.URL(root);
    }
    catch (error) {
        return;
    }
    let protocol = url.protocol;
    let hostname = url.hostname;
    let port = Number.parseInt(url.port, 10);
    if (Number.isNaN(port)) {
        port = undefined;
    }
    if (exports.TCP_PROTOCOLS.includes(protocol)) {
        return {
            protocol: protocol,
            hostname,
            port: port !== null && port !== void 0 ? port : defaultPort
        };
    }
    else if (exports.HTTP_PROTOCOLS.includes(protocol)) {
        return {
            protocol: protocol,
            hostname,
            port: port !== null && port !== void 0 ? port : defaultPort
        };
    }
    else {
        throw `Expected a supported protocol!`;
    }
}
exports.parseServernameConnectionConfig = parseServernameConnectionConfig;
;
class TimeoutError extends Error {
    constructor(timeout_seconds) {
        super();
        this.timeout_seconds = timeout_seconds;
    }
    get message() {
        return `Expected action to succeed within ${this.timeout_seconds} seconds!`;
    }
}
exports.TimeoutError = TimeoutError;
;
function endSocket(socket, timeout_seconds) {
    let timeout = setTimeout(() => {
        socket.destroy(new TimeoutError(timeout_seconds));
    }, timeout_seconds * 1000);
    socket.end(() => {
        clearTimeout(timeout);
    });
}
exports.endSocket = endSocket;
;
function connectProxySockets(clientSocket, serverSocket) {
    serverSocket.on("data", (buffer) => {
        clientSocket.write(buffer);
    });
    clientSocket.on("data", (buffer) => {
        serverSocket.write(buffer);
    });
    serverSocket.on("close", (had_error) => {
        if (TCP_DEBUG)
            process.stdout.write(`TCP server emitted ${terminal.stylize("close", terminal.FG_CYAN)} event ${had_error ? "with error" : "without error"}` + "\n");
        endSocket(clientSocket, TIMEOUT_SECONDS); // NOTE: Initiate graceful close with client.
    });
    clientSocket.on("close", (had_error) => {
        if (TCP_DEBUG)
            process.stdout.write(`TCP client emitted ${terminal.stylize("close", terminal.FG_CYAN)} event ${had_error ? "with error" : "without error"}` + "\n");
        endSocket(serverSocket, TIMEOUT_SECONDS); // NOTE: Initiate graceful close with server.
    });
    serverSocket.on("error", (error) => {
        if (TCP_DEBUG)
            process.stdout.write(`TCP server emitted ${terminal.stylize("error", terminal.FG_CYAN)} event with message "${error.message}"` + "\n");
    });
    clientSocket.on("error", (error) => {
        if (TCP_DEBUG)
            process.stdout.write(`TCP client emitted ${terminal.stylize("error", terminal.FG_CYAN)} event with message "${error.message}"` + "\n");
    });
    clientSocket.on("end", () => {
        if (TCP_DEBUG)
            process.stdout.write(`TCP client emitted ${terminal.stylize("end", terminal.FG_CYAN)} event` + "\n");
        endSocket(clientSocket, TIMEOUT_SECONDS); // NOTE: Finalize graceful close initiated by client for half-open connections.
    });
    serverSocket.on("end", () => {
        if (TCP_DEBUG)
            process.stdout.write(`TCP server emitted ${terminal.stylize("end", terminal.FG_CYAN)} event` + "\n");
        endSocket(serverSocket, TIMEOUT_SECONDS); // NOTE: Finalize graceful close initiated by server for half-open connections.
    });
}
exports.connectProxySockets = connectProxySockets;
;
function connectTls(options, timeout_seconds) {
    let serverSocket = libtls.connect(options);
    let timeout = setTimeout(() => {
        serverSocket.destroy(new TimeoutError(timeout_seconds));
    }, timeout_seconds * 1000);
    serverSocket.on("secureConnect", () => {
        clearTimeout(timeout);
        let address = proxy.getRemoteAddress(serverSocket);
        if (CONNECTION_DEBUG)
            process.stderr.write(`Outgoing ${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} connection ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)}` + "\n");
        serverSocket.on("close", (had_error) => {
            if (CONNECTION_DEBUG)
                process.stderr.write(`Outgoing ${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} connection ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
        });
    });
    return serverSocket;
}
exports.connectTls = connectTls;
;
function makeTlsProxyConnection(host, port, head, clientSocket) {
    let serverSocket = connectTls({
        host,
        port
    }, TIMEOUT_SECONDS);
    serverSocket.write(head);
    connectProxySockets(clientSocket, serverSocket);
    return serverSocket;
}
exports.makeTlsProxyConnection = makeTlsProxyConnection;
;
function connectTcp(options, timeout_seconds) {
    let serverSocket = libnet.connect(options);
    let timeout = setTimeout(() => {
        serverSocket.destroy(new TimeoutError(timeout_seconds));
    }, timeout_seconds * 1000);
    serverSocket.on("connect", () => {
        clearTimeout(timeout);
        let address = proxy.getRemoteAddress(serverSocket);
        if (CONNECTION_DEBUG)
            process.stderr.write(`Outgoing ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} connection ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)}` + "\n");
        serverSocket.on("close", (had_error) => {
            if (CONNECTION_DEBUG)
                process.stderr.write(`Outgoing ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} connection ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
        });
    });
    return serverSocket;
}
exports.connectTcp = connectTcp;
;
function makeTcpProxyConnection(host, port, head, clientSocket) {
    let serverSocket = connectTcp({
        host,
        port
    }, TIMEOUT_SECONDS);
    serverSocket.write(head);
    connectProxySockets(clientSocket, serverSocket);
    return serverSocket;
}
exports.makeTcpProxyConnection = makeTcpProxyConnection;
;
const TLS_PLAINTEXT_MAX_SIZE_BYTES = 16384;
function handleTLS(clientSocket, buffer, secureContext, callback) {
    clientSocket.pause(); // The socket has to be paused in order to properly delegate parsing to the TLS socket.
    clientSocket.unshift(buffer);
    let tlsSocket = new libtls.TLSSocket(clientSocket, {
        isServer: true,
        secureContext
    });
    tlsSocket.on("error", (error) => { }); // Prevent errors from being thrown. Socket is closed automatically.
    tlsSocket.on("secure", () => {
        callback(tlsSocket);
    });
}
exports.handleTLS = handleTLS;
;
function formatAddress(address) {
    return address.family === "IPv4" ? `${address.address}:${address.port}` : `[${address.address}]:${address.port}`;
}
exports.formatAddress = formatAddress;
;
function createDeferredSecureContext(options) {
    if (options.key || options.cert) {
        let deferredSecureContext = {
            host: options.host,
            secureContext: options.defaultSecureContext,
            dirty: true,
            load() {
                if (this.dirty) {
                    process.stdout.write(`Loading certificate for ${terminal.stylize(options.host, terminal.FG_YELLOW)}\n`);
                    this.secureContext = libtls.createSecureContext({
                        key: options.key ? libfs.readFileSync(options.key) : undefined,
                        cert: options.cert ? libfs.readFileSync(options.cert) : undefined,
                        passphrase: options.pass
                    });
                    this.dirty = false;
                }
            }
        };
        if (options.key) {
            libfs.watch(options.key, () => {
                deferredSecureContext.dirty = true;
            });
        }
        if (options.cert) {
            libfs.watch(options.cert, () => {
                deferredSecureContext.dirty = true;
            });
        }
        return deferredSecureContext;
    }
    else if (options.sign) {
        let days = 1;
        let deferredSecureContext = {
            host: options.host,
            secureContext: options.defaultSecureContext,
            dirty: true,
            load() {
                if (this.dirty) {
                    process.stdout.write(`Generating certificate for ${terminal.stylize(options.host, terminal.FG_YELLOW)}\n`);
                    let key = multipass.rsa.generatePrivateKey();
                    let cert = multipass.pem.serialize({
                        sections: [
                            {
                                label: "CERTIFICATE",
                                buffer: multipass.x509.generateSelfSignedCertificate([options.host], key, {
                                    validityPeriod: {
                                        days: days
                                    }
                                })
                            }
                        ]
                    });
                    this.secureContext = libtls.createSecureContext({
                        key: key.export({
                            format: "pem",
                            type: "pkcs1"
                        }),
                        cert: cert
                    });
                    this.dirty = false;
                    setTimeout(() => {
                        this.dirty = true;
                    }, days * 24 * 60 * 60 * 1000);
                }
            }
        };
        return deferredSecureContext;
    }
}
exports.createDeferredSecureContext = createDeferredSecureContext;
;
function makeServer(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let http = (_a = options.http) !== null && _a !== void 0 ? _a : 8080;
    let https = (_b = options.https) !== null && _b !== void 0 ? _b : 8443;
    let sign = (_c = options.sign) !== null && _c !== void 0 ? _c : false;
    let defaultSecureContext = libtls.createSecureContext();
    let defaultRequestListener = (request, response) => {
        response.writeHead(404);
        response.end();
    };
    let defaultUpgradeListener = (request, socket, head) => {
        socket.end();
    };
    let secureContexts = new Array();
    let httpRequestListeners = new Array();
    let httpUpgradeListeners = new Array();
    let httpsRequestListeners = new Array();
    let httpsUpgradeListeners = new Array();
    let handledServernameConnectionConfigs = new Array();
    let delegatedServernameConnectionConfigs = new Array();
    for (let domain of (_d = options.domains) !== null && _d !== void 0 ? _d : []) {
        let root = (_e = domain.root) !== null && _e !== void 0 ? _e : "./";
        let key = domain.key;
        let cert = domain.cert;
        let pass = domain.pass;
        let host = (_f = domain.host) !== null && _f !== void 0 ? _f : "*";
        let handler = domain.handler;
        let routing = (_g = domain.routing) !== null && _g !== void 0 ? _g : true;
        let indices = (_h = domain.indices) !== null && _h !== void 0 ? _h : false;
        let httpHost = `http://${host}:${http}`;
        let httpsHost = `https://${host}:${https}`;
        let secureContext = createDeferredSecureContext({
            host,
            key,
            cert,
            pass,
            sign,
            defaultSecureContext
        });
        if (secureContext != null) {
            secureContexts.push(secureContext);
            let httpRequestListener = makeRedirectRequestListener(https);
            httpRequestListeners.push([host, httpRequestListener]);
            let servernameConnectionConfig = parseServernameConnectionConfig(root, 80);
            if (servernameConnectionConfig != null) {
                handledServernameConnectionConfigs.push([host, servernameConnectionConfig]);
                if (exports.HTTP_PROTOCOLS.includes(servernameConnectionConfig.protocol)) {
                    process.stdout.write(`Proxying ${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} requests for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
                    let httpsRequestListener = makeProxyRequestListener(servernameConnectionConfig);
                    httpsRequestListeners.push([host, httpsRequestListener]);
                    ;
                    let httpsUpgradeListener = makeProxyUpgradeListener(servernameConnectionConfig);
                    httpsUpgradeListeners.push([host, httpsUpgradeListener]);
                }
                else {
                    process.stdout.write(`Proxying ${terminal.stylize("TCP", terminal.FG_MAGENTA)} connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
                }
            }
            else {
                if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
                    throw `Expected "${root}" to exist and be a directory!`;
                }
                process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpsHost, terminal.FG_YELLOW)}\n`);
                let httpsRequestListener = makeRequestListener(root, handler, routing, indices);
                httpsRequestListeners.push([host, httpsRequestListener]);
            }
        }
        else {
            let servernameConnectionConfig = parseServernameConnectionConfig(root, 443);
            if (servernameConnectionConfig != null) {
                delegatedServernameConnectionConfigs.push([host, servernameConnectionConfig]);
                if (exports.HTTP_PROTOCOLS.includes(servernameConnectionConfig.protocol)) {
                    process.stdout.write(`Proxying ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} requests for ${terminal.stylize(httpHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
                    let httpsRequestListener = makeProxyRequestListener(servernameConnectionConfig);
                    httpRequestListeners.push([host, httpsRequestListener]);
                    ;
                    let httpsUpgradeListener = makeProxyUpgradeListener(servernameConnectionConfig);
                    httpUpgradeListeners.push([host, httpsUpgradeListener]);
                }
                else {
                    process.stdout.write(`Proxying ${terminal.stylize("TCP", terminal.FG_MAGENTA)} connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)} (${terminal.stylize("E2EE", terminal.FG_GREEN)})\n`);
                    let httpRequestListener = makeRedirectRequestListener(https);
                    httpRequestListeners.push([host, httpRequestListener]);
                }
            }
            else {
                if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
                    throw `Expected "${root}" to exist and be a directory!`;
                }
                process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpHost, terminal.FG_YELLOW)}\n`);
                let httpRequestListener = makeRequestListener(root, handler, routing, indices);
                httpRequestListeners.push([host, httpRequestListener]);
            }
        }
    }
    let httpRequestRouter = libhttp.createServer({}, (request, response) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let requestListener = (_c = (_b = httpRequestListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : defaultRequestListener;
        return requestListener(request, response);
    });
    httpRequestRouter.keepAliveTimeout = 60 * 1000;
    httpRequestRouter.on("upgrade", (request, socket, head) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let upgradeListener = (_c = (_b = httpUpgradeListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : defaultUpgradeListener;
        return upgradeListener(request, socket, head);
    });
    let httpsRequestRouter = libhttp.createServer({}, (request, response) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let requestListener = (_c = (_b = httpsRequestListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : defaultRequestListener;
        return requestListener(request, response);
    });
    httpsRequestRouter.keepAliveTimeout = 60 * 1000;
    httpsRequestRouter.on("upgrade", (request, socket, head) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let upgradeListener = (_c = (_b = httpsUpgradeListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : defaultUpgradeListener;
        return upgradeListener(request, socket, head);
    });
    // NOTE: Sockets have allowHalfOpen set to false.
    let httpRouter = proxy.createServer({
        trustedRemoteAddresses: options.trust
    }, (clientSocket, proxyHeader) => {
        let address = proxy.getRemoteAddress(clientSocket);
        if (CONNECTION_DEBUG) {
            process.stderr.write(`Incoming ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} connection ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)}` + "\n");
            clientSocket.on("close", (had_error) => {
                process.stderr.write(`Incoming ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} connection ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
            });
        }
        httpRequestRouter.emit("connection", clientSocket);
    });
    httpRouter.listen({
        port: http,
        host: process.platform === "win32" ? "0.0.0.0" : undefined
    }, () => {
        let address = getServerAddress(httpRouter);
        process.stdout.write(`${terminal.stylize("HTTP", terminal.FG_MAGENTA)} router listening on ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)}\n`);
    });
    // NOTE: Sockets have allowHalfOpen set to false.
    let httpsRouter = proxy.createServer({
        trustedRemoteAddresses: options.trust
    }, (clientSocket, proxyHeader) => {
        let address = proxy.getRemoteAddress(clientSocket);
        if (CONNECTION_DEBUG) {
            process.stderr.write(`Incoming ${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} connection ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)}` + "\n");
            clientSocket.on("close", (had_error) => {
                process.stderr.write(`Incoming ${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} connection ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
            });
        }
        let timeout = setTimeout(() => {
            endSocket(clientSocket, TIMEOUT_SECONDS);
        }, TIMEOUT_SECONDS * 1000);
        let buffer = Buffer.alloc(0);
        clientSocket.on("data", function ondata(chunk) {
            var _a, _b;
            buffer = Buffer.concat([buffer, chunk]);
            try {
                let tlsPlaintext = tls.parseTlsPlaintext({
                    buffer: buffer,
                    offset: 0
                });
                clearTimeout(timeout);
                clientSocket.off("data", ondata);
                let servername;
                try {
                    servername = tls.getServername(tlsPlaintext);
                }
                catch (error) {
                    endSocket(clientSocket, TIMEOUT_SECONDS);
                    return;
                }
                let delegatedServernameConnectionConfig = (_a = delegatedServernameConnectionConfigs.find((pair) => {
                    return matchesHostnamePattern(servername, pair[0]);
                })) === null || _a === void 0 ? void 0 : _a[1];
                if (delegatedServernameConnectionConfig != null) {
                    let { protocol, hostname, port } = Object.assign({}, delegatedServernameConnectionConfig);
                    if (protocol === "proxy:") {
                        proxyHeader = proxyHeader !== null && proxyHeader !== void 0 ? proxyHeader : proxy.createProxyHeader(clientSocket);
                        buffer = Buffer.concat([proxy.serializeHeader(proxyHeader), buffer]);
                    }
                    makeTcpProxyConnection(hostname, port, buffer, clientSocket);
                }
                else {
                    let secureContext = secureContexts.find((pair) => matchesHostnamePattern(servername, pair.host));
                    secureContext === null || secureContext === void 0 ? void 0 : secureContext.load();
                    handleTLS(clientSocket, buffer, (_b = secureContext === null || secureContext === void 0 ? void 0 : secureContext.secureContext) !== null && _b !== void 0 ? _b : defaultSecureContext, (tlsSocket) => {
                        var _a;
                        if (proxyHeader != null) {
                            proxy.setSourceAddress(tlsSocket, proxyHeader);
                            proxy.setTargetAddress(tlsSocket, proxyHeader);
                        }
                        let handledServernameConnectionConfig = (_a = handledServernameConnectionConfigs.find((pair) => {
                            return matchesHostnamePattern(servername, pair[0]);
                        })) === null || _a === void 0 ? void 0 : _a[1];
                        if (handledServernameConnectionConfig != null) {
                            let { protocol, hostname, port } = Object.assign({}, handledServernameConnectionConfig);
                            if (exports.TCP_PROTOCOLS.includes(protocol)) {
                                let buffer = Buffer.alloc(0);
                                if (protocol === "proxy:") {
                                    proxyHeader = proxyHeader !== null && proxyHeader !== void 0 ? proxyHeader : proxy.createProxyHeader(tlsSocket);
                                    buffer = Buffer.concat([proxy.serializeHeader(proxyHeader), buffer]);
                                }
                                makeTcpProxyConnection(hostname, port, buffer, tlsSocket);
                            }
                            else {
                                httpsRequestRouter.emit("connection", tlsSocket);
                            }
                        }
                        else {
                            httpsRequestRouter.emit("connection", tlsSocket);
                        }
                    });
                }
            }
            catch (error) {
                if (buffer.length > TLS_PLAINTEXT_MAX_SIZE_BYTES) {
                    clientSocket.off("data", ondata);
                    endSocket(clientSocket, TIMEOUT_SECONDS);
                }
            }
        });
    });
    httpsRouter.listen({
        port: https,
        host: process.platform === "win32" ? "0.0.0.0" : undefined
    }, () => {
        let address = getServerAddress(httpsRouter);
        process.stdout.write(`${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} router listening on ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)}\n`);
    });
}
exports.makeServer = makeServer;
;
