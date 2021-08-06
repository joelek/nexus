type ParsingState = {
	buffer: Buffer;
	offset: number;
};

function getSubState(state: ParsingState, bytes: number): ParsingState {
	let length = state.buffer.readUIntBE(state.offset, bytes); state.offset += bytes;
	if (state.offset + length > state.buffer.length) {
		throw `Expected at least ${length} bytes remaining in buffer at position ${state.offset}!`;
	}
	let buffer = state.buffer.slice(state.offset, state.offset + length); state.offset += length;
	return {
		buffer: buffer,
		offset: 0
	};
};

export enum ContentType {
	CHANGE_CIPHER_SPEC = 20,
	ALERT = 21,
	HANDSHAKE = 22,
	APPLICATION_DATA = 23
};

export function parseContentType(state: ParsingState): ContentType {
	let value = state.buffer.readUIntBE(state.offset, 1); state.offset += 1;
	return value;
};

// Version 3.1 is TLS 1.0, 3.2 is TLS 1.1, 3.3 is TLS 1.2 and 3.4 is TLS 1.3.
export type ProtocolVersion = {
	major: number;
	minor: number;
};

export function parseProtocolVersion(state: ParsingState): ProtocolVersion {
	let major = state.buffer.readUIntBE(state.offset, 1); state.offset += 1;
	let minor = state.buffer.readUIntBE(state.offset, 1); state.offset += 1;
	return {
		major,
		minor
	};
};

export type TlsPlaintext = {
	type: ContentType;
	protocolVersion: ProtocolVersion;
	body: Buffer;
};

export function parseTlsPlaintext(state: ParsingState): TlsPlaintext {
	let type = parseContentType(state);
	let protocolVersion = parseProtocolVersion(state);
	let body = getSubState(state, 2).buffer;
	return {
		type,
		protocolVersion,
		body
	};
};

export enum HandshakeType {
	HELLO_REQUEST = 0,
	CLIENT_HELLO = 1,
	SERVER_HELLO = 2,
	CERTIFICATE = 11,
	SERVER_KEY_EXCHANGE = 12,
	CERTIFICATE_REQUEST = 13,
	SERVER_HELLO_DONE = 14,
	CERTIFICATE_VERIFY = 15,
	CLIENT_KEY_EXCHANGE = 16,
	FINISHED = 20,
	CERTIFICATE_URL = 21,
	CERTIFICATE_STATUS = 22
};

export function parseHandshakeType(state: ParsingState): HandshakeType {
	let value = state.buffer.readUIntBE(state.offset, 1); state.offset += 1;
	return value;
};

export type Handshake = {
	type: HandshakeType;
	body: Buffer;
};

export function parseHandshake(state: ParsingState): Handshake {
	let type = parseHandshakeType(state);
	let body = getSubState(state, 3).buffer;
	return {
		type,
		body
	};
};

export type Random = {
	timestamp: number;
	buffer: Buffer;
};

export function parseRandom(state: ParsingState): Random {
	let timestamp = state.buffer.readUIntBE(state.offset, 4); state.offset += 4;
	if (state.offset + 28 > state.buffer.length) {
		throw `Expected at least ${28} bytes remaining in buffer at position ${state.offset}!`;
	}
	let buffer = state.buffer.slice(state.offset, state.offset + 28); state.offset += 28;
	return {
		timestamp,
		buffer
	};
};

export type SessionId = {
	body: Buffer;
};

export function parseSessionId(state: ParsingState): SessionId {
	let body = getSubState(state, 1).buffer;
	return {
		body
	};
};

export type CipherSuite = {
	one: number;
	two: number;
};

export function parseCipherSuite(state: ParsingState): CipherSuite {
	let one = state.buffer.readUIntBE(state.offset, 1); state.offset += 1;
	let two = state.buffer.readUIntBE(state.offset, 1); state.offset += 1;
	return {
		one,
		two
	};
};

export enum CompressionMethod {
	NULL = 0
};

export function parseCompressionMethod(state: ParsingState): CompressionMethod {
	let value = state.buffer.readUIntBE(state.offset, 1); state.offset += 1;
	return value;
};

export type ClientHello = {
	protocolVersion: ProtocolVersion;
	random: Random;
	sessionId: SessionId;
	cipherSuites: Array<CipherSuite>;
	compressionMethods: Array<CompressionMethod>;
	extensions: Array<Extension>;
};

export enum ExtensionType {
	SERVER_NAME = 0,
	SIGNATURE_ALGORITHMS = 13
};

export function parseExtensionType(state: ParsingState): ExtensionType {
	let value = state.buffer.readUIntBE(state.offset, 2); state.offset += 2;
	return value;
};

export type Extension = {
	type: ExtensionType;
	body: Buffer;
};

export function parseExtension(state: ParsingState): Extension {
	let type = parseExtensionType(state);
	let body = getSubState(state, 2).buffer;
	return {
		type,
		body
	};
};

export function parseClientHello(state: ParsingState): ClientHello {
	let protocolVersion = parseProtocolVersion(state);
	let random = parseRandom(state);
	let sessionId = parseSessionId(state);
	let cipherSuites = new Array<CipherSuite>();
	if (true) {
		let subState = getSubState(state, 2);
		while (subState.offset < subState.buffer.length) {
			cipherSuites.push(parseCipherSuite(subState));
		}
	}
	let compressionMethods = new Array<CompressionMethod>();
	if (true) {
		let subState = getSubState(state, 1);
		while (subState.offset < subState.buffer.length) {
			compressionMethods.push(parseCompressionMethod(subState));
		}
	}
	let extensions = new Array<Extension>();
	if (state.offset < state.buffer.length) {
		let subState = getSubState(state, 2);
		while (subState.offset < subState.buffer.length) {
			extensions.push(parseExtension(subState));
		}
	}
	return {
		protocolVersion,
		random,
		sessionId,
		cipherSuites,
		compressionMethods,
		extensions
	};
};

export enum NameType {
	HOST_NAME = 0
};

export function parseNameType(state: ParsingState): NameType {
	let value = state.buffer.readUIntBE(state.offset, 1); state.offset += 1;
	return value;
};

export type ServerName = {
	type: NameType;
	body: Buffer;
};

export function parseServerName(state: ParsingState): ServerName {
	let type = parseNameType(state);
	let body = state.buffer.slice(state.offset); state.offset = state.buffer.length;
	return {
		type,
		body
	};
};

export function parseServerNames(state: ParsingState): ServerName[] {
	let serverNames = new Array<ServerName>();
	if (true) {
		let subState = getSubState(state, 2);
		while (subState.offset < subState.buffer.length) {
			serverNames.push(parseServerName(subState));
		}
	}
	return serverNames;
};

export type Hostname = {
	name: string;
};

// TODO: Parse international hostnames properly.
export function parseHostname(state: ParsingState): Hostname {
	let body = getSubState(state, 2);
	return {
		name: body.buffer.toString("ascii")
	};
};

export function getServername(head: Buffer): string {
	let tlsPlaintext = parseTlsPlaintext({
		buffer: head,
		offset: 0
	});
	if (tlsPlaintext.type !== ContentType.HANDSHAKE) {
		throw `Expected a TLS handshake!`;
	}
	let handshake = parseHandshake({
		buffer: tlsPlaintext.body,
		offset: 0
	});
	if (handshake.type !== HandshakeType.CLIENT_HELLO) {
		throw `Expected a TLS client hello!`;
	}
	let clientHello = parseClientHello({
		buffer: handshake.body,
		offset: 0
	});
	let hostnames = clientHello.extensions
		.filter((extension) => {
			return extension.type === ExtensionType.SERVER_NAME;
		})
		.map((extension) => {
			return parseServerNames({
				buffer: extension.body,
				offset: 0
			});
		})
		.reduce((array, serverNames) => {
			return [
				...array,
				...serverNames
			];
		}, [])
		.filter((serverName) => {
			return serverName.type === NameType.HOST_NAME;
		})
		.map((serverName) => {
			return parseHostname({
				buffer: serverName.body,
				offset: 0
			});
		});
	if (hostnames.length !== 1) {
		throw `Expected exactly one hostname!`;
	}
	return hostnames[0].name;
};
