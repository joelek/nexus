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
exports.serve = exports.makeServer = exports.makeRequestListener = exports.makeDirectoryListingResponse = exports.renderDirectoryListing = exports.formatSize = exports.makeStylesheet = exports.encodeXMLText = exports.computeSimpleHash = void 0;
const autoguard = require("@joelek/ts-autoguard/dist/lib-server");
const libhttp = require("http");
const libpath = require("path");
const libserver = require("./api/server");
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
        `<base href="/${components.map((component) => encodeURIComponent(component)).join("/")}"/>`,
        `<meta charset="utf-8"/>`,
        `<meta content="width=device-width,initial-scale=1.0" name="viewport"/>`,
        `<style>${makeStylesheet()}</style>`,
        `<title>${components.join("/")}</title>`,
        `<head>`,
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
            "Content-Type": "text/html; charset=utf-8"
        },
        payload: autoguard.api.serializeStringPayload(renderDirectoryListing(directoryListing))
    };
}
exports.makeDirectoryListingResponse = makeDirectoryListingResponse;
;
function makeRequestListener(options) {
    var _a, _b;
    let pathPrefix = options.pathPrefix;
    let clientRouting = (_a = options.clientRouting) !== null && _a !== void 0 ? _a : false;
    let generateIndices = (_b = options.generateIndices) !== null && _b !== void 0 ? _b : true;
    return libserver.makeServer({
        getRequest(request) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                let options = request.options();
                let pathSuffix = ((_a = options.filename) !== null && _a !== void 0 ? _a : []).join("/");
                try {
                    return autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
                }
                catch (error) {
                    if (error !== 404) {
                        throw error;
                    }
                }
                if (clientRouting) {
                    try {
                        return autoguard.api.makeReadStreamResponse(pathPrefix, "index.html", request);
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
            });
        },
        headRequest(request) {
            return __awaiter(this, void 0, void 0, function* () {
                let response = yield this.getRequest(request);
                return Object.assign(Object.assign({}, response), { payload: [] });
            });
        }
    });
}
exports.makeRequestListener = makeRequestListener;
;
function makeServer(options) {
    let pathPrefix = options.pathPrefix;
    let port = options.port;
    let server = libhttp.createServer({}, makeRequestListener(options));
    server.listen(port, () => {
        process.stdout.write(`Serving "${pathPrefix}" at http://localhost:${port}/"\n`);
    });
    return server;
}
exports.makeServer = makeServer;
;
// TODO: Remove compatibility shim in v2.
function serve(pathPrefix, port) {
    return makeServer({
        pathPrefix,
        port
    });
}
exports.serve = serve;
;
