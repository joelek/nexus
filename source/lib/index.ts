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
import * as http from "./http";
import * as proxy from "./proxy";
import * as terminal from "./terminal";
import * as utils from "./utils";

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

export function makeRequestListener(pathPrefix: string, handler: Handler | undefined, clientRouting: boolean, generateIndices: boolean, logger: utils.Logger): libhttp.RequestListener {
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
			logger.log("system", `${terminal.stylize(response.statusCode, response.statusCode >= 400 ? terminal.FG_RED : terminal.FG_GREEN)} ${terminal.stylize(method, terminal.FG_MAGENTA)} ${terminal.stylize(url, terminal.FG_YELLOW)} (${terminal.stylize(duration, terminal.FG_CYAN)} ms)`);
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
	let sourceAddress = proxy.getSourceAddress(request.socket) ?? utils.getRemoteAddress(request.socket);
	headers.push("X-Forwarded-For", sourceAddress.address);
	return headers;
};

export function setupServerRequestLogging(clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, serverRequest: libhttp.ClientRequest, logger: utils.Logger): void {
	clientRequest.on("error", (error) => {
		logger.log("http", `Client request emitted error event with message "${error.message}"`);
	});
	clientRequest.on("close", () => {
		logger.log("http", `Client request emitted close event`);
	});
	clientRequest.on("end", () => {
		logger.log("http", `Client request emitted end event`);
	});
	clientResponse.on("error", (error) => {
		logger.log("http", `Client response emitted error event with message "${error.message}"`);
	});
	clientResponse.on("finish", () => {
		logger.log("http", `Client response emitted finish event`);
	});
	clientResponse.on("close", () => {
		logger.log("http", `Client response emitted close event`);
	});
	serverRequest.on("response", (serverResponse) => {
		logger.log("http", `Server request emitted response event`);
		serverResponse.on("error", (error) => {
			logger.log("http", `Server response emitted error event with message "${error.message}"`);
		});
		serverResponse.on("end", () => {
			logger.log("http", `Server response emitted end event`);
		});
		serverResponse.on("close", () => {
			logger.log("http", `Server response emitted close event`);
		});
	});
	serverRequest.on("timeout", () => {
		logger.log("http", `Server request emitted timeout event`);
	});
	serverRequest.on("upgrade", (serverResponse, serverSocket, serverHead) => {
		logger.log("http", `Server request emitted upgrade event`);
	});
	serverRequest.on("error", (error) => {
		logger.log("http", `Server request emitted error event with message "${error.message}"`);
	});
	serverRequest.on("finish", () => {
		logger.log("http", `Server request emitted finish event`);
	});
	serverRequest.on("close", () => {
		logger.log("http", `Server request emitted close event`);
	});
};

export function makeServerRequest(agent: libhttp.Agent, clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, cc: ConnectionConfig, logger: utils.Logger): libhttp.ClientRequest {
	let rawHeaders = createProxyRawHeaders(clientRequest, {});
	let serverRequest = (cc.protocol === "https:" ? libhttps : libhttp).request({
		host: cc.hostname,
		port: cc.port,
		agent,
		method: clientRequest.method,
		path: clientRequest.url,
		headers: rawHeaders as any,
		rejectUnauthorized: !cc.trusted
	});
	if (logger.isLoggingEnabled("http")) {
		setupServerRequestLogging(clientRequest, clientResponse, serverRequest, logger);
	}
	let timeout = setTimeout(() => {
		serverRequest.destroy(new TimeoutError("connect", TIMEOUT_SECONDS));
	}, TIMEOUT_SECONDS * 1000);
	serverRequest.on("response", (serverResponse) => {
		clearTimeout(timeout);
		clientResponse.writeHead(serverResponse.statusCode ?? 200, serverResponse.rawHeaders);
		serverResponse.pipe(clientResponse);
	});
	serverRequest.on("error", (error) => {
		clearTimeout(timeout);
		if (clientResponse.headersSent) {
			clientResponse.destroy(); // NOTE: Propagate server closing prematurely.
		} else {
			clientResponse.writeHead(error instanceof TimeoutError || (error as NodeJS.ErrnoException).code === "ETIMEDOUT" ? 504 : 502);
			clientResponse.end();
		}
	});
	clientResponse.on("close", () => {
		serverRequest.destroy(); // NOTE: Propagate client closing prematurely.
	});
	clientRequest.pipe(serverRequest);
	return serverRequest;
};

export function makeProxyRequestListener(agent: libhttp.Agent, cc: ConnectionConfig, logger: utils.Logger): libhttp.RequestListener {
	return (clientRequest, clientResponse) => {
		makeServerRequest(agent, clientRequest, clientResponse, cc, logger);
	};
};

export function makeProxyUpgradeListener(agent: libhttp.Agent, cc: ConnectionConfig, logger: utils.Logger): http.UpgradeListener {
	return (clientRequest, clientSocket, clientHead) => {
		let clientResponse = new libhttp.ServerResponse(clientRequest);
		clientResponse.assignSocket(clientSocket);
		let serverRequest = makeServerRequest(agent, clientRequest, clientResponse, cc, logger);
		serverRequest.on("upgrade", (serverResponse, serverSocket, serverHead) => {
			clientResponse.writeHead(serverResponse.statusCode ?? 200, serverResponse.rawHeaders);
			clientResponse.end();
			connectProxySockets(clientSocket, serverSocket, logger);
			serverSocket.write(clientHead);
			clientSocket.write(serverHead);
		});
	};
};

export type ConnectionConfig = {
	protocol: string,
	hostname: string,
	port: number,
	trusted: boolean
};

export type ConnectionConfigAndHostname = {
	hostname: string;
	connectionConfig: ConnectionConfig;
};

export const TCP_PROTOCOLS = [
	"pipe:",
	"proxy:"
];

export const HTTP_PROTOCOLS = [
	"http:",
	"https:"
];

export function parseConnectionConfig(root: string, defaultPort: number, trustedRemoteAddresses: Array<string>): ConnectionConfig | undefined {
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
			hostname: hostname,
			port: port ?? defaultPort,
			trusted: utils.isTrusted(hostname, trustedRemoteAddresses)
		};
	} else if (HTTP_PROTOCOLS.includes(protocol)) {
		return {
			protocol: protocol,
			hostname: hostname,
			port: port ?? defaultPort,
			trusted: utils.isTrusted(hostname, trustedRemoteAddresses)
		};
	} else {
		throw new Error(`Expected a supported protocol!`);
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

export function setupProxySocketsLogging(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket, logger: utils.Logger): void {
	serverSocket.on("end", () => {
		logger.log("tcp", `Server connection ${proxy.getConnectionId(serverSocket)} emitted end event`);
	});
	serverSocket.on("close", (had_error) => {
		logger.log("tcp", `Server connection ${proxy.getConnectionId(serverSocket)} emitted close event ${had_error ? "with error" : "without error"}`);
	});
	clientSocket.on("close", (had_error) => {
		logger.log("tcp", `Client connection ${proxy.getConnectionId(clientSocket)} emitted close event ${had_error ? "with error" : "without error"}`);
	});
	clientSocket.on("end", () => {
		logger.log("tcp", `Client connection ${proxy.getConnectionId(clientSocket)} emitted end event`);
	});
};

export function connectProxySockets(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket, logger: utils.Logger): void {
	if (logger.isLoggingEnabled("tcp")) {
		setupProxySocketsLogging(clientSocket, serverSocket, logger);
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
	let serverSocketDestroyTimeout: NodeJS.Timeout | undefined;
	let clientSocketDestroyTimeout: NodeJS.Timeout | undefined;
	function closeServer() {
		if (serverSocket.writable) {
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
			clientSocketDestroyTimeout = setTimeout(() => {
				destroySocket(clientSocket);
			}, TIMEOUT_SECONDS * 1000);
			clientSocket.end();
		} else {
			destroySocket(clientSocket);
		}
	}
	serverSocket.on("close", (had_error) => {
		clearTimeout(serverSocketDestroyTimeout);
		if (had_error) {
			destroySocket(clientSocket);
		} else {
			closeClient();
		}
	});
	clientSocket.on("close", (had_error) => {
		clearTimeout(clientSocketDestroyTimeout);
		if (had_error) {
			destroySocket(serverSocket);
		} else {
			closeServer();
		}
	});
	clientSocket.on("end", () => {
		closeServer();
	});
	serverSocket.on("end", () => {
		closeClient();
	});
};

export async function connectTls(options: libnet.TcpNetConnectOpts & { rejectUnauthorized?: boolean; }, timeout_seconds: number, logger: utils.Logger): Promise<libtls.TLSSocket> {
	let serverSocket = connectTcp(options, timeout_seconds, logger);
	let tlsSocket = await new Promise<libtls.TLSSocket>((resolve, reject) => {
		serverSocket.once("connect", () => {
			let tlsSocket = libtls.connect({
				socket: serverSocket,
				servername: options.host,
				rejectUnauthorized: options.rejectUnauthorized
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
};

export function connectTcp(options: libnet.TcpNetConnectOpts, timeout_seconds: number, logger: utils.Logger): libnet.Socket {
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
		logger.log("tcp", `Server connection ${proxy.getConnectionId(serverSocket)} ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(utils.formatAddress(remoteAddress), terminal.FG_YELLOW)}`);
		serverSocket.once("close", (had_error) => {
			process.nextTick(() => {
				logger.log("tcp", `Server connection ${proxy.getConnectionId(serverSocket)} ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(utils.formatAddress(remoteAddress), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}`);
			});
		});
	});
	serverSocket.on("error", (error) => {
		logger.log("tcp", `Server connection ${proxy.getConnectionId(serverSocket)} emitted error event with message "${error.message}"`);
	});
	return serverSocket;
};

export function makeTcpProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket, logger: utils.Logger): libnet.Socket {
	let serverSocket = connectTcp({
		host,
		port
	}, TIMEOUT_SECONDS, logger);
	serverSocket.write(head);
	connectProxySockets(clientSocket, serverSocket, logger);
	return serverSocket;
};

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

export function createTLSSocket(clientSocket: libnet.Socket, buffer: Buffer, secureContext: libtls.SecureContext, callback: (tlsSocket: libtls.TLSSocket) => void) {
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
};

export abstract class DeferredSecureContext {
	protected host: string;

	constructor(host: string) {
		this.host = host;
	}

	abstract getSecureContext(logger: utils.Logger): libtls.SecureContext;

	matchesHostname(hostname: string): boolean {
		return utils.matchesHostnamePattern(hostname, this.host);
	}
};

export class CertificateDeferredSecureContext extends DeferredSecureContext {
	protected key: string | undefined;
	protected cert: string | undefined;
	protected pass: string | undefined;
	protected secureContext: libtls.SecureContext | undefined;

	constructor(host: string, key: string | undefined, cert: string | undefined, pass: string | undefined) {
		super(host);
		this.key = key;
		this.cert = cert;
		this.pass = pass;
		this.secureContext = undefined;
		if (key) {
			libfs.watch(key, () => {
				this.secureContext = undefined;
			});
		}
		if (cert) {
			libfs.watch(cert, () => {
				this.secureContext = undefined;
			});
		}
	}

	getSecureContext(logger: utils.Logger): libtls.SecureContext {
		if (this.secureContext == null) {
			logger.log("system", `Loading certificate for ${terminal.stylize(this.host, terminal.FG_YELLOW)}`);
			this.secureContext = libtls.createSecureContext({
				key: this.key ? libfs.readFileSync(this.key) : undefined,
				cert: this.cert ? libfs.readFileSync(this.cert) : undefined,
				passphrase: this.pass
			});
		}
		return this.secureContext;
	}
};

export function generateSelfSignedCertificate(host: string, days: number): { key: string; cert: string; } {
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
	return {
		key: key.export({
			format: "pem",
			type: "pkcs1"
		}) as string,
		cert: cert
	};
};

export class SelfSignedDeferredSecureContext extends DeferredSecureContext {
	protected days: number;
	protected secureContext: libtls.SecureContext | undefined;

	constructor(host: string, days: number) {
		super(host);
		this.days = days;
		this.secureContext = undefined;
	}

	getSecureContext(logger: utils.Logger): libtls.SecureContext {
		if (this.secureContext == null) {
			logger.log("system", `Generating certificate for ${terminal.stylize(this.host, terminal.FG_YELLOW)}`);
			this.secureContext = libtls.createSecureContext(generateSelfSignedCertificate(this.host, this.days));
			setTimeout(() => {
				this.secureContext = undefined;
			}, this.days * 24 * 60 * 60 * 1000);
		}
		return this.secureContext;
	}
};

export function createDeferredSecureContext(options: {
	host: string;
	key?: string;
	cert?: string;
	pass?: string;
	sign: boolean;
}): DeferredSecureContext | undefined {
	if (options.key || options.cert) {
		return new CertificateDeferredSecureContext(options.host, options.key, options.cert, options.pass);
	}
	if (options.sign) {
		return new SelfSignedDeferredSecureContext(options.host, 1);
	}
};

export function createAgent(cc: ConnectionConfig, logger: utils.Logger): libhttp.Agent | libhttps.Agent {
	if (cc.protocol === "http:") {
		let agent = new libhttp.Agent({
			keepAlive: true
		});
		agent.createConnection = (options, callback) => {
			let serverSocket = connectTcp({
				host: options.host,
				port: options.port
			} as any, TIMEOUT_SECONDS, logger);
			if (callback != null) {
				serverSocket.once("connect", () => {
					callback(null, serverSocket);
				});
			}
			return null;
		};
		return agent;
	} else {
		let agent = new libhttps.Agent({
			keepAlive: true,
			rejectUnauthorized: !cc.trusted
		});
		agent.createConnection = (options, callback) => {
			connectTls({
				host: options.host,
				port: options.port,
				rejectUnauthorized: options.rejectUnauthorized
			} as any, TIMEOUT_SECONDS, logger).catch((error: Error) => error).then((tlsSocketOrError) => {
				if (callback != null) {
					if (tlsSocketOrError instanceof libtls.TLSSocket) {
						callback(null, tlsSocketOrError);
					} else {
						callback(tlsSocketOrError, null as any);
					}
				}
			});
			return null;
		};
		return agent;
	}
};

const DEFAULT_SECURE_CONTEXT = libtls.createSecureContext();

export type Config = {
	logger: utils.Logger;
	deferredSecureContexts: Array<DeferredSecureContext>;
	httpRequestListeners: Array<http.RequestListenerAndHostname>;
	httpUpgradeListeners: Array<http.UpgradeListenerAndHostname>;
	httpsRequestListeners: Array<http.RequestListenerAndHostname>;
	httpsUpgradeListeners: Array<http.UpgradeListenerAndHostname>;
	handledConnectionConfigs: Array<ConnectionConfigAndHostname>;
	delegatedConnectionConfigs: Array<ConnectionConfigAndHostname>;
};

export function createConfigFromOptions(options: Options): Config {
	let httpPort = options.http ?? 8080;
	let httpsPort = options.https ?? 8443;
	let sign = options.sign ?? false;
	let trust = options.trust ?? [];
	let logger = new utils.Logger(options.log ?? []);
	let deferredSecureContexts = new Array<DeferredSecureContext>();
	let httpRequestListeners = new Array<http.RequestListenerAndHostname>();
	let httpUpgradeListeners = new Array<http.UpgradeListenerAndHostname>();
	let httpsRequestListeners = new Array<http.RequestListenerAndHostname>();
	let httpsUpgradeListeners = new Array<http.UpgradeListenerAndHostname>();
	let handledConnectionConfigs = new Array<ConnectionConfigAndHostname>();
	let delegatedConnectionConfigs = new Array<ConnectionConfigAndHostname>();
	for (let domain of options.domains ?? []) {
		let root = domain.root ?? "./";
		let key = domain.key;
		let cert = domain.cert;
		let pass = domain.pass;
		let host = domain.host ?? "*";
		let handler = domain.handler;
		let routing = domain.routing ?? true;
		let indices = domain.indices ?? false;
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
			let cc = parseConnectionConfig(root, 80, trust);
			if (cc != null) {
				if (HTTP_PROTOCOLS.includes(cc.protocol)) {
					logger.log("system", `Proxying ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} requests for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}`);
					let agent = createAgent(cc, logger);
					httpsRequestListeners.push({
						hostname: host,
						listener: makeProxyRequestListener(agent, cc, logger)
					});
					httpsUpgradeListeners.push({
						hostname: host,
						listener:  makeProxyUpgradeListener(agent, cc, logger)
					});
				} else if (TCP_PROTOCOLS.includes(cc.protocol)) {
					logger.log("system", `Proxying ${terminal.stylize("TCP", terminal.FG_MAGENTA)} connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}`);
					handledConnectionConfigs.push({
						hostname: host,
						connectionConfig: cc
					});
				}
			} else {
				if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
					throw new Error(`Expected "${root}" to exist and be a directory!`);
				}
				logger.log("system", `Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpsHost, terminal.FG_YELLOW)}`);
				httpsRequestListeners.push({
					hostname: host,
					listener: makeRequestListener(root, handler, routing, indices, logger)
				});
			}
		} else {
			let cc = parseConnectionConfig(root, 443, trust);
			if (cc != null) {
				if (HTTP_PROTOCOLS.includes(cc.protocol)) {
					logger.log("system", `Proxying ${terminal.stylize("HTTP", terminal.FG_MAGENTA)} requests for ${terminal.stylize(httpHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)}`);
					let agent = createAgent(cc, logger);
					httpRequestListeners.push({
						hostname: host,
						listener: makeProxyRequestListener(agent, cc, logger)
					});
					httpUpgradeListeners.push({
						hostname: host,
						listener: makeProxyUpgradeListener(agent, cc, logger)
					});
				} else if (TCP_PROTOCOLS.includes(cc.protocol)) {
					logger.log("system", `Proxying ${terminal.stylize("TCP", terminal.FG_MAGENTA)} connections for ${terminal.stylize(httpsHost, terminal.FG_YELLOW)} to ${terminal.stylize(root, terminal.FG_YELLOW)} (${terminal.stylize("E2EE", terminal.FG_GREEN)})`);
					delegatedConnectionConfigs.push({
						hostname: host,
						connectionConfig: cc
					});
					httpRequestListeners.push({
						hostname: host,
						listener: makeRedirectRequestListener(httpsPort)
					});
				}
			} else {
				if (!libfs.existsSync(root) || !libfs.statSync(root).isDirectory()) {
					throw new Error(`Expected "${root}" to exist and be a directory!`);
				}
				logger.log("system", `Serving ${terminal.stylize("\"" + root + "\"", terminal.FG_YELLOW)} at ${terminal.stylize(httpHost, terminal.FG_YELLOW)}`);
				httpRequestListeners.push({
					hostname: host,
					listener: makeRequestListener(root, handler, routing, indices, logger)
				});
			}
		}
	}
	return {
		logger,
		deferredSecureContexts,
		httpRequestListeners,
		httpUpgradeListeners,
		httpsRequestListeners,
		httpsUpgradeListeners,
		handledConnectionConfigs,
		delegatedConnectionConfigs
	};
};

export function createHttpServer(config: Config, options: Options): proxy.Server {
	let httpRequestRouter = http.createServer({
		requestListeners: config.httpRequestListeners,
		upgradeListeners: config.httpUpgradeListeners
	});
	let httpServer = proxy.createServer({
		trustedRemoteAddresses: options.trust,
		logger: config.logger
	}, (clientSocket, proxyHeader) => {
		httpRequestRouter.emit("connection", clientSocket);
	});
	return httpServer;
};

export function createHttpsServer(config: Config, options: Options): proxy.Server {
	let logger = config.logger;
	let httpsRequestRouter = http.createServer({
		requestListeners: config.httpsRequestListeners,
		upgradeListeners: config.httpsUpgradeListeners
	});
	let httpsServer = proxy.createServer({
		trustedRemoteAddresses: options.trust,
		logger: logger
	}, async (clientSocket, proxyHeader) => {
		try {
			let { servername, buffer } = await tls.getServernameAndBuffer({
				socket: clientSocket,
				timeoutSeconds: TIMEOUT_SECONDS
			});
			let delegatedConnectionConfig = config.delegatedConnectionConfigs.find((delegatedConnectionConfig) => {
				return utils.matchesHostnamePattern(servername, delegatedConnectionConfig.hostname);
			});
			if (delegatedConnectionConfig != null) {
				let cc = delegatedConnectionConfig.connectionConfig;
				if (cc.protocol === "proxy:") {
					proxyHeader = proxyHeader ?? proxy.createProxyHeader(clientSocket);
					buffer = Buffer.concat([proxy.serializeHeader(proxyHeader), buffer]);
				}
				makeTcpProxyConnection(cc.hostname, cc.port, buffer, clientSocket, logger);
			} else {
				let deferredSecureContext = config.deferredSecureContexts.find((secureContext) => {
					return secureContext.matchesHostname(servername);
				});
				let secureContext = DEFAULT_SECURE_CONTEXT;
				if (deferredSecureContext != null) {
					secureContext = deferredSecureContext.getSecureContext(logger);
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
						if (TCP_PROTOCOLS.includes(cc.protocol)) {
							let buffer = Buffer.alloc(0);
							if (cc.protocol === "proxy:") {
								proxyHeader = proxyHeader ?? proxy.createProxyHeader(tlsSocket);
								buffer = Buffer.concat([proxy.serializeHeader(proxyHeader), buffer]);
							}
							makeTcpProxyConnection(cc.hostname, cc.port, buffer, tlsSocket, logger);
						} else {
							httpsRequestRouter.emit("connection", tlsSocket);
						}
					} else {
						httpsRequestRouter.emit("connection", tlsSocket);
					}
				});
			}
		} catch (error) {
			clientSocket.resetAndDestroy();
		}
	});
	return httpsServer;
};

export function makeServer(options: Options): void {
	let config = createConfigFromOptions(options);
	let logger = config.logger;
	let httpServer = createHttpServer(config, options);
	let httpsServer = createHttpsServer(config, options);
	httpServer.listen({
		port: options.http ?? 8080,
		host: process.platform === "win32" ? "0.0.0.0" : undefined
	}, () => {
		let address = utils.getServerAddress(httpServer);
		logger.log("system", `${terminal.stylize("HTTP", terminal.FG_MAGENTA)} server listening on ${terminal.stylize(utils.formatAddress(address), terminal.FG_YELLOW)}`);
	});
	httpsServer.listen({
		port: options.https ?? 8443,
		host: process.platform === "win32" ? "0.0.0.0" : undefined
	}, () => {
		let address = utils.getServerAddress(httpsServer);
		logger.log("system", `${terminal.stylize("HTTPS", terminal.FG_MAGENTA)} server listening on ${terminal.stylize(utils.formatAddress(address), terminal.FG_YELLOW)}`);
	});
};
