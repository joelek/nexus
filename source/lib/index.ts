import * as autoguard from "@joelek/ts-autoguard/dist/lib-server";
import * as libfs from "fs";
import * as libhttp from "http";
import * as libhttps from "https";
import * as libnet from "net";
import * as libpath from "path";
import * as libtls from "tls";
import * as libserver from "./api/server";
import { Domain, Options } from "./config";
export { Domain, Options } from "./config";

export function loadConfig(config: string): Options {
	let string = libfs.readFileSync(config, "utf-8");
	let json = JSON.parse(string);
	return Options.as(json);
};

export function computeSimpleHash(string: string): number {
	let hash = string.length;
	for (let char of string) {
		let codePoint = char.codePointAt(0) ?? 0;
		hash *= 31;
		hash += codePoint;
	}
	return hash;
};

export function encodeXMLText(string: string): string {
	return string.replace(/[&<>'"]/g, (match) => {
		return {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"'": "&#39;",
			"\"": "&quot;"
		}[match] ?? match;
	});
};

export function makeStylesheet(): string {
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
};

export function formatSize(size: number): string {
	let units = ["B", "KiB", "MiB", "GiB", "TiB"];
	for (let i = units.length - 1; i >= 0; i--) {
		let factor = 1024 ** i;
		if (size > factor * 10) {
			return `${Math.round(size / factor)} ${units[i]}`;
		}
	}
	return `${size} B`;
};

export function renderDirectoryListing(directoryListing: autoguard.api.DirectoryListing): string {
	let { components, directories, files } = { ...directoryListing };
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
};

export function makeDirectoryListingResponse(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>): autoguard.api.EndpointResponse & {
	payload: autoguard.api.Binary;
} {
	let directoryListing = autoguard.api.makeDirectoryListing(pathPrefix, pathSuffix, request);
	return {
		status: 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8"
		},
		payload: autoguard.api.serializeStringPayload(renderDirectoryListing(directoryListing))
	};
};

export function makeRequestListener(pathPrefix: string, clientRouting: boolean, generateIndices: boolean): libhttp.RequestListener {
	let requestListener = libserver.makeServer({
		async getRequest(request) {
			let options = request.options();
			let pathSuffix = (options.filename ?? []).join("/");
			try {
				return autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
			} catch (error) {
				if (error !== 404) {
					throw error;
				}
			}
			if (clientRouting) {
				try {
					return autoguard.api.makeReadStreamResponse(pathPrefix, "index.html", request);
				} catch (error) {
					if (error !== 404) {
						throw error;
					}
				}
			}
			if (generateIndices) {
				try {
					return makeDirectoryListingResponse(pathPrefix, pathSuffix, request);
				} catch (error) {
					if (error !== 404) {
						throw error;
					}
				}
			}
			throw 404;
		},
		async headRequest(request) {
			let response = await this.getRequest(request);
			return {
				...response,
				payload: []
			};
		}
	});
	return (request, response) => {
		let host = (request.headers.host ?? "localhost").split(":")[0];
		let path = request.url ?? "/";
		let method = request.method ?? "GET";
		let protocol = request.socket instanceof libtls.TLSSocket ? "https" : "http";
		let start = Date.now();
		response.on("finish", () => {
			let duration = Date.now() - start;
			process.stdout.write(`${response.statusCode} ${method} ${protocol}://${host}${path} (${duration} ms)\n`);
		});
		requestListener(request, response);
	};
};

export function makeRedirectRequestListener(httpsPort: number): libhttp.RequestListener {
	return (request, response) => {
		let host = (request.headers.host ?? "localhost").split(":")[0];
		let port = (request.headers.host ?? "localhost").split(":")[1] as string | undefined;
		let path = request.url ?? "/";
		port = port != null ? `:${httpsPort}` : "";
		response.writeHead(301, {
			"Location": `https://${host}${port}${path}`
		});
		response.end();
	};
};

export function matchesHostPattern(subject: string, pattern: string): boolean {
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
};

export function makeServer(options: Options): void {
	let http = options.http ?? 8000;
	let https = options.https ?? 8443;
	let defaultSecureContext = libtls.createSecureContext();
	let defaultRequestListener: libhttp.RequestListener = (request, response) => {
		response.writeHead(404);
		response.end();
	};
	let secureContexts = new Array<{ host: string, secureContext: libtls.SecureContext, dirty: boolean, load: () => void }>();
	let httpRequestListeners = new Array<[string, libhttp.RequestListener]>();
	let httpsRequestListeners = new Array<[string, libhttp.RequestListener]>();
	for (let domain of options.domains ?? []) {
		let root = domain.root ?? "./";
		let key = domain.key;
		let cert = domain.cert;
		let host = domain.host ?? "*";
		let routing = domain.routing ?? false;
		let indices = domain.indices ?? false;
		if (key || cert) {
			process.stdout.write(`Configuring https://${host}:${https}\n`);
			let secureContext = {
				host,
				secureContext: defaultSecureContext,
				dirty: true,
				load() {
					if (this.dirty) {
						process.stdout.write(`Loading certificates for ${host}\n`);
						this.secureContext = libtls.createSecureContext({
							key: key ? libfs.readFileSync(key) : undefined,
							cert: cert ? libfs.readFileSync(cert) : undefined
						});
						this.dirty = false;
					}
				}
			};
			if (key) {
				libfs.watch(key, (next, last) => {
					secureContext.dirty = true;
				});
			}
			if (cert) {
				libfs.watch(cert, (next, last) => {
					secureContext.dirty = true;
				});
			}
			secureContexts.push(secureContext);
			let httpRequestListener = makeRedirectRequestListener(https);
			httpRequestListeners.push([host, httpRequestListener]);
			let httpsRequestListener = makeRequestListener(root, routing, indices);
			httpsRequestListeners.push([host, httpsRequestListener]);
		} else {
			process.stdout.write(`Configuring http://${host}:${http}\n`);
			let httpRequestListener = makeRequestListener(root, routing, indices);
			httpRequestListeners.push([host, httpRequestListener]);
		}
	}
	let httpsServer = libhttps.createServer({
		SNICallback: (sni, callback) => {
			let secureContext = secureContexts.find((pair) => matchesHostPattern(sni, pair.host));
			secureContext?.load();
			return callback(null, secureContext?.secureContext ?? defaultSecureContext);
		}
	}, (request, response) => {
		let host = (request.headers.host ?? "localhost").split(":")[0];
		let requestListener = httpsRequestListeners.find((pair) => matchesHostPattern(host, pair[0]))?.[1] ?? defaultRequestListener;
		return requestListener(request, response);
	});
	httpsServer.listen(https, () => {
		let address = httpsServer.address() as libnet.AddressInfo;
		process.stdout.write(`Listening on port ${address.port} (HTTPS).\n`);
	});
	let httpServer = libhttp.createServer({}, (request, response) => {
		let host = (request.headers.host ?? "localhost").split(":")[0];
		let requestListener = httpRequestListeners.find((pair) => matchesHostPattern(host, pair[0]))?.[1] ?? defaultRequestListener;
		return requestListener(request, response);
	});
	httpServer.listen(http, () => {
		let address = httpServer.address() as libnet.AddressInfo;
		process.stdout.write(`Listening on port ${address.port} (HTTP).\n`);
	});
};
