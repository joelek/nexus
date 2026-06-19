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
exports.makeServer = exports.createHttpsServer = exports.createHttpServer = exports.createConfigFromOptions = exports.createAgent = exports.createDeferredSecureContext = exports.createTLSSocket = exports.setSocket = exports.getSocket = exports.makeTcpProxyConnection = exports.connectTcp = exports.connectTls = exports.connectProxySockets = exports.setupProxySocketsLogging = exports.destroySocket = exports.TimeoutError = exports.parseConnectionConfig = exports.HTTP_PROTOCOLS = exports.TCP_PROTOCOLS = exports.makeProxyUpgradeListener = exports.makeProxyRequestListener = exports.makeServerRequest = exports.setupServerRequestLogging = exports.createProxyRawHeaders = exports.makeRedirectRequestListener = exports.makeRequestListener = exports.makeReadStreamResponse = exports.makeDirectoryListingResponse = exports.renderDirectoryListing = exports.formatSize = exports.makeStylesheet = exports.encodeXMLText = exports.computeSimpleHash = exports.loadConfig = exports.Handler = exports.Options = exports.Domain = void 0;
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
const http = require("./http");
const proxy = require("./proxy");
const terminal = require("./terminal");
const utils = require("./utils");
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
    let sourceAddress = (_a = proxy.getSourceAddress(request.socket)) !== null && _a !== void 0 ? _a : utils.getRemoteAddress(request.socket);
    headers.push("X-Forwarded-For", sourceAddress.address);
    return headers;
}
exports.createProxyRawHeaders = createProxyRawHeaders;
;
function setupServerRequestLogging(clientRequest, clientResponse, serverRequest) {
    clientRequest.on("error", (error) => {
        process.stdout.write(`Client request emitted error event with message "${error.message}"` + "\n");
    });
    clientRequest.on("close", () => {
        process.stdout.write(`Client request emitted close event` + "\n");
    });
    clientRequest.on("end", () => {
        process.stdout.write(`Client request emitted end event` + "\n");
    });
    clientResponse.on("error", (error) => {
        process.stdout.write(`Client response emitted error event with message "${error.message}"` + "\n");
    });
    clientResponse.on("finish", () => {
        process.stdout.write(`Client response emitted finish event` + "\n");
    });
    clientResponse.on("close", () => {
        process.stdout.write(`Client response emitted close event` + "\n");
    });
    serverRequest.on("response", (serverResponse) => {
        process.stdout.write(`Server request emitted response event` + "\n");
        serverResponse.on("error", (error) => {
            process.stdout.write(`Server response emitted error event with message "${error.message}"` + "\n");
        });
        serverResponse.on("end", () => {
            process.stdout.write(`Server response emitted end event` + "\n");
        });
        serverResponse.on("close", () => {
            process.stdout.write(`Server response emitted close event` + "\n");
        });
    });
    serverRequest.on("timeout", () => {
        process.stdout.write(`Server request emitted timeout event` + "\n");
    });
    serverRequest.on("upgrade", (serverResponse, serverSocket, serverHead) => {
        process.stdout.write(`Server request emitted upgrade event` + "\n");
    });
    serverRequest.on("error", (error) => {
        process.stdout.write(`Server request emitted error event with message "${error.message}"` + "\n");
    });
    serverRequest.on("finish", () => {
        process.stdout.write(`Server request emitted finish event` + "\n");
    });
    serverRequest.on("close", () => {
        process.stdout.write(`Server request emitted close event` + "\n");
    });
}
exports.setupServerRequestLogging = setupServerRequestLogging;
;
function makeServerRequest(agent, clientRequest, clientResponse, cc, httpDebug) {
    let rawHeaders = createProxyRawHeaders(clientRequest, {});
    let serverRequest = (cc.protocol === "https:" ? libhttps : libhttp).request({
        host: cc.hostname,
        port: cc.port,
        agent,
        method: clientRequest.method,
        path: clientRequest.url,
        headers: rawHeaders
    });
    if (httpDebug) {
        setupServerRequestLogging(clientRequest, clientResponse, serverRequest);
    }
    let timeout = setTimeout(() => {
        serverRequest.destroy(new TimeoutError("connect", TIMEOUT_SECONDS));
    }, TIMEOUT_SECONDS * 1000);
    serverRequest.on("response", (serverResponse) => {
        var _a;
        clearTimeout(timeout);
        clientResponse.writeHead((_a = serverResponse.statusCode) !== null && _a !== void 0 ? _a : 200, serverResponse.rawHeaders);
        serverResponse.pipe(clientResponse);
    });
    serverRequest.on("error", (error) => {
        clearTimeout(timeout);
        if (clientResponse.headersSent) {
            clientResponse.destroy(); // NOTE: Propagate server closing prematurely.
        }
        else {
            clientResponse.writeHead(error instanceof TimeoutError || error.code === "ETIMEDOUT" ? 504 : 502);
            clientResponse.end();
        }
    });
    clientResponse.on("close", () => {
        serverRequest.destroy(); // NOTE: Propagate client closing prematurely.
    });
    clientRequest.pipe(serverRequest);
    return serverRequest;
}
exports.makeServerRequest = makeServerRequest;
;
function makeProxyRequestListener(agent, cc, httpDebug) {
    return (clientRequest, clientResponse) => {
        makeServerRequest(agent, clientRequest, clientResponse, cc, httpDebug);
    };
}
exports.makeProxyRequestListener = makeProxyRequestListener;
;
function makeProxyUpgradeListener(agent, cc, httpDebug) {
    return (clientRequest, clientSocket, clientHead) => {
        let clientResponse = new libhttp.ServerResponse(clientRequest);
        clientResponse.assignSocket(clientSocket);
        let serverRequest = makeServerRequest(agent, clientRequest, clientResponse, cc, httpDebug);
        serverRequest.on("upgrade", (serverResponse, serverSocket, serverHead) => {
            var _a;
            clientResponse.writeHead((_a = serverResponse.statusCode) !== null && _a !== void 0 ? _a : 200, serverResponse.rawHeaders);
            clientResponse.end();
            connectProxySockets(clientSocket, serverSocket, httpDebug);
            serverSocket.write(clientHead);
            clientSocket.write(serverHead);
        });
    };
}
exports.makeProxyUpgradeListener = makeProxyUpgradeListener;
;
exports.TCP_PROTOCOLS = [
    "pipe:",
    "proxy:"
];
exports.HTTP_PROTOCOLS = [
    "http:",
    "https:"
];
function parseConnectionConfig(root, defaultPort) {
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
exports.parseConnectionConfig = parseConnectionConfig;
;
class TimeoutError extends Error {
    constructor(action, timeout_seconds) {
        super();
        this.action = action;
        this.timeout_seconds = timeout_seconds;
    }
    get message() {
        return `Expected ${this.action} to succeed within ${this.timeout_seconds} seconds!`;
    }
}
exports.TimeoutError = TimeoutError;
;
// NOTE: Using resetAndDestroy() sends a RST close and sets SO_LINGER to 0 allowing immediate port re-use.
function destroySocket(socket) {
    if (socket instanceof libtls.TLSSocket) {
        let underlying = getSocket(socket);
        if (underlying != null) {
            underlying.resetAndDestroy();
        }
        else {
            socket.destroy();
        }
    }
    else {
        socket.resetAndDestroy();
    }
}
exports.destroySocket = destroySocket;
;
function setupProxySocketsLogging(clientSocket, serverSocket) {
    serverSocket.on("end", () => {
        process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} emitted end event` + "\n");
    });
    serverSocket.on("close", (had_error) => {
        process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} emitted close event ${had_error ? "with error" : "without error"}` + "\n");
    });
    clientSocket.on("close", (had_error) => {
        process.stderr.write(`Client connection ${proxy.getConnectionId(clientSocket)} emitted close event ${had_error ? "with error" : "without error"}` + "\n");
    });
    clientSocket.on("end", () => {
        process.stderr.write(`Client connection ${proxy.getConnectionId(clientSocket)} emitted end event` + "\n");
    });
}
exports.setupProxySocketsLogging = setupProxySocketsLogging;
;
function connectProxySockets(clientSocket, serverSocket, debug) {
    if (debug) {
        setupProxySocketsLogging(clientSocket, serverSocket);
    }
    serverSocket.on("data", (buffer) => {
        let doContinue = clientSocket.write(buffer);
        if (!doContinue) {
            serverSocket.pause();
        }
    });
    clientSocket.on("drain", () => {
        serverSocket.resume();
    });
    clientSocket.on("data", (buffer) => {
        let doContinue = serverSocket.write(buffer);
        if (!doContinue) {
            clientSocket.pause();
        }
    });
    serverSocket.on("drain", () => {
        clientSocket.resume();
    });
    let serverSocketDestroyTimeout;
    let clientSocketDestroyTimeout;
    function closeServer() {
        if (serverSocket.writable) {
            serverSocketDestroyTimeout = setTimeout(() => {
                destroySocket(serverSocket);
            }, TIMEOUT_SECONDS * 1000);
            serverSocket.end();
        }
        else {
            destroySocket(serverSocket);
        }
    }
    function closeClient() {
        if (clientSocket.writable) {
            clientSocketDestroyTimeout = setTimeout(() => {
                destroySocket(clientSocket);
            }, TIMEOUT_SECONDS * 1000);
            clientSocket.end();
        }
        else {
            destroySocket(clientSocket);
        }
    }
    serverSocket.on("close", (had_error) => {
        clearTimeout(serverSocketDestroyTimeout);
        if (had_error) {
            destroySocket(clientSocket);
        }
        else {
            closeClient();
        }
    });
    clientSocket.on("close", (had_error) => {
        clearTimeout(clientSocketDestroyTimeout);
        if (had_error) {
            destroySocket(serverSocket);
        }
        else {
            closeServer();
        }
    });
    clientSocket.on("end", () => {
        closeServer();
    });
    serverSocket.on("end", () => {
        closeClient();
    });
}
exports.connectProxySockets = connectProxySockets;
;
function connectTls(options, timeout_seconds, debug) {
    return __awaiter(this, void 0, void 0, function* () {
        let serverSocket = connectTcp(options, timeout_seconds, debug);
        let tlsSocket = yield new Promise((resolve, reject) => {
            serverSocket.once("connect", () => {
                let tlsSocket = libtls.connect({
                    socket: serverSocket,
                    servername: options.host
                });
                proxy.setConnectionId(tlsSocket, "-");
                tlsSocket.once("error", (error) => {
                    reject(error);
                });
                tlsSocket.once("secureConnect", () => {
                    proxy.setConnectionId(tlsSocket, proxy.getConnectionId(serverSocket));
                    resolve(tlsSocket);
                });
                setSocket(tlsSocket, serverSocket);
            });
        });
        return tlsSocket;
    });
}
exports.connectTls = connectTls;
;
function connectTcp(options, timeout_seconds, debug) {
    let serverSocket = libnet.connect(options);
    let timeout = setTimeout(() => {
        serverSocket.destroy(new TimeoutError("connect", timeout_seconds));
    }, timeout_seconds * 1000);
    proxy.setConnectionId(serverSocket, "-");
    serverSocket.once("connect", () => {
        clearTimeout(timeout);
        let remoteAddress = utils.getRemoteAddress(serverSocket);
        let localAddress = utils.getLocalAddress(serverSocket);
        proxy.setConnectionId(serverSocket, `${localAddress.port}`);
        if (debug) {
            process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(utils.formatAddress(remoteAddress), terminal.FG_YELLOW)}` + "\n");
        }
        serverSocket.once("close", (had_error) => {
            process.nextTick(() => {
                if (debug) {
                    process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(utils.formatAddress(remoteAddress), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
                }
            });
        });
    });
    serverSocket.on("error", (error) => {
        if (debug) {
            process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} emitted error event with message "${error.message}"` + "\n");
        }
    });
    return serverSocket;
}
exports.connectTcp = connectTcp;
;
function makeTcpProxyConnection(host, port, head, clientSocket, debug) {
    let serverSocket = connectTcp({
        host,
        port
    }, TIMEOUT_SECONDS, debug);
    serverSocket.write(head);
    connectProxySockets(clientSocket, serverSocket, debug);
    return serverSocket;
}
exports.makeTcpProxyConnection = makeTcpProxyConnection;
;
const SOCKET_KEY = Symbol();
function getSocket(tlsSocket) {
    if (SOCKET_KEY in tlsSocket) {
        return tlsSocket[SOCKET_KEY];
    }
}
exports.getSocket = getSocket;
;
function setSocket(tlsSocket, socket) {
    delete socket[SOCKET_KEY];
    Object.defineProperty(tlsSocket, SOCKET_KEY, {
        value: socket,
        configurable: true
    });
}
exports.setSocket = setSocket;
;
function createTLSSocket(clientSocket, buffer, secureContext, callback) {
    clientSocket.pause(); // The socket has to be paused in order to properly delegate parsing to the TLS socket.
    clientSocket.unshift(buffer);
    let tlsSocket = new libtls.TLSSocket(clientSocket, {
        isServer: true,
        secureContext
    });
    proxy.setConnectionId(tlsSocket, "-");
    setSocket(tlsSocket, clientSocket);
    let timeout = setTimeout(() => {
        clientSocket.destroy(new TimeoutError("handshake", TIMEOUT_SECONDS));
    }, TIMEOUT_SECONDS * 1000);
    tlsSocket.on("secure", () => {
        clearTimeout(timeout);
        proxy.setConnectionId(tlsSocket, proxy.getConnectionId(clientSocket));
        callback(tlsSocket);
    });
}
exports.createTLSSocket = createTLSSocket;
;
function createDeferredSecureContext(options) {
    if (options.key || options.cert) {
        let deferredSecureContext = {
            host: options.host,
            secureContext: DEFAULT_SECURE_CONTEXT,
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
            secureContext: DEFAULT_SECURE_CONTEXT,
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
function createAgent(cc, tcpDebug) {
    if (cc.protocol === "http:") {
        let agent = new libhttp.Agent({
            keepAlive: true
        });
        agent.createConnection = (options, callback) => {
            let serverSocket = connectTcp({
                host: options.host,
                port: options.port
            }, TIMEOUT_SECONDS, tcpDebug);
            if (callback != null) {
                serverSocket.once("connect", () => {
                    callback(null, serverSocket);
                });
            }
            return null;
        };
        return agent;
    }
    else {
        let agent = new libhttps.Agent({
            keepAlive: true
        });
        agent.createConnection = (options, callback) => {
            connectTls({
                host: options.host,
                port: options.port
            }, TIMEOUT_SECONDS, tcpDebug).catch((error) => error).then((tlsSocketOrError) => {
                if (callback != null) {
                    if (tlsSocketOrError instanceof libtls.TLSSocket) {
                        callback(null, tlsSocketOrError);
                    }
                    else {
                        callback(tlsSocketOrError, null);
                    }
                }
            });
            return null;
        };
        return agent;
    }
}
exports.createAgent = createAgent;
;
const DEFAULT_SECURE_CONTEXT = libtls.createSecureContext();
;
function createConfigFromOptions(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    let httpPort = (_a = options.http) !== null && _a !== void 0 ? _a : 8080;
    let httpsPort = (_b = options.https) !== null && _b !== void 0 ? _b : 8443;
    let sign = (_c = options.sign) !== null && _c !== void 0 ? _c : false;
    let httpDebug = (_e = (_d = options.debug) === null || _d === void 0 ? void 0 : _d.includes("http")) !== null && _e !== void 0 ? _e : false;
    let tcpDebug = (_g = (_f = options.debug) === null || _f === void 0 ? void 0 : _f.includes("tcp")) !== null && _g !== void 0 ? _g : false;
    let deferredSecureContexts = new Array();
    let httpRequestListeners = new Array();
    let httpUpgradeListeners = new Array();
    let httpsRequestListeners = new Array();
    let httpsUpgradeListeners = new Array();
    let handledConnectionConfigs = new Array();
    let delegatedConnectionConfigs = new Array();
    for (let domain of (_h = options.domains) !== null && _h !== void 0 ? _h : []) {
        let root = (_j = domain.root) !== null && _j !== void 0 ? _j : "./";
        let key = domain.key;
        let cert = domain.cert;
        let pass = domain.pass;
        let host = (_k = domain.host) !== null && _k !== void 0 ? _k : "*";
        let handler = domain.handler;
        let routing = (_l = domain.routing) !== null && _l !== void 0 ? _l : true;
        let indices = (_m = domain.indices) !== null && _m !== void 0 ? _m : false;
        let httpHost = `http://${host}:${httpPort}`;
        let httpsHost = `https://${host}:${httpsPort}`;
        let deferredSecureContext = createDeferredSecureContext({
            host,
            key,
            cert,
            pass,
            sign
        });
        if (deferredSecureContext != null) {
            deferredSecureContexts.push(deferredSecureContext);
            httpRequestListeners.push({
                hostname: host,
                listener: makeRedirectRequestListener(httpsPort)
            });
            let cc = parseConnectionConfig(root, 80);
            if (cc != null) {
                if (exports.HTTP_PROTOCOLS.includes(cc.protocol)) {
                    process.stdout.write(`Proxying ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} requests for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
                    let agent = createAgent(cc, tcpDebug);
                    httpsRequestListeners.push({
                        hostname: host,
                        listener: makeProxyRequestListener(agent, cc, httpDebug)
                    });
                    httpsUpgradeListeners.push({
                        hostname: host,
                        listener: makeProxyUpgradeListener(agent, cc, httpDebug)
                    });
                }
                else if (exports.TCP_PROTOCOLS.includes(cc.protocol)) {
                    handledConnectionConfigs.push({
                        hostname: host,
                        connectionConfig: cc
                    });
                    process.stdout.write(`Proxying ${terminal.stylize("TCP", terminal.FG_MAGENTA)} connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
                }
            }
            else {
                if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
                    throw `Expected "${root}" to exist and be a directory!`;
                }
                process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpsHost, terminal.FG_YELLOW)}\n`);
                httpsRequestListeners.push({
                    hostname: host,
                    listener: makeRequestListener(root, handler, routing, indices)
                });
            }
        }
        else {
            let cc = parseConnectionConfig(root, 443);
            if (cc != null) {
                if (exports.HTTP_PROTOCOLS.includes(cc.protocol)) {
                    process.stdout.write(`Proxying ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} requests for ${terminal.stylize(httpHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
                    let agent = createAgent(cc, tcpDebug);
                    httpRequestListeners.push({
                        hostname: host,
                        listener: makeProxyRequestListener(agent, cc, httpDebug)
                    });
                    httpUpgradeListeners.push({
                        hostname: host,
                        listener: makeProxyUpgradeListener(agent, cc, httpDebug)
                    });
                }
                else if (exports.TCP_PROTOCOLS.includes(cc.protocol)) {
                    delegatedConnectionConfigs.push({
                        hostname: host,
                        connectionConfig: cc
                    });
                    process.stdout.write(`Proxying ${terminal.stylize("TCP", terminal.FG_MAGENTA)} connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)} (${terminal.stylize("E2EE", terminal.FG_GREEN)})\n`);
                    httpRequestListeners.push({
                        hostname: host,
                        listener: makeRedirectRequestListener(httpsPort)
                    });
                }
            }
            else {
                if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
                    throw `Expected "${root}" to exist and be a directory!`;
                }
                process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpHost, terminal.FG_YELLOW)}\n`);
                httpRequestListeners.push({
                    hostname: host,
                    listener: makeRequestListener(root, handler, routing, indices)
                });
            }
        }
    }
    return {
        deferredSecureContexts,
        httpRequestListeners,
        httpUpgradeListeners,
        httpsRequestListeners,
        httpsUpgradeListeners,
        handledConnectionConfigs,
        delegatedConnectionConfigs
    };
}
exports.createConfigFromOptions = createConfigFromOptions;
;
function createHttpServer(config, options) {
    var _a, _b;
    let tcpDebug = (_b = (_a = options.debug) === null || _a === void 0 ? void 0 : _a.includes("tcp")) !== null && _b !== void 0 ? _b : false;
    let httpRequestRouter = http.createServer({
        requestListeners: config.httpRequestListeners,
        upgradeListeners: config.httpUpgradeListeners
    });
    let httpServer = proxy.createServer({
        trustedRemoteAddresses: options.trust,
        debug: tcpDebug
    }, (clientSocket, proxyHeader) => {
        httpRequestRouter.emit("connection", clientSocket);
    });
    return httpServer;
}
exports.createHttpServer = createHttpServer;
;
function createHttpsServer(config, options) {
    var _a, _b;
    let tcpDebug = (_b = (_a = options.debug) === null || _a === void 0 ? void 0 : _a.includes("tcp")) !== null && _b !== void 0 ? _b : false;
    let httpsRequestRouter = http.createServer({
        requestListeners: config.httpsRequestListeners,
        upgradeListeners: config.httpsUpgradeListeners
    });
    let httpsServer = proxy.createServer({
        trustedRemoteAddresses: options.trust,
        debug: tcpDebug
    }, (clientSocket, proxyHeader) => __awaiter(this, void 0, void 0, function* () {
        try {
            let { servername, buffer } = yield tls.getServernameAndBuffer({
                socket: clientSocket,
                timeoutSeconds: TIMEOUT_SECONDS
            });
            let delegatedConnectionConfig = config.delegatedConnectionConfigs.find((delegatedConnectionConfig) => {
                return utils.matchesHostnamePattern(servername, delegatedConnectionConfig.hostname);
            });
            if (delegatedConnectionConfig != null) {
                let cc = delegatedConnectionConfig.connectionConfig;
                if (cc.protocol === "proxy:") {
                    proxyHeader = proxyHeader !== null && proxyHeader !== void 0 ? proxyHeader : proxy.createProxyHeader(clientSocket);
                    buffer = Buffer.concat([proxy.serializeHeader(proxyHeader), buffer]);
                }
                makeTcpProxyConnection(cc.hostname, cc.port, buffer, clientSocket, tcpDebug);
            }
            else {
                let deferredSecureContext = config.deferredSecureContexts.find((secureContext) => {
                    return utils.matchesHostnamePattern(servername, secureContext.host);
                });
                let secureContext = DEFAULT_SECURE_CONTEXT;
                if (deferredSecureContext != null) {
                    deferredSecureContext.load();
                    secureContext = deferredSecureContext.secureContext;
                }
                createTLSSocket(clientSocket, buffer, secureContext, (tlsSocket) => {
                    if (proxyHeader != null) {
                        proxy.setSourceAddress(tlsSocket, proxyHeader);
                        proxy.setTargetAddress(tlsSocket, proxyHeader);
                    }
                    let handledConnectionConfig = config.handledConnectionConfigs.find((handledConnectionConfig) => {
                        return utils.matchesHostnamePattern(servername, handledConnectionConfig.hostname);
                    });
                    if (handledConnectionConfig != null) {
                        let cc = handledConnectionConfig.connectionConfig;
                        if (exports.TCP_PROTOCOLS.includes(cc.protocol)) {
                            let buffer = Buffer.alloc(0);
                            if (cc.protocol === "proxy:") {
                                proxyHeader = proxyHeader !== null && proxyHeader !== void 0 ? proxyHeader : proxy.createProxyHeader(tlsSocket);
                                buffer = Buffer.concat([proxy.serializeHeader(proxyHeader), buffer]);
                            }
                            makeTcpProxyConnection(cc.hostname, cc.port, buffer, tlsSocket, tcpDebug);
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
            clientSocket.resetAndDestroy();
        }
    }));
    return httpsServer;
}
exports.createHttpsServer = createHttpsServer;
;
function makeServer(options) {
    var _a, _b;
    let config = createConfigFromOptions(options);
    let httpServer = createHttpServer(config, options);
    let httpsServer = createHttpsServer(config, options);
    httpServer.listen({
        port: (_a = options.http) !== null && _a !== void 0 ? _a : 8080,
        host: process.platform === "win32" ? "0.0.0.0" : undefined
    }, () => {
        let address = utils.getServerAddress(httpServer);
        process.stdout.write(`${terminal.stylize("HTTP", terminal.FG_MAGENTA)} router listening on ${terminal.stylize(utils.formatAddress(address), terminal.FG_YELLOW)}\n`);
    });
    httpsServer.listen({
        port: (_b = options.https) !== null && _b !== void 0 ? _b : 8443,
        host: process.platform === "win32" ? "0.0.0.0" : undefined
    }, () => {
        let address = utils.getServerAddress(httpsServer);
        process.stdout.write(`${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} router listening on ${terminal.stylize(utils.formatAddress(address), terminal.FG_YELLOW)}\n`);
    });
}
exports.makeServer = makeServer;
;
