import * as libnet from "net";
import * as terminal from "./terminal";

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
		throw new Error();
	}
	let parts = buffer.subarray(0, end).toString("ascii").split(" ");
	if (parts.length < 2) {
		throw new Error();
	}
	let [proxy, type, source_address, target_address, source_port, target_port] = parts;
	if (type === "TCP4") {
		if (parts.length !== 6) {
			throw new Error();
		}
		if (!libnet.isIPv4(source_address)) {
			throw new Error();
		}
		if (!libnet.isIPv4(target_address)) {
			throw new Error();
		}
	} else if (type === "TCP6") {
		if (parts.length !== 6) {
			throw new Error();
		}
		if (!libnet.isIPv6(source_address)) {
			throw new Error();
		}
		if (!libnet.isIPv6(target_address)) {
			throw new Error();
		}
	} else if (type === "UNKNOWN") {
		return {
			buffer
		};
	} else {
		throw new Error();
	}
	let source_port_number = Number.parseInt(source_port);
	if (!(source_port_number >= 0 && source_port_number <= 65535)) {
		throw new Error();
	}
	let target_port_number = Number.parseInt(target_port);
	if (!(target_port_number >= 0 && target_port_number <= 65535)) {
		throw new Error();
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

export function getLocalAddress(socket: libnet.Socket): libnet.AddressInfo {
	let family = socket.localFamily;
	let address = socket.localAddress;
	let port = socket.localPort;
	if (address == null || family == null || port == null) {
		throw new Error(`Expected socket to have local address info!`);
	}
	return {
		family,
		address,
		port
	};
};

export function getRemoteAddress(socket: libnet.Socket): libnet.AddressInfo {
	let family = socket.remoteFamily;
	let address = socket.remoteAddress;
	let port = socket.remotePort;
	if (address == null || family == null || port == null) {
		throw new Error(`Expected socket to have remote address info!`);
	}
	return {
		family,
		address,
		port
	};
};

export function normalizeIPv6(ip: string): string {
	if (!libnet.isIPv6(ip)) {
		throw new Error(`Expected "${ip}" to be a valid IPv6 address!`);
	}
	let lastColonPosition = ip.lastIndexOf(":");
	if (lastColonPosition >= 0) {
		let prefix = ip.slice(0, lastColonPosition);
		let suffix = ip.slice(lastColonPosition + 1);
		if (libnet.isIPv4(suffix)) {
			let hex = suffix.split(".").map((part) => Number.parseInt(part, 10).toString(16).padStart(2, "0")).join("");
			let one = hex.slice(0, 4);
			let two = hex.slice(4, 8);
			ip = `${prefix}:${one}:${two}`;
		}
	}
	let groups = new Array<string>();
	let position = ip.indexOf("::");
	if (position >= 0) {
		let prefixGroups = ip.slice(0, position).split(":");
		let suffixGroups = ip.slice(position + 2).split(":");
		let zeroedGroups = new Array(8 - (prefixGroups.length + suffixGroups.length)).fill("0000");
		groups.push(...prefixGroups);
		groups.push(...zeroedGroups);
		groups.push(...suffixGroups);
	} else {
		groups.push(...ip.split(":"));
	}
	let normalizedIp = groups.map((group) => group.padStart(4, "0")).join(":").toLowerCase();
	return normalizedIp;
};

export function normalizeToIPv6(address: string): string {
	let ip = address === "localhost" ? "::1" : address;
	if (libnet.isIPv6(ip)) {
		return normalizeIPv6(ip);
	}
	if (libnet.isIPv4(ip)) {
		return normalizeIPv6(ip === "127.0.0.1" ? "::1" : `::ffff:${ip}`);
	}
	throw new Error(`Expected "${address}" to be a valid IPv4 or IPv6 address!`);
};

export function createProxyHeader(socket: libnet.Socket): Header {
	let remoteAddress = getRemoteAddress(socket);
	let localAddress = getLocalAddress(socket);
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
const TARGET_KEY = Symbol();

export function getSourceAddress(socket: libnet.Socket): libnet.AddressInfo | undefined {
	if (SOURCE_KEY in socket) {
		return socket[SOURCE_KEY] as libnet.AddressInfo;
	}
};

export function getTargetAddress(socket: libnet.Socket): libnet.AddressInfo | undefined {
	if (TARGET_KEY in socket) {
		return socket[TARGET_KEY] as libnet.AddressInfo;
	}
};

export function setSourceAddress(socket: libnet.Socket, header: Header): void {
	let sourceAddress = createSourceAddress(header);
	Object.defineProperty(socket, SOURCE_KEY, {
		value: sourceAddress
	});
};

export function setTargetAddress(socket: libnet.Socket, header: Header): void {
	let targetAddress = createTargetAddress(header);
	Object.defineProperty(socket, TARGET_KEY, {
		value: targetAddress
	});
};

export function formatAddress(address: libnet.AddressInfo): string {
	return address.family === "IPv4" ? `${address.address}:${address.port}` : `[${address.address}]:${address.port}`;
};

export type Server = libnet.Server;

export type ConnectionListener = (socket: libnet.Socket, header: Header | undefined) => void;

export type Options = {
	trustedRemoteAddresses: Array<string>;
	tcpDebug: boolean;
};

// NOTE: Sockets have allowHalfOpen set to false.
export function createServer(options: Partial<Options>, connectionListener: ConnectionListener): Server {
	let trustedRemoteAddresses = options?.trustedRemoteAddresses ?? [];
	let tcpDebug = options.tcpDebug ?? false;
	return libnet.createServer({}, (socket) => {
		let remoteAdress = getRemoteAddress(socket);
		let localAddress = getLocalAddress(socket);
		if (tcpDebug) {
			process.stderr.write(`Incoming TCP connection ${remoteAdress.port} ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(localAddress), terminal.FG_YELLOW)}` + "\n");
			socket.once("close", (had_error) => {
				process.stderr.write(`Incoming TCP connection ${remoteAdress.port} ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(localAddress), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
			});
		}
		socket.on("error", (error) => {
			if (tcpDebug) process.stderr.write(`Incoming TCP connection ${remoteAdress.port} emitted error event with message "${error.message}"` + "\n");
		});
		socket.on("data", function ondata(chunk: Buffer): void {
			socket.off("data", ondata);
			try {
				let remoteAddress = getRemoteAddress(socket);
				let { header, buffer } = parseHeader(chunk);
				if (header != null) {
					let matchingTrustedRemoteAddress = trustedRemoteAddresses.find((trustedRemoteAddress) => {
						return normalizeToIPv6(trustedRemoteAddress) === normalizeToIPv6(remoteAddress.address);
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
