import * as libnet from "net";
import * as terminal from "./terminal";
import * as utils from "./utils";

export type Header = {
	type: "TCP4" | "TCP6";
	source_address: string;
	target_address: string;
	source_port: number;
	target_port: number;
};

export function parseHeader(buffer: Buffer): { header?: Header; buffer: Buffer; } {
	if (buffer.subarray(0, 5).toString("ascii") !== "PROXY") {
		return {
			buffer
		};
	}
	let end = buffer.indexOf("\r\n", 0, "ascii");
	if (end < 0) {
		throw new Error(`Expected PROXY header to end with CRLF!`);
	}
	let parts = buffer.subarray(0, end).toString("ascii").split(" ");
	let [proxy, type, source_address, target_address, source_port, target_port] = parts;
	if (type === "TCP4") {
		if (parts.length !== 6) {
			throw new Error(`Expected PROXY header with TCP4 type to have exactly 4 arguments!`);
		}
		if (!libnet.isIPv4(source_address)) {
			throw new Error(`Expected PROXY header source address "${source_address}" to be a valid IPv4 address!`);
		}
		if (!libnet.isIPv4(target_address)) {
			throw new Error(`Expected PROXY header target address "${target_address}" to be a valid IPv4 address!`);
		}
	} else if (type === "TCP6") {
		if (parts.length !== 6) {
			throw new Error(`Expected PROXY header with TCP6 type to have exactly 4 arguments!`);
		}
		if (!libnet.isIPv6(source_address)) {
			throw new Error(`Expected PROXY header source address "${source_address}" to be a valid IPv6 address!`);
		}
		if (!libnet.isIPv6(target_address)) {
			throw new Error(`Expected PROXY header target address "${target_address}" to be a valid IPv6 address!`);
		}
	} else if (type === "UNKNOWN") {
		if (parts.length !== 2) {
			throw new Error(`Expected PROXY header with UNKNOWN type to have exactly 0 arguments!`);
		}
		return {
			buffer
		};
	} else {
		throw new Error(`Expected PROXY header type to be known!`);
	}
	let source_port_number = Number.parseInt(source_port);
	if (!(source_port_number >= 0 && source_port_number <= 65535)) {
		throw new Error(`Expected PROXY header source port ${source_port_number} to be a valid port number!`);
	}
	let target_port_number = Number.parseInt(target_port);
	if (!(target_port_number >= 0 && target_port_number <= 65535)) {
		throw new Error(`Expected PROXY header target port ${target_port_number} to be a valid port number!`);
	}
	return {
		header: {
			type: type,
			source_address: source_address,
			target_address: target_address,
			source_port: source_port_number,
			target_port: target_port_number
		},
		buffer: buffer.subarray(end + 2)
	};
};

export function serializeHeader(header: Header): Buffer {
	let string = [
		"PROXY",
		header.type,
		header.source_address,
		header.target_address,
		`${header.source_port}`,
		`${header.target_port}`
	].join(" ") + "\r\n"
	return Buffer.from(string, "ascii");
};

export function createProxyHeader(socket: libnet.Socket): Header {
	let remoteAddress = utils.getRemoteAddress(socket);
	let localAddress = utils.getLocalAddress(socket);
	return {
		type: remoteAddress.family === "IPv4" ? "TCP4" : "TCP6",
		source_address: remoteAddress.address,
		target_address: localAddress.address,
		source_port: remoteAddress.port,
		target_port: localAddress.port
	};
};

export function createTargetAddress(header: Header): libnet.AddressInfo {
	return {
		family: header.type === "TCP4" ? "IPv4" : "IPv6",
		address: header.target_address,
		port: header.target_port
	};
};

export function createSourceAddress(header: Header): libnet.AddressInfo {
	return {
		family: header.type === "TCP4" ? "IPv4" : "IPv6",
		address: header.source_address,
		port: header.source_port
	};
};

const SOURCE_KEY = Symbol();

export function getSourceAddress(socket: libnet.Socket): libnet.AddressInfo | undefined {
	if (SOURCE_KEY in socket) {
		return socket[SOURCE_KEY] as libnet.AddressInfo;
	}
};

export function setSourceAddress(socket: libnet.Socket, header: Header): void {
	delete (socket as any)[SOURCE_KEY];
	let sourceAddress = createSourceAddress(header);
	Object.defineProperty(socket, SOURCE_KEY, {
		value: sourceAddress,
		configurable: true
	});
};

const TARGET_KEY = Symbol();

export function getTargetAddress(socket: libnet.Socket): libnet.AddressInfo | undefined {
	if (TARGET_KEY in socket) {
		return socket[TARGET_KEY] as libnet.AddressInfo;
	}
};

export function setTargetAddress(socket: libnet.Socket, header: Header): void {
	delete (socket as any)[TARGET_KEY];
	let targetAddress = createTargetAddress(header);
	Object.defineProperty(socket, TARGET_KEY, {
		value: targetAddress,
		configurable: true
	});
};

const CONNECTION_ID_KEY = Symbol();

export function getConnectionId(socket: libnet.Socket): string | undefined {
	if (CONNECTION_ID_KEY in socket) {
		return socket[CONNECTION_ID_KEY] as string;
	}
};

export function setConnectionId(socket: libnet.Socket, connectionId: string | undefined): void {
	delete (socket as any)[CONNECTION_ID_KEY];
	Object.defineProperty(socket, CONNECTION_ID_KEY, {
		value: connectionId,
		configurable: true
	});
};

export type Server = libnet.Server;

export type ConnectionListener = (socket: libnet.Socket, header: Header | undefined) => void;

export type Options = {
	trustedRemoteAddresses: Array<string>;
	debug: boolean;
};

export function getServerAddress(server: libnet.Server): libnet.AddressInfo {
	let address = server.address();
	if (address == null || typeof address === "string") {
		throw new Error(`Expected type AddressInfo!`);
	}
	return address;
};

export function setupConnectionLogging(socket: libnet.Socket): void {
	let localAddress = utils.getLocalAddress(socket);
	process.stderr.write(`Client connection ${getConnectionId(socket)} ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(utils.formatAddress(localAddress), terminal.FG_YELLOW)}` + "\n");
	socket.once("close", (had_error) => {
		process.nextTick(() => {
			process.stderr.write(`Client connection ${getConnectionId(socket)} ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(utils.formatAddress(localAddress), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
		});
	});
	socket.on("error", (error) => {
		process.stderr.write(`Client connection ${getConnectionId(socket) ?? "-"} emitted error event with message "${error.message}"` + "\n");
	});
};

export function createServer(options: Partial<Options>, connectionListener: ConnectionListener): Server {
	let trustedRemoteAddresses = options?.trustedRemoteAddresses ?? [];
	let debug = options.debug ?? false;
	return libnet.createServer({
		allowHalfOpen: true
	}, (socket) => {
		let remoteAddress = utils.getRemoteAddress(socket);
		setConnectionId(socket, `${remoteAddress.port}`);
		if (debug) {
			setupConnectionLogging(socket);
		}
		socket.on("error", (error) => {}); // NOTE: Prevent errors from being thrown.
		socket.on("data", function ondata(chunk: Buffer): void {
			socket.off("data", ondata);
			try {
				let { header, buffer } = parseHeader(chunk);
				if (header != null) {
					let matchingTrustedRemoteAddress = trustedRemoteAddresses.find((trustedRemoteAddress) => {
						return utils.normalizeToIPv6(trustedRemoteAddress) === utils.normalizeToIPv6(remoteAddress.address);
					});
					if (matchingTrustedRemoteAddress == null) {
						header = undefined;
					}
				}
				socket.unshift(buffer);
				if (header != null) {
					setSourceAddress(socket, header);
					setTargetAddress(socket, header);
				}
				connectionListener(socket, header);
			} catch (error) {
				socket.resetAndDestroy();
			}
		});
	});
};
