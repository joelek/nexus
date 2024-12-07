import * as autoguard from "@joelek/ts-autoguard/dist/lib-server";
import * as multipass from "@joelek/multipass/dist/mod";
import * as libcp from "child_process";
import * as libfs from "fs";
import * as libhttp from "http";
import * as libnet from "net";
import * as libpath from "path";
import * as libtls from "tls";
import * as liburl from "url";
import * as libserver from "./api/server";
import { Domain, Options, Handler } from "./config";
export { Domain, Options, Handler } from "./config";
import * as tls from "./tls";
import * as terminal from "./terminal";

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
		return ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"'": "&#39;",
			"\"": "&quot;"
		} as Record<string, string>)[match] ?? match;
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
};

export function makeDirectoryListingResponse(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>): autoguard.api.EndpointResponse & {
	payload: autoguard.api.Binary;
} {
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
};

export function makeReadStreamResponse(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>): autoguard.api.EndpointResponse & {
	payload: autoguard.api.Binary;
} {
	let response = autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
	let ifModifiedSinceHeader = request.headers()?.["if-modified-since"];
	let lastModifiedHeader = response.headers?.["Last-Modified"];
	if (typeof ifModifiedSinceHeader === "string" && typeof lastModifiedHeader === "string") {
		let ifModifiedSince = new Date(ifModifiedSinceHeader);
		let lastModified = new Date(lastModifiedHeader);
		if (lastModified <= ifModifiedSince) {
			return {
				status: 304,
				headers: {
					...response.headers,
					"Cache-Control": "must-revalidate, max-age=0"
				},
				payload: []
			};
		}
	}
	return {
		...response,
		headers: {
			...response.headers,
			"Cache-Control": "must-revalidate, max-age=0"
		}
	};
};

function makeGitHandlerResponse(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>): autoguard.api.EndpointResponse & {
	payload: autoguard.api.Binary;
} {
	let pathSuffixParts = libpath.normalize(pathSuffix).split(libpath.sep);
	if (pathSuffixParts[0] === "..") {
		throw 400;
	}
	if (pathSuffixParts[0] === "" || pathSuffixParts[0] === ".") {
		return makeDirectoryListingResponse(pathPrefix, pathSuffix, request);
	}
	{
		let response = libcp.spawnSync("git", [
			"ls-tree", `HEAD:${pathSuffixParts.slice(1).join("/")}`
		], {
			cwd: `${pathPrefix}/${pathSuffixParts[0]}`,
			encoding: "utf-8"
		});
		if (response.status === 0) {
			let directoryListing: autoguard.api.DirectoryListing = {
				components: pathSuffixParts[pathSuffixParts.length - 1] === "" ? pathSuffixParts : [...pathSuffixParts, ""],
				directories: [],
				files: []
			};
			let lines = response.stdout.split(/\r?\n/);
			for (let line of lines) {
				let parts = /^([0-7]{6})\s+(tree|blob)\s+([0-9a-f]{40})\s+(.+)$/.exec(line);
				if (parts == null) {
					continue;
				}
				if (parts[2] === "tree") {
					directoryListing.directories.push({
						name: parts[4]
					});
					continue;
				}
				if (parts[2] === "blob") {
					directoryListing.files.push({
						name: parts[4],
						size: 0,
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
			"cat-file", "-p", `HEAD:${pathSuffixParts.slice(1).join("/")}`
		], {
			cwd: `${pathPrefix}/${pathSuffixParts[0]}`
		});
		if (response.status === 0) {
			return {
				status: 200,
				headers: {
					"Content-Type": autoguard.api.getContentTypeFromExtension(libpath.extname(pathSuffix)) ?? "text/plain",
					"Cache-Control": "must-revalidate, max-age=0",
					"Last-Modified": new Date().toUTCString()
				},
				payload: [response.stdout]
			};
		}
	}
	throw 404;
};

const HANDLERS = {
	git: makeGitHandlerResponse
};

export function makeRequestListener(pathPrefix: string, handler: Handler | undefined, clientRouting: boolean, generateIndices: boolean): libhttp.RequestListener {
	let requestListener = libserver.makeServer({
		async getRequest(request) {
			let options = request.options();
			let pathSuffix = (options.filename ?? []).join("/");
			if (handler != null) {
				return HANDLERS[handler](pathPrefix, pathSuffix, request);
			}
			try {
				return makeReadStreamResponse(pathPrefix, pathSuffix, request);
			} catch (error) {
				if (error !== 404) {
					throw error;
				}
			}
			if (clientRouting) {
				try {
					return makeReadStreamResponse(pathPrefix, "index.html", request);
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
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let path = request.url ?? "/";
		let method = request.method ?? "GET";
		let protocol = request.socket instanceof libtls.TLSSocket ? "https" : "http";
		let start = Date.now();
		response.on("finish", () => {
			let duration = Date.now() - start;
			let url = `${protocol}://${hostname}${path}`;
			process.stdout.write(`${terminal.stylize(response.statusCode, response.statusCode >= 400 ? terminal.FG_RED : terminal.FG_GREEN)} ${terminal.stylize(method, terminal.FG_MAGENTA)} ${terminal.stylize(url, terminal.FG_YELLOW)} (${terminal.stylize(duration, terminal.FG_CYAN)} ms)\n`);
		});
		requestListener(request, response);
	};
};

export function makeRedirectRequestListener(httpsPort: number): libhttp.RequestListener {
	return (request, response) => {
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let port = (request.headers.host ?? "localhost").split(":")[1] as string | undefined;
		let path = request.url ?? "/";
		port = port != null ? `:${httpsPort}` : "";
		response.writeHead(301, {
			"Location": `https://${hostname}${port}${path}`
		});
		response.end();
	};
};

export function matchesHostnamePattern(subject: string, pattern: string): boolean {
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

export function connectSockets(serverSocket: libnet.Socket | libtls.TLSSocket, clientSocket: libnet.Socket | libtls.TLSSocket, head: Buffer): void {
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
};

export function makeTcpProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket): libnet.Socket {
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
};

export function makeTlsProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket): libtls.TLSSocket {
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
};

export function getServerPort(server: libnet.Server): number {
	let address = server.address();
	if (address == null || typeof address === "string") {
		throw `Expected type AddressInfo!`;
	}
	return address.port;
};

export type ServernameConnectionConfig = {
	hostname: string,
	port: number
};

export function parseServernameConnectionConfig(root: string, defaultPort: number): ServernameConnectionConfig {
	let url = new liburl.URL(root);
	if (url.username !== "" || url.password !== "" || url.pathname !== "" || url.search !== "" || url.hash !== "") {
		throw `Expected a protocol-agnostic URI!`;
	}
	let protocol = url.protocol;
	let hostname = url.hostname;
	let port = Number.parseInt(url.port, 10) as number | undefined;
	if (Number.isNaN(port)) {
		port = undefined;
	}
	if (protocol === "pipe:") {
		return {
			hostname,
			port: port ?? defaultPort
		};
	} else {
		throw `Expected a supported protocol!`;
	}
};

export function makeServer(options: Options): void {
	let http = options.http ?? 8080;
	let https = options.https ?? 8443;
	let defaultSecureContext = libtls.createSecureContext();
	let defaultRequestListener: libhttp.RequestListener = (request, response) => {
		response.writeHead(404);
		response.end();
	};
	let secureContexts = new Array<{ host: string, secureContext: libtls.SecureContext, dirty: boolean, load: () => void }>();
	let httpRequestListeners = new Array<[string, libhttp.RequestListener]>();
	let httpsRequestListeners = new Array<[string, libhttp.RequestListener]>();
	let handledServernameConnectionConfigs = new Array<[string, ServernameConnectionConfig]>();
	let delegatedServernameConnectionConfigs = new Array<[string, ServernameConnectionConfig]>();
	for (let domain of options.domains ?? []) {
		let root = domain.root ?? "./";
		let key = domain.key;
		let cert = domain.cert;
		let pass = domain.pass;
		let host = domain.host ?? "*";
		let handler = domain.handler;
		let routing = domain.routing ?? true;
		let indices = domain.indices ?? false;
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
			} catch (error) {}
			if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
				throw `Expected "${root}" to exist and be a directory!`;
			}
			process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpsHost, terminal.FG_YELLOW)}\n`);
			let httpRequestListener = makeRedirectRequestListener(https);
			httpRequestListeners.push([host, httpRequestListener]);
			let httpsRequestListener = makeRequestListener(root, handler, routing, indices);
			httpsRequestListeners.push([host, httpsRequestListener]);
		} else {
			try {
				let servernameConnectionConfig = parseServernameConnectionConfig(root, 443);
				delegatedServernameConnectionConfigs.push([host, servernameConnectionConfig]);
				process.stdout.write(`Delegating connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)} (${terminal.stylize("E2EE", terminal.FG_GREEN)})\n`);
				let httpRequestListener = makeRedirectRequestListener(https);
				httpRequestListeners.push([host, httpRequestListener]);
				continue;
			} catch (error) {}
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
			} else {
				process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpHost, terminal.FG_YELLOW)}\n`);
				let httpRequestListener = makeRequestListener(root, handler, routing, indices);
				httpRequestListeners.push([host, httpRequestListener]);
			}
		}
	}
	let httpsRequestRouter = libhttp.createServer({}, (request, response) => {
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let requestListener = httpsRequestListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))?.[1] ?? defaultRequestListener;
		return requestListener(request, response);
	});
	httpsRequestRouter.listen(undefined, () => {
		process.stdout.write(`Request router listening on port ${terminal.stylize(getServerPort(httpsRequestRouter), terminal.FG_CYAN)}\n`);
	});
	let certificateRouter = libtls.createServer({
		SNICallback: (hostname, callback) => {
			let secureContext = secureContexts.find((pair) => matchesHostnamePattern(hostname, pair.host));
			secureContext?.load();
			return callback(null, secureContext?.secureContext ?? defaultSecureContext);
		}
	}, (clientSocket) => {
		let hostname = "localhost";
		let servername = (clientSocket as any).servername as any;
		if (typeof servername === "string") {
			hostname = servername;
		}
		let servernameConnectionConfig = handledServernameConnectionConfigs.find((pair) => matchesHostnamePattern(hostname, pair[0]))?.[1];
		if (servernameConnectionConfig != null) {
			let { hostname, port } = { ...servernameConnectionConfig };
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
		clientSocket.once("data", (head) => {
			try {
				let hostname = tls.getServername(head);
				let servernameConnectionConfig = delegatedServernameConnectionConfigs.find((pair) => matchesHostnamePattern(hostname, pair[0]))?.[1];
				if (servernameConnectionConfig != null) {
					let { hostname, port } = { ...servernameConnectionConfig };
					makeTcpProxyConnection(hostname, port, head, clientSocket);
					return;
				}
			} catch (error) {}
			makeTcpProxyConnection("localhost", getServerPort(certificateRouter), head, clientSocket);
		});
	});
	servernameRouter.listen(https, () => {
		process.stdout.write(`Servername router listening on port ${terminal.stylize(getServerPort(servernameRouter), terminal.FG_CYAN)}\n`);
	});
	let httpRequestRouter = libhttp.createServer({}, (request, response) => {
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let requestListener = httpRequestListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))?.[1] ?? defaultRequestListener;
		return requestListener(request, response);
	});
	httpRequestRouter.listen(http, () => {
		process.stdout.write(`Request router listening on port ${terminal.stylize(getServerPort(httpRequestRouter), terminal.FG_CYAN)}\n`);
	});
};
