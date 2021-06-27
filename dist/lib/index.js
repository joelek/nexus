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
exports.serve = exports.renderDirectoryListing = exports.formatSize = exports.makeStylesheet = exports.encodeXMLText = void 0;
const autoguard = require("@joelek/ts-autoguard");
const libhttp = require("http");
const libserver = require("./api/server");
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
			padding: 1rem;
		}

		a {
			color: rgb(191, 191, 191);
			border-radius: 4px;
			display: grid;
			gap: 1rem;
			grid-template-columns: 1fr auto;
			padding: 1rem;
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
			font-size: 1rem;
			line-height: 1.25;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	`.replace(/\s+/g, " ");
}
exports.makeStylesheet = makeStylesheet;
;
function formatSize(size) {
    let prefixes = ["", "k", "M", "G", "T"];
    for (let i = prefixes.length - 1; i >= 0; i--) {
        let factor = Math.pow(1024, i);
        if (size > factor * 10) {
            return `${Math.round(size / factor)} ${prefixes[i]}B`;
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
            return `<a href="${encodeURIComponent(entry.name)}/"><p>${encodeXMLText(entry.name)}/</p><p></p></a>`;
        }),
        ...files.map((entry) => {
            return `<a href="${encodeURIComponent(entry.name)}"><p>${encodeXMLText(entry.name)}</p><p>${formatSize(entry.size)}</p></a>`;
        }),
        `</body>`,
        `</html>`,
    ].join("");
}
exports.renderDirectoryListing = renderDirectoryListing;
;
function serve(pathPrefix, port) {
    let api = libserver.makeServer({
        getStaticContent: (request) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            let options = request.options();
            let pathSuffix = ((_a = options.filename) !== null && _a !== void 0 ? _a : []).join("/");
            try {
                return autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
            }
            catch (error) {
                if (error === 404) {
                    let directoryListing = autoguard.api.makeDirectoryListing(pathPrefix, pathSuffix, request);
                    return {
                        status: 200,
                        headers: {
                            "Content-Type": "text/html; charset=utf-8"
                        },
                        payload: autoguard.api.serializeStringPayload(renderDirectoryListing(directoryListing))
                    };
                }
                throw error;
            }
        })
    });
    let server = libhttp.createServer({}, api);
    server.listen(port, () => {
        process.stdout.write(`Serving "${pathPrefix}" at http://localhost:${port}/"\n`);
    });
    return server;
}
exports.serve = serve;
;
