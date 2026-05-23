import * as libnet from "net";

export type Header = {
	type: "TCP4" | "TCP6";
	source_address: string;
	target_address: string;
	source_port: number;
	target_port: number;
};

export function parseProxyProtocolHeader(buffer: Buffer): { header: Header; buffer: Buffer; } {
	let end = buffer.indexOf("\r\n", 0, "ascii");
	if (end < 0) {
		throw new Error();
	}
	let parts = buffer.subarray(0, end).toString("ascii").split(" ");
	if (parts.length !== 6) {
		throw new Error();
	}
	let [proxy, type, source_address, target_address, source_port, target_port] = parts;
	if (proxy !== "PROXY") {
		throw new Error();
	}
	if (type === "TCP4") {
		if (!libnet.isIPv4(source_address)) {
			throw new Error();
		}
		if (!libnet.isIPv4(target_address)) {
			throw new Error();
		}
	} else if (type === "TCP6") {
		if (!libnet.isIPv6(source_address)) {
			throw new Error();
		}
		if (!libnet.isIPv6(target_address)) {
			throw new Error();
		}
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
		buffer: buffer.subarray(end)
	};
};

export function serializeProxyProtocolHeader(header: Header): Buffer {
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
