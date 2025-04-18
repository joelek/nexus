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
exports.makeServer = exports.parseServernameConnectionConfig = exports.getServerPort = exports.makeTlsProxyConnection = exports.makeTcpProxyConnection = exports.connectSockets = exports.matchesHostnamePattern = exports.makeRedirectRequestListener = exports.makeRequestListener = exports.makeReadStreamResponse = exports.makeDirectoryListingResponse = exports.renderDirectoryListing = exports.formatSize = exports.makeStylesheet = exports.encodeXMLText = exports.computeSimpleHash = exports.loadConfig = exports.Handler = exports.Options = exports.Domain = void 0;
const autoguard = require("@joelek/autoguard/dist/lib-server");
const multipass = require("@joelek/multipass/dist/mod");
const libcp = require("child_process");
const libfs = require("fs");
const libhttp = require("http");
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
const terminal = require("./terminal");
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
function connectSockets(serverSocket, clientSocket, head) {
    serverSocket.on("error", () => {
        clientSocket.end();
    });
    serverSocket.on("end", () => {
        clientSocket.end();
    });
    clientSocket.on("error", () => {
        serverSocket.end();
    });
    clientSocket.on("end", () => {
        serverSocket.end();
    });
    serverSocket.write(head, () => {
        serverSocket.on("data", (buffer) => {
            clientSocket.write(buffer);
        });
        clientSocket.on("data", (buffer) => {
            serverSocket.write(buffer);
        });
    });
}
exports.connectSockets = connectSockets;
;
function makeTcpProxyConnection(host, port, head, clientSocket) {
    let serverSocket = libnet.connect({
        host,
        port
    });
    serverSocket.on("connect", () => {
        clientSocket.on("error", () => {
            serverSocket.end();
        });
        clientSocket.on("end", () => {
            serverSocket.end();
        });
        serverSocket.write(head, () => {
            serverSocket.on("data", (buffer) => {
                clientSocket.write(buffer);
            });
            clientSocket.on("data", (buffer) => {
                serverSocket.write(buffer);
            });
        });
    });
    serverSocket.on("error", () => {
        clientSocket.end();
    });
    serverSocket.on("end", () => {
        clientSocket.end();
    });
    return serverSocket;
}
exports.makeTcpProxyConnection = makeTcpProxyConnection;
;
function makeTlsProxyConnection(host, port, head, clientSocket) {
    let serverSocket = libtls.connect({
        host,
        port
    });
    serverSocket.on("secureConnect", () => {
        clientSocket.on("error", () => {
            serverSocket.end();
        });
        clientSocket.on("end", () => {
            serverSocket.end();
        });
        serverSocket.write(head, () => {
            serverSocket.on("data", (buffer) => {
                clientSocket.write(buffer);
            });
            clientSocket.on("data", (buffer) => {
                serverSocket.write(buffer);
            });
        });
    });
    serverSocket.on("error", () => {
        clientSocket.end();
    });
    serverSocket.on("end", () => {
        clientSocket.end();
    });
    return serverSocket;
}
exports.makeTlsProxyConnection = makeTlsProxyConnection;
;
function getServerPort(server) {
    let address = server.address();
    if (address == null || typeof address === "string") {
        throw `Expected type AddressInfo!`;
    }
    return address.port;
}
exports.getServerPort = getServerPort;
;
function parseServernameConnectionConfig(root, defaultPort) {
    let url = new liburl.URL(root);
    if (url.username !== "" || url.password !== "" || url.pathname !== "" || url.search !== "" || url.hash !== "") {
        throw `Expected a protocol-agnostic URI!`;
    }
    let protocol = url.protocol;
    let hostname = url.hostname;
    let port = Number.parseInt(url.port, 10);
    if (Number.isNaN(port)) {
        port = undefined;
    }
    if (protocol === "pipe:") {
        return {
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
const TLS_PLAINTEXT_MAX_SIZE_BYTES = 16384;
function makeServer(options) {
    var _a, _b, _c, _d, _e, _f, _g;
    let http = (_a = options.http) !== null && _a !== void 0 ? _a : 8080;
    let https = (_b = options.https) !== null && _b !== void 0 ? _b : 8443;
    let defaultSecureContext = libtls.createSecureContext();
    let defaultRequestListener = (request, response) => {
        response.writeHead(404);
        response.end();
    };
    let secureContexts = new Array();
    let httpRequestListeners = new Array();
    let httpsRequestListeners = new Array();
    let handledServernameConnectionConfigs = new Array();
    let delegatedServernameConnectionConfigs = new Array();
    for (let domain of (_c = options.domains) !== null && _c !== void 0 ? _c : []) {
        let root = (_d = domain.root) !== null && _d !== void 0 ? _d : "./";
        let key = domain.key;
        let cert = domain.cert;
        let pass = domain.pass;
        let host = (_e = domain.host) !== null && _e !== void 0 ? _e : "*";
        let handler = domain.handler;
        let routing = (_f = domain.routing) !== null && _f !== void 0 ? _f : true;
        let indices = (_g = domain.indices) !== null && _g !== void 0 ? _g : false;
        let httpHost = `http://${host}:${http}`;
        let httpsHost = `https://${host}:${https}`;
        if (key || cert) {
            let secureContext = {
                host,
                secureContext: defaultSecureContext,
                dirty: true,
                load() {
                    if (this.dirty) {
                        process.stdout.write(`Loading certificate for ${terminal.stylize(host, terminal.FG_YELLOW)}\n`);
                        this.secureContext = libtls.createSecureContext({
                            key: key ? libfs.readFileSync(key) : undefined,
                            cert: cert ? libfs.readFileSync(cert) : undefined,
                            passphrase: pass
                        });
                        this.dirty = false;
                    }
                }
            };
            if (key) {
                libfs.watch(key, () => {
                    secureContext.dirty = true;
                });
            }
            if (cert) {
                libfs.watch(cert, () => {
                    secureContext.dirty = true;
                });
            }
            secureContexts.push(secureContext);
            try {
                let servernameConnectionConfig = parseServernameConnectionConfig(root, 80);
                handledServernameConnectionConfigs.push([host, servernameConnectionConfig]);
                process.stdout.write(`Delegating connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
                let httpRequestListener = makeRedirectRequestListener(https);
                httpRequestListeners.push([host, httpRequestListener]);
                continue;
            }
            catch (error) { }
            if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
                throw `Expected "${root}" to exist and be a directory!`;
            }
            process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpsHost, terminal.FG_YELLOW)}\n`);
            let httpRequestListener = makeRedirectRequestListener(https);
            httpRequestListeners.push([host, httpRequestListener]);
            let httpsRequestListener = makeRequestListener(root, handler, routing, indices);
            httpsRequestListeners.push([host, httpsRequestListener]);
        }
        else {
            try {
                let servernameConnectionConfig = parseServernameConnectionConfig(root, 443);
                delegatedServernameConnectionConfigs.push([host, servernameConnectionConfig]);
                process.stdout.write(`Delegating connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)} (${terminal.stylize("E2EE", terminal.FG_GREEN)})\n`);
                let httpRequestListener = makeRedirectRequestListener(https);
                httpRequestListeners.push([host, httpRequestListener]);
                continue;
            }
            catch (error) { }
            if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
                throw `Expected "${root}" to exist and be a directory!`;
            }
            if (options.sign) {
                let days = 1;
                let secureContext = {
                    host,
                    secureContext: defaultSecureContext,
                    dirty: true,
                    load() {
                        if (this.dirty) {
                            process.stdout.write(`Generating certificate for ${terminal.stylize(host, terminal.FG_YELLOW)}\n`);
                            let key = multipass.rsa.generatePrivateKey();
                            let cert = multipass.pem.serialize({
                                sections: [
                                    {
                                        label: "CERTIFICATE",
                                        buffer: multipass.x509.generateSelfSignedCertificate([host], key, {
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
                secureContexts.push(secureContext);
                process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpsHost, terminal.FG_YELLOW)}\n`);
                let httpRequestListener = makeRedirectRequestListener(https);
                httpRequestListeners.push([host, httpRequestListener]);
                let httpsRequestListener = makeRequestListener(root, handler, routing, indices);
                httpsRequestListeners.push([host, httpsRequestListener]);
            }
            else {
                process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpHost, terminal.FG_YELLOW)}\n`);
                let httpRequestListener = makeRequestListener(root, handler, routing, indices);
                httpRequestListeners.push([host, httpRequestListener]);
            }
        }
    }
    let httpsRequestRouter = libhttp.createServer({}, (request, response) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let requestListener = (_c = (_b = httpsRequestListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : defaultRequestListener;
        return requestListener(request, response);
    });
    httpsRequestRouter.listen(undefined, () => {
        process.stdout.write(`Request router listening on port ${terminal.stylize(getServerPort(httpsRequestRouter), terminal.FG_CYAN)}\n`);
    });
    let certificateRouter = libtls.createServer({
        SNICallback: (hostname, callback) => {
            var _a;
            let secureContext = secureContexts.find((pair) => matchesHostnamePattern(hostname, pair.host));
            secureContext === null || secureContext === void 0 ? void 0 : secureContext.load();
            return callback(null, (_a = secureContext === null || secureContext === void 0 ? void 0 : secureContext.secureContext) !== null && _a !== void 0 ? _a : defaultSecureContext);
        }
    }, (clientSocket) => {
        var _a;
        let hostname = "localhost";
        let servername = clientSocket.servername;
        if (typeof servername === "string") {
            hostname = servername;
        }
        let servernameConnectionConfig = (_a = handledServernameConnectionConfigs.find((pair) => matchesHostnamePattern(hostname, pair[0]))) === null || _a === void 0 ? void 0 : _a[1];
        if (servernameConnectionConfig != null) {
            let { hostname, port } = Object.assign({}, servernameConnectionConfig);
            makeTcpProxyConnection(hostname, port, Buffer.alloc(0), clientSocket);
            return;
        }
        makeTcpProxyConnection("localhost", getServerPort(httpsRequestRouter), Buffer.alloc(0), clientSocket);
    });
    certificateRouter.listen(undefined, () => {
        process.stdout.write(`Certificate router listening on port ${terminal.stylize(getServerPort(certificateRouter), terminal.FG_CYAN)}\n`);
    });
    let servernameRouter = libnet.createServer({}, (clientSocket) => {
        clientSocket.on("error", () => {
            clientSocket.end();
        });
        let buffer = Buffer.alloc(0);
        clientSocket.on("data", function ondata(chunk) {
            var _a;
            buffer = Buffer.concat([buffer, chunk]);
            try {
                let tlsPlaintext = tls.parseTlsPlaintext({
                    buffer: buffer,
                    offset: 0
                });
                try {
                    let hostname = tls.getServername(tlsPlaintext);
                    let servernameConnectionConfig = (_a = delegatedServernameConnectionConfigs.find((pair) => matchesHostnamePattern(hostname, pair[0]))) === null || _a === void 0 ? void 0 : _a[1];
                    if (servernameConnectionConfig != null) {
                        let { hostname, port } = Object.assign({}, servernameConnectionConfig);
                        clientSocket.off("data", ondata);
                        makeTcpProxyConnection(hostname, port, buffer, clientSocket);
                        return;
                    }
                }
                catch (error) { }
                clientSocket.off("data", ondata);
                makeTcpProxyConnection("localhost", getServerPort(certificateRouter), buffer, clientSocket);
            }
            catch (error) {
                if (buffer.length > TLS_PLAINTEXT_MAX_SIZE_BYTES) {
                    clientSocket.off("data", ondata);
                    clientSocket.end();
                }
            }
        });
    });
    servernameRouter.listen(https, () => {
        process.stdout.write(`Servername router listening on port ${terminal.stylize(getServerPort(servernameRouter), terminal.FG_CYAN)}\n`);
    });
    let httpRequestRouter = libhttp.createServer({}, (request, response) => {
        var _a, _b, _c;
        let hostname = ((_a = request.headers.host) !== null && _a !== void 0 ? _a : "localhost").split(":")[0];
        let requestListener = (_c = (_b = httpRequestListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : defaultRequestListener;
        return requestListener(request, response);
    });
    httpRequestRouter.listen(http, () => {
        process.stdout.write(`Request router listening on port ${terminal.stylize(getServerPort(httpRequestRouter), terminal.FG_CYAN)}\n`);
    });
}
exports.makeServer = makeServer;
;
