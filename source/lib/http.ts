import * as libhttp from "http";
import * as libnet from "net";
import * as utils from "./utils";

export type RequestListener = libhttp.RequestListener;
export type UpgradeListener = (request: libhttp.IncomingMessage, socket: libnet.Socket, head: Buffer) => void;

const DEFAULT_REQUEST_LISTENER: RequestListener = (request, response) => {
	response.writeHead(404);
	response.end();
};

const DEFAULT_UPGRADE_LISTENER: UpgradeListener = (request, socket, head) => {
	socket.end();
};

export type Server = libhttp.Server;

export type RequestListenerAndHostname = {
	hostname: string;
	listener: RequestListener;
};

export type UpgradeListenerAndHostname = {
	hostname: string;
	listener: UpgradeListener;
};

export type Options = {
	requestListeners?: Array<RequestListenerAndHostname>;
	upgradeListeners?: Array<UpgradeListenerAndHostname>;
	httpKeepAliveTimeoutSeconds?: number;
};

export function createServer(options: Options): Server {
	let requestListeners = options.requestListeners ?? [];
	let upgradeListeners = options.upgradeListeners ?? [];
	let httpKeepAliveTimeoutSeconds = options.httpKeepAliveTimeoutSeconds ?? 60;
	let server = libhttp.createServer({});
	server.keepAliveTimeout = httpKeepAliveTimeoutSeconds * 1000;
	server.on("request", ((request, response) => {
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let requestListener = requestListeners.find((requestListener) => {
			return utils.matchesHostnamePattern(hostname, requestListener.hostname);
		})?.listener ?? DEFAULT_REQUEST_LISTENER;
		return requestListener(request, response);
	}) satisfies RequestListener);
	server.on("upgrade", ((request, socket, head) => {
		let hostname = (request.headers.host ?? "localhost").split(":")[0];
		let upgradeListener = upgradeListeners.find((upgradeListener) => {
			return utils.matchesHostnamePattern(hostname, upgradeListener.hostname);
		})?.listener ?? DEFAULT_UPGRADE_LISTENER;
		return upgradeListener(request, socket, head);
	}) satisfies UpgradeListener);
	return server;
};
