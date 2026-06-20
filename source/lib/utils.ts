import * as libnet from "net";

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

export function formatAddress(address: libnet.AddressInfo): string {
	return address.family === "IPv4" ? `${address.address}:${address.port}` : `[${address.address}]:${address.port}`;
};

export function getServerAddress(server: libnet.Server): libnet.AddressInfo {
	let address = server.address();
	if (address == null || typeof address === "string") {
		throw new Error(`Expected type AddressInfo!`);
	}
	return address;
};

export type LogType = "http" | "tcp" | "system";

export class Logger {
	protected types: Array<string>;

	constructor(types: Array<string>) {
		this.types = types;
	}

	isLoggingEnabled(kind: LogType): boolean {
		return this.types.includes(kind);
	}

	log(type: LogType, line: string): void {
		if (this.isLoggingEnabled(type)) {
			process.stdout.write(line + "\n");
		}
	}
};
