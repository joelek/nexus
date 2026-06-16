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
	let sourceAddress = proxy.getSourceAddress(request.socket) ?? proxy.getRemoteAddress(request.socket);
	headers.push("X-Forwarded-For", sourceAddress.address);
	return headers;
};

export function makeProxyRequest(clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, scc: ServernameConnectionConfig, debug: boolean): libhttp.ClientRequest {
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
		if (debug) {
			process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("response", terminal.FG_CYAN)} event` + "\n");
		}
		clientResponse.writeHead(proxyResponse.statusCode ?? 200, proxyResponse.rawHeaders);
		proxyResponse.pipe(clientResponse);
	});
	proxyRequest.on("timeout", () => {
		if (debug) {
			process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("timeout", terminal.FG_CYAN)} event` + "\n");
		}
		proxyRequest.destroy(new TimeoutError("destroy", TIMEOUT_SECONDS));
	});
	proxyRequest.on("error", (error) => {
		if (debug) {
			process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("error", terminal.FG_CYAN)} event with message "${error.message}"` + "\n");
		}
		clientResponse.writeHead(error instanceof TimeoutError || (error as any).code === "ETIMEDOUT" ? 504 : 502);
		clientResponse.end();
	});
	proxyRequest.on("close", () => {
		if (debug) {
			process.stdout.write(`HTTP proxy request emitted ${terminal.stylize("close", terminal.FG_CYAN)} event` + "\n");
		}
	});
	clientRequest.pipe(proxyRequest);
	return proxyRequest;
};

export function makeProxyRequestListener(scc: ServernameConnectionConfig, debug: boolean): libhttp.RequestListener {
	return (request, response) => {
		makeProxyRequest(request, response, scc, debug);
	};
};

export function makeProxyUpgradeListener(scc: ServernameConnectionConfig, debug: boolean): UpgradeListener {
	return (clientRequest, clientSocket, clientHead) => {
		let clientResponse = new libhttp.ServerResponse(clientRequest);
		clientResponse.assignSocket(clientSocket);
		let proxyRequest = makeProxyRequest(clientRequest, clientResponse, scc, debug);
		proxyRequest.on("upgrade", (serverResponse, serverSocket, serverHead) => {
			clientResponse.writeHead(serverResponse.statusCode ?? 200, serverResponse.rawHeaders);
			clientResponse.end();
			connectProxySockets(clientSocket, serverSocket, debug);
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
	protected action: string;
	protected timeout_seconds: number;

	constructor(action: string, timeout_seconds: number) {
		super();
		this.action = action;
		this.timeout_seconds = timeout_seconds;
	}

	get message(): string {
		return `Expected ${this.action} to succeed within ${this.timeout_seconds} seconds!`;
	}
};

// NOTE: Using resetAndDestroy() sends a RST close and sets SO_LINGER to 0 allowing immediate port re-use.
export function destroySocket(socket: libnet.Socket | libtls.TLSSocket): void {
	if (socket instanceof libtls.TLSSocket) {
		let underlying = getSocket(socket);
		if (underlying != null) {
			underlying.resetAndDestroy();
		} else {
			socket.destroy();
		}
	} else {
		socket.resetAndDestroy();
	}
};

export function connectProxySockets(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket, debug: boolean): void {
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
	let serverSocketDestroyTimeout: NodeJS.Timeout | undefined;
	let clientSocketDestroyTimeout: NodeJS.Timeout | undefined;
	function closeServer() {
		if (serverSocket.writable) {
			if (debug) {
				process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} closing...` + "\n");
			}
			serverSocketDestroyTimeout = setTimeout(() => {
				destroySocket(serverSocket);
			}, TIMEOUT_SECONDS * 1000);
			serverSocket.end();
		} else {
			destroySocket(serverSocket);
		}
	}
	function closeClient() {
		if (clientSocket.writable) {
			if (debug) {
				process.stderr.write(`Client connection ${proxy.getConnectionId(clientSocket)} closing...` + "\n");
			}
			clientSocketDestroyTimeout = setTimeout(() => {
				destroySocket(clientSocket);
			}, TIMEOUT_SECONDS * 1000);
			clientSocket.end();
		} else {
			destroySocket(clientSocket);
		}
	}
	serverSocket.on("close", (had_error) => {
		if (debug) {
			process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} emitted close event ${had_error ? "with error" : "without error"}` + "\n");
		}
		clearTimeout(serverSocketDestroyTimeout);
		if (had_error) {
			destroySocket(clientSocket);
		} else {
			closeClient();
		}
	});
	clientSocket.on("close", (had_error) => {
		if (debug) {
			process.stderr.write(`Client connection ${proxy.getConnectionId(clientSocket)} emitted close event ${had_error ? "with error" : "without error"}` + "\n");
		}
		clearTimeout(clientSocketDestroyTimeout);
		if (had_error) {
			destroySocket(serverSocket);
		} else {
			closeServer();
		}
	});
	clientSocket.on("end", () => {
		if (debug) {
			process.stderr.write(`Client connection ${proxy.getConnectionId(clientSocket)} emitted end event` + "\n");
		}
		closeServer();
	});
	serverSocket.on("end", () => {
		if (debug) {
			process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} emitted end event` + "\n");
		}
		closeClient();
	});
};

export function connectTls(options: libnet.TcpNetConnectOpts, timeout_seconds: number, debug: boolean): libtls.TLSSocket {
	let serverSocket = connectTcp(options, timeout_seconds, debug);
	let tlsSocket = new libtls.TLSSocket(serverSocket, {
		isServer: false,
	});
	proxy.setConnectionId(tlsSocket, "-");
	if (options.host != null) {
		tlsSocket.servername = options.host;
	}
	tlsSocket.on("error", (error) => {}); // Prevent errors from being thrown.
	tlsSocket.on("secureConnect", () => {
		proxy.setConnectionId(tlsSocket, proxy.getConnectionId(serverSocket));
	});
	setSocket(tlsSocket, serverSocket);
	return tlsSocket;
};

export function makeTlsProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket, debug: boolean): libtls.TLSSocket {
	let serverSocket = connectTls({
		host,
		port
	}, TIMEOUT_SECONDS, debug);
	serverSocket.write(head);
	connectProxySockets(clientSocket, serverSocket, debug);
	return serverSocket;
};

export function connectTcp(options: libnet.TcpNetConnectOpts, timeout_seconds: number, debug: boolean): libnet.Socket {
	let serverSocket = libnet.connect(options);
	let timeout = setTimeout(() => {
		serverSocket.destroy(new TimeoutError("connect", timeout_seconds));
	}, timeout_seconds * 1000);
	proxy.setConnectionId(serverSocket, "-");
	serverSocket.once("connect", () => {
		clearTimeout(timeout);
		let remoteAddress = proxy.getRemoteAddress(serverSocket);
		let localAddress = proxy.getLocalAddress(serverSocket);
		proxy.setConnectionId(serverSocket, `${localAddress.port}`);
		if (debug) {
			process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(proxy.formatAddress(remoteAddress), terminal.FG_YELLOW)}` + "\n");
		}
		serverSocket.once("close", (had_error) => {
			process.nextTick(() => {
				if (debug) {
					process.stderr.write(`Server connection ${proxy.getConnectionId(serverSocket)} ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(proxy.formatAddress(remoteAddress), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
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
};

export function makeTcpProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket, debug: boolean): libnet.Socket {
	let serverSocket = connectTcp({
		host,
		port
	}, TIMEOUT_SECONDS, debug);
	serverSocket.write(head);
	connectProxySockets(clientSocket, serverSocket, debug);
	return serverSocket;
};

const TLS_PLAINTEXT_MAX_SIZE_BYTES = 16384;

const SOCKET_KEY = Symbol();

export function getSocket(tlsSocket: libtls.TLSSocket): libnet.Socket | undefined {
	if (SOCKET_KEY in tlsSocket) {
		return tlsSocket[SOCKET_KEY] as libnet.Socket;
	}
};

export function setSocket(tlsSocket: libtls.TLSSocket, socket: libnet.Socket): void {
	delete (socket as any)[SOCKET_KEY];
	Object.defineProperty(tlsSocket, SOCKET_KEY, {
		value: socket,
		configurable: true
	});
};

export function handleTLS(clientSocket: libnet.Socket, buffer: Buffer, secureContext: libtls.SecureContext, callback: (tlsSocket: libtls.TLSSocket) => void) {
	clientSocket.pause(); // The socket has to be paused in order to properly delegate parsing to the TLS socket.
	clientSocket.unshift(buffer);
	let tlsSocket = new libtls.TLSSocket(clientSocket, {
		isServer: true,
		secureContext
	});
	proxy.setConnectionId(tlsSocket, "-");
	setSocket(tlsSocket, clientSocket);
	tlsSocket.on("error", (error) => {}); // Prevent errors from being thrown.
	tlsSocket.on("secure", () => {
		proxy.setConnectionId(tlsSocket, proxy.getConnectionId(clientSocket));
		callback(tlsSocket);
	});
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
	let httpDebug = options.debug?.includes("http") ?? false;
	let tcpDebug = options.debug?.includes("tcp") ?? false;
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
					let httpsRequestListener = makeProxyRequestListener(servernameConnectionConfig, httpDebug);
					httpsRequestListeners.push([host, httpsRequestListener]);;
					let httpsUpgradeListener = makeProxyUpgradeListener(servernameConnectionConfig, httpDebug);
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
					let httpsRequestListener = makeProxyRequestListener(servernameConnectionConfig, httpDebug);
					httpRequestListeners.push([host, httpsRequestListener]);;
					let httpsUpgradeListener = makeProxyUpgradeListener(servernameConnectionConfig, httpDebug);
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
	let httpRouter = proxy.createServer({
		trustedRemoteAddresses: options.trust,
		debug: tcpDebug
	}, (clientSocket, proxyHeader) => {
		httpRequestRouter.emit("connection", clientSocket);
	});
	httpRouter.listen({
		port: http,
		host: process.platform === "win32" ? "0.0.0.0" : undefined
	}, () => {
		let address = getServerAddress(httpRouter);
		process.stdout.write(`${terminal.stylize("HTTP", terminal.FG_MAGENTA)} router listening on ${terminal.stylize(proxy.formatAddress(address), terminal.FG_YELLOW)}\n`);
	});
	let httpsRouter = proxy.createServer({
		trustedRemoteAddresses: options.trust,
		debug: tcpDebug
	}, (clientSocket, proxyHeader) => {
		let timeout = setTimeout(() => {
			clientSocket.resetAndDestroy();
		}, TIMEOUT_SECONDS * 1000);
		let buffer = Buffer.alloc(0);
		clientSocket.on("data", function ondata(chunk: Buffer): void {
			buffer = Buffer.concat([buffer, chunk]);
			try {
				let tlsPlaintext = tls.parseTlsPlaintext({
					buffer: buffer,
					offset: 0
				});
				clearTimeout(timeout);
				clientSocket.off("data", ondata);
				let servername!: string;
				try {
					servername = tls.getServername(tlsPlaintext);
				} catch (error) {
					clientSocket.resetAndDestroy();
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
					makeTcpProxyConnection(hostname, port, buffer, clientSocket, tcpDebug);
				} else {
					let secureContext = secureContexts.find((pair) => matchesHostnamePattern(servername, pair.host));
					secureContext?.load();
					handleTLS(clientSocket, buffer, secureContext?.secureContext ?? defaultSecureContext, (tlsSocket) => {
						if (proxyHeader != null) {
							proxy.setSourceAddress(tlsSocket, proxyHeader);
							proxy.setTargetAddress(tlsSocket, proxyHeader);
						}
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
								makeTcpProxyConnection(hostname, port, buffer, tlsSocket, tcpDebug);
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
					clientSocket.resetAndDestroy();
				}
			}
		});
	});
	httpsRouter.listen({
		port: https,
		host: process.platform === "win32" ? "0.0.0.0" : undefined
	}, () => {
		let address = getServerAddress(httpsRouter);
		process.stdout.write(`${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} router listening on ${terminal.stylize(proxy.formatAddress(address), terminal.FG_YELLOW)}\n`);
	});
};
