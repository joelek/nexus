import * as autoguard from "@joelek/autoguard/dist/lib-server";
import * as multipass from "@joelek/multipass/dist/mod";
import * as libcp from "child_process";
import * as libfs from "fs";
import * as libhttp from "http";
import * as libhttps from "https";
import * as libnet from "net";
import * as libpath from "path";
import * as libtls from "tls";
import * as liburl from "url";
import * as libserver from "./api/server";
import { Domain, Options, Handler } from "./config";
export { Domain, Options, Handler } from "./config";
import * as tls from "./tls";
import * as proxy from "./proxy";
import * as terminal from "./terminal";

const CONNECTION_DEBUG = false;
const PROXY_DEBUG = false;
const TCP_DEBUG = false;
const TIMEOUT_SECONDS = 10;

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

function defaultRequestHandler(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>, clientRouting: boolean, generateIndices: boolean): autoguard.api.EndpointResponse & {
	payload: autoguard.api.Binary;
} {
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
}

function getGitRootParts(pathPrefix: string, pathSuffix: string): Array<string> | undefined {
	let gitRootParts: Array<string> = [];
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
};

function gitRequestHandler(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>, clientRouting: boolean, generateIndices: boolean): autoguard.api.EndpointResponse & {
	payload: autoguard.api.Binary;
} {
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
			let directoryListing: autoguard.api.DirectoryListing = {
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

const REQUEST_HANDLERS = {
	git: gitRequestHandler
};

export function makeRequestListener(pathPrefix: string, handler: Handler | undefined, clientRouting: boolean, generateIndices: boolean): libhttp.RequestListener {
	let requestListener = libserver.makeServer({
		async getRequest(request) {
			let options = request.options();
			let pathSuffixParts = libpath.normalize((options.filename ?? []).join("/")).split(libpath.sep);
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

export function createProxyRawHeaders(request: libhttp.IncomingMessage, overrides: Record<string, string>): Array<string> {
	let headers = new Array<string>();
	for (let i = 0; i < request.rawHeaders.length; i += 2) {
		let key = request.rawHeaders[i + 0];
		let value = request.rawHeaders[i + 1];
		if (key.toLowerCase() in overrides) {
			value = overrides[key.toLowerCase()];
		}
		headers.push(key, value);
	}
	if (request.socket.remoteAddress != null) {
		headers.push("X-Forwarded-For", request.socket.remoteAddress);
	}
	return headers;
};

export function makeProxyRequest(clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, scc: ServernameConnectionConfig): libhttp.ClientRequest {
	let rawHeaders = createProxyRawHeaders(clientRequest, {});
	let proxyRequest = (scc.protocol === "https:" ? libhttps : libhttp).request({
		host: scc.hostname,
		port: scc.port,
		timeout: 0, // NOTE: The global agent uses a default socket idle timeout of 5 seconds when timeout is unspecified.
		method: clientRequest.method,
		path: clientRequest.url,
		headers: rawHeaders as any
	});
	let timeout = setTimeout(() => {
		proxyRequest.emit("timeout");
	}, TIMEOUT_SECONDS * 1000);
	proxyRequest.on("response", (proxyResponse) => {
		clearTimeout(timeout);
		if (PROXY_DEBUG) process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("response", terminal.FG_CYAN)} event` + "\n");
		clientResponse.writeHead(proxyResponse.statusCode ?? 200, proxyResponse.rawHeaders);
		proxyResponse.pipe(clientResponse);
	});
	proxyRequest.on("timeout", () => {
		if (PROXY_DEBUG) process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("timeout", terminal.FG_CYAN)} event` + "\n");
		proxyRequest.destroy(new TimeoutError(TIMEOUT_SECONDS));
	});
	proxyRequest.on("error", (error) => {
		if (PROXY_DEBUG) process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("error", terminal.FG_CYAN)} event with message "${error.message}"` + "\n");
		clientResponse.writeHead(error instanceof TimeoutError || (error as any).code === "ETIMEDOUT" ? 504 : 502);
		clientResponse.end();
	});
	proxyRequest.on("close", () => {
		if (PROXY_DEBUG) process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("close", terminal.FG_CYAN)} event` + "\n");
	});
	clientRequest.pipe(proxyRequest);
	return proxyRequest;
};

export function makeProxyRequestListener(scc: ServernameConnectionConfig): libhttp.RequestListener {
	return (request, response) => {
		makeProxyRequest(request, response, scc);
	};
};

export function makeProxyUpgradeListener(scc: ServernameConnectionConfig): UpgradeListener {
	return (clientRequest, clientSocket, clientHead) => {
		let clientResponse = new libhttp.ServerResponse(clientRequest);
		clientResponse.assignSocket(clientSocket);
		let proxyRequest = makeProxyRequest(clientRequest, clientResponse, scc);
		proxyRequest.on("upgrade", (serverResponse, serverSocket, serverHead) => {
			clientResponse.writeHead(serverResponse.statusCode ?? 200, serverResponse.rawHeaders);
			clientResponse.end();
			connectProxySockets(clientSocket, serverSocket);
			serverSocket.write(clientHead);
			clientSocket.write(serverHead);
		});
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

export function getServerAddress(server: libnet.Server): libnet.AddressInfo {
	let address = server.address();
	if (address == null || typeof address === "string") {
		throw `Expected type AddressInfo!`;
	}
	return address;
};

export type ServernameConnectionConfig = {
	protocol: string,
	hostname: string,
	port: number
};

export const TCP_PROTOCOLS = [
	"pipe:",
	"proxy:"
];

export const HTTP_PROTOCOLS = [
	"http:",
	"https:"
];

export function parseServernameConnectionConfig(root: string, defaultPort: number): ServernameConnectionConfig | undefined {
	let url!: liburl.URL;
	try {
		url = new liburl.URL(root);
	} catch (error) {
		return;
	}
	let protocol = url.protocol;
	let hostname = url.hostname;
	let port = Number.parseInt(url.port, 10) as number | undefined;
	if (Number.isNaN(port)) {
		port = undefined;
	}
	if (TCP_PROTOCOLS.includes(protocol)) {
		return {
			protocol: protocol,
			hostname,
			port: port ?? defaultPort
		};
	} else if (HTTP_PROTOCOLS.includes(protocol)) {
		return {
			protocol: protocol,
			hostname,
			port: port ?? defaultPort
		};
	} else {
		throw `Expected a supported protocol!`;
	}
};

export class TimeoutError extends Error {
	protected timeout_seconds: number;

	constructor(timeout_seconds: number) {
		super();
		this.timeout_seconds = timeout_seconds;
	}

	get message(): string {
		return `Expected action to succeed within ${this.timeout_seconds} seconds!`;
	}
};

export function endSocket(socket: libnet.Socket | libtls.TLSSocket, timeout_seconds: number): void {
	let timeout = setTimeout(() => {
		socket.destroy(new TimeoutError(timeout_seconds));
	}, timeout_seconds * 1000);
	socket.end(() => {
		clearTimeout(timeout);
	});
};

export function connectProxySockets(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket): void {
	serverSocket.on("data", (buffer) => {
		clientSocket.write(buffer);
	});
	clientSocket.on("data", (buffer) => {
		serverSocket.write(buffer);
	});
	serverSocket.on("close", (had_error) => {
		if (TCP_DEBUG) process.stdout.write(`TCP server emitted ${terminal.stylize("close", terminal.FG_CYAN)} event ${had_error ? "with error" : "without error"}` + "\n");
		endSocket(clientSocket, TIMEOUT_SECONDS); // NOTE: Initiate graceful close with client.
	});
	clientSocket.on("close", (had_error) => {
		if (TCP_DEBUG) process.stdout.write(`TCP client emitted ${terminal.stylize("close", terminal.FG_CYAN)} event ${had_error ? "with error" : "without error"}` + "\n");
		endSocket(serverSocket, TIMEOUT_SECONDS); // NOTE: Initiate graceful close with server.
	});
	serverSocket.on("error", (error) => {
		if (TCP_DEBUG) process.stdout.write(`TCP server emitted ${terminal.stylize("error", terminal.FG_CYAN)} event with message "${error.message}"` + "\n");
	});
	clientSocket.on("error", (error) => {
		if (TCP_DEBUG) process.stdout.write(`TCP client emitted ${terminal.stylize("error", terminal.FG_CYAN)} event with message "${error.message}"` + "\n");
	});
	clientSocket.on("end", () => {
		if (TCP_DEBUG) process.stdout.write(`TCP client emitted ${terminal.stylize("end", terminal.FG_CYAN)} event` + "\n");
		endSocket(clientSocket, TIMEOUT_SECONDS); // NOTE: Finalize graceful close initiated by client for half-open connections.
	});
	serverSocket.on("end", () => {
		if (TCP_DEBUG) process.stdout.write(`TCP server emitted ${terminal.stylize("end", terminal.FG_CYAN)} event` + "\n");
		endSocket(serverSocket, TIMEOUT_SECONDS); // NOTE: Finalize graceful close initiated by server for half-open connections.
	});
};

export function connectTls(options: libtls.ConnectionOptions, timeout_seconds: number): libtls.TLSSocket {
	let serverSocket = libtls.connect(options);
	let timeout = setTimeout(() => {
		serverSocket.destroy(new TimeoutError(timeout_seconds));
	}, timeout_seconds * 1000);
	serverSocket.on("secureConnect", () => {
		clearTimeout(timeout);
		let address = proxy.getRemoteAddress(serverSocket);
		if (CONNECTION_DEBUG) process.stderr.write(`Outgoing ${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} connection ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)}` + "\n");
		serverSocket.on("close", (had_error) => {
			if (CONNECTION_DEBUG) process.stderr.write(`Outgoing ${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} connection ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
		});

	});
	return serverSocket;
};

export function makeTlsProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket): libtls.TLSSocket {
	let serverSocket = connectTls({
		host,
		port
	}, TIMEOUT_SECONDS);
	serverSocket.write(head);
	connectProxySockets(clientSocket, serverSocket);
	return serverSocket;
};

export function connectTcp(options: libnet.NetConnectOpts, timeout_seconds: number): libnet.Socket {
	let serverSocket = libnet.connect(options);
	let timeout = setTimeout(() => {
		serverSocket.destroy(new TimeoutError(timeout_seconds));
	}, timeout_seconds * 1000);
	serverSocket.on("connect", () => {
		clearTimeout(timeout);
		let address = proxy.getRemoteAddress(serverSocket);
		if (CONNECTION_DEBUG) process.stderr.write(`Outgoing ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} connection ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)}` + "\n");
		serverSocket.on("close", (had_error) => {
			if (CONNECTION_DEBUG) process.stderr.write(`Outgoing ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} connection ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(address), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
		});
	});
	return serverSocket;
};

export function makeTcpProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket): libnet.Socket {
	let serverSocket = connectTcp({
		host,
		port
	}, TIMEOUT_SECONDS);
	serverSocket.write(head);
	connectProxySockets(clientSocket, serverSocket);
	return serverSocket;
};

const TLS_PLAINTEXT_MAX_SIZE_BYTES = 16384;

export function handleTLS(clientSocket: libnet.Socket, buffer: Buffer, secureContext: libtls.SecureContext, callback: (tlsSocket: libtls.TLSSocket) => void) {
	clientSocket.pause(); // The socket has to be paused in order to properly delegate parsing to the TLS socket.
	clientSocket.unshift(buffer);
	let tlsSocket = new libtls.TLSSocket(clientSocket, {
		isServer: true,
		secureContext
	});
	tlsSocket.on("error", (error) => {}); // Prevent errors from being thrown. Socket is closed automatically.
	tlsSocket.on("secure", () => {
		callback(tlsSocket);
	});
};

export function formatAddress(address: libnet.AddressInfo): string {
	return address.family === "IPv4" ? `${address.address}:${address.port}` : `[${address.address}]:${address.port}`;
};

export type DeferredSecureContext = {
	host: string;
	secureContext: libtls.SecureContext;
	dirty: boolean;
	load: () => void;
};

export function createDeferredSecureContext(options: {
	host: string;
	key?: string;
	cert?: string;
	pass?: string;
	sign: boolean;
	defaultSecureContext: libtls.SecureContext;
}): DeferredSecureContext | undefined {
	if (options.key || options.cert) {
		let deferredSecureContext: DeferredSecureContext = {
			host: options.host,
			secureContext: options.defaultSecureContext,
			dirty: true,
			load() {
				if (this.dirty) {
					process.stdout.write(`Loading certificate for ${terminal.stylize(options.host, terminal.FG_YELLOW)}\n`);
					this.secureContext = libtls.createSecureContext({
						key: options.key ? libfs.readFileSync(options.key) : undefined,
						cert:options.cert ? libfs.readFileSync(options.cert) : undefined,
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
	} else if (options.sign) {
		let days = 1;
		let deferredSecureContext: DeferredSecureContext = {
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
};

type UpgradeListener = (request: libhttp.IncomingMessage, socket: libnet.Socket, head: Buffer) => void;

export function makeServer(options: Options): void {
	let http = options.http ?? 8080;
	let https = options.https ?? 8443;
	let sign = options.sign ?? false;
	let defaultSecureContext = libtls.createSecureContext();
	let defaultRequestListener: libhttp.RequestListener = (request, response) => {
		response.writeHead(404);
		response.end();
	};
	let defaultUpgradeListener: UpgradeListener = (request, socket, head) => {
		socket.end();
	};
	let secureContexts = new Array<DeferredSecureContext>();
	let httpRequestListeners = new Array<[string, libhttp.RequestListener]>();
	let httpUpgradeListeners = new Array<[string, UpgradeListener]>();
	let httpsRequestListeners = new Array<[string, libhttp.RequestListener]>();
	let httpsUpgradeListeners = new Array<[string, UpgradeListener]>();
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
				if (HTTP_PROTOCOLS.includes(servernameConnectionConfig.protocol)) {
					process.stdout.write(`Proxying ${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} requests for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
					let httpsRequestListener = makeProxyRequestListener(servernameConnectionConfig);
					httpsRequestListeners.push([host, httpsRequestListener]);;
					let httpsUpgradeListener = makeProxyUpgradeListener(servernameConnectionConfig);
					httpsUpgradeListeners.push([host, httpsUpgradeListener]);
				} else {
					process.stdout.write(`Proxying ${terminal.stylize("TCP", terminal.FG_MAGENTA)} connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
				}
			} else {
				if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
					throw `Expected "${root}" to exist and be a directory!`;
				}
				process.stdout.write(`Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpsHost, terminal.FG_YELLOW)}\n`);
				let httpsRequestListener = makeRequestListener(root, handler, routing, indices);
				httpsRequestListeners.push([host, httpsRequestListener]);
			}
		} else {
			let servernameConnectionConfig = parseServernameConnectionConfig(root, 443);
			if (servernameConnectionConfig != null) {
				delegatedServernameConnectionConfigs.push([host, servernameConnectionConfig]);
				if (HTTP_PROTOCOLS.includes(servernameConnectionConfig.protocol)) {
					process.stdout.write(`Proxying ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} requests for ${terminal.stylize(httpHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}\n`);
					let httpsRequestListener = makeProxyRequestListener(servernameConnectionConfig);
					httpRequestListeners.push([host, httpsRequestListener]);;
					let httpsUpgradeListener = makeProxyUpgradeListener(servernameConnectionConfig);
					httpUpgradeListeners.push([host, httpsUpgradeListener]);
				} else {
					process.stdout.write(`Proxying ${terminal.stylize("TCP", terminal.FG_MAGENTA)} connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)} (${terminal.stylize("E2EE", terminal.FG_GREEN)})\n`);
					let httpRequestListener = makeRedirectRequestListener(https);
					httpRequestListeners.push([host, httpRequestListener]);
				}
			} else {
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
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let requestListener = httpRequestListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))?.[1] ?? defaultRequestListener;
		return requestListener(request, response);
	});
	httpRequestRouter.keepAliveTimeout = 60 * 1000;
	httpRequestRouter.on("upgrade", (request, socket, head) => {
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let upgradeListener = httpUpgradeListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))?.[1] ?? defaultUpgradeListener;
		return upgradeListener(request, socket as libnet.Socket, head);
	});
	let httpsRequestRouter = libhttp.createServer({}, (request, response) => {
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let requestListener = httpsRequestListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))?.[1] ?? defaultRequestListener;
		return requestListener(request, response);
	});
	httpsRequestRouter.keepAliveTimeout = 60 * 1000;
	httpsRequestRouter.on("upgrade", (request, socket, head) => {
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let upgradeListener = httpsUpgradeListeners.find((pair) => matchesHostnamePattern(hostname, pair[0]))?.[1] ?? defaultUpgradeListener;
		return upgradeListener(request, socket as libnet.Socket, head);
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
		let buffer = Buffer.alloc(0);
		clientSocket.on("data", function ondata(chunk: Buffer): void {
			buffer = Buffer.concat([buffer, chunk]);
			try {
				let tlsPlaintext = tls.parseTlsPlaintext({
					buffer: buffer,
					offset: 0
				});
				clientSocket.off("data", ondata);
				let servername!: string;
				try {
					servername = tls.getServername(tlsPlaintext);
				} catch (error) {
					clientSocket.end();
					return;
				}
				let delegatedServernameConnectionConfig = delegatedServernameConnectionConfigs.find((pair) => {
					return matchesHostnamePattern(servername, pair[0]);
				})?.[1];
				if (delegatedServernameConnectionConfig != null) {
					let { protocol, hostname, port } = { ...delegatedServernameConnectionConfig };
					if (protocol === "proxy:") {
						proxyHeader = proxyHeader ?? proxy.createProxyHeader(clientSocket);
						buffer = Buffer.concat([proxy.serializeHeader(proxyHeader), buffer]);
					}
					makeTcpProxyConnection(hostname, port, buffer, clientSocket);
				} else {
					let secureContext = secureContexts.find((pair) => matchesHostnamePattern(servername, pair.host));
					secureContext?.load();
					handleTLS(clientSocket, buffer, secureContext?.secureContext ?? defaultSecureContext, (tlsSocket) => {
						let handledServernameConnectionConfig = handledServernameConnectionConfigs.find((pair) => {
							return matchesHostnamePattern(servername, pair[0]);
						})?.[1];
						if (handledServernameConnectionConfig != null) {
							let { protocol, hostname, port } = { ...handledServernameConnectionConfig };
							if (TCP_PROTOCOLS.includes(protocol)) {
								let buffer = Buffer.alloc(0);
								if (protocol === "proxy:") {
									proxyHeader = proxyHeader ?? proxy.createProxyHeader(tlsSocket);
									buffer = Buffer.concat([proxy.serializeHeader(proxyHeader), buffer]);
								}
								makeTcpProxyConnection(hostname, port, buffer, tlsSocket);
							} else {
								httpsRequestRouter.emit("connection", tlsSocket);
							}
						} else {
							httpsRequestRouter.emit("connection", tlsSocket);
						}
					});
				}
			} catch (error) {
				if (buffer.length > TLS_PLAINTEXT_MAX_SIZE_BYTES) {
					clientSocket.off("data", ondata);
					clientSocket.end();
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
};
