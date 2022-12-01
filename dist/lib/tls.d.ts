/// <reference types="node" />
type ParsingState = {
    buffer: Buffer;
    offset: number;
};
export declare enum ContentType {
    CHANGE_CIPHER_SPEC = 20,
    ALERT = 21,
    HANDSHAKE = 22,
    APPLICATION_DATA = 23
}
export declare function parseContentType(state: ParsingState): ContentType;
export type ProtocolVersion = {
    major: number;
    minor: number;
};
export declare function parseProtocolVersion(state: ParsingState): ProtocolVersion;
export type TlsPlaintext = {
    type: ContentType;
    protocolVersion: ProtocolVersion;
    body: Buffer;
};
export declare function parseTlsPlaintext(state: ParsingState): TlsPlaintext;
export declare enum HandshakeType {
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
}
export declare function parseHandshakeType(state: ParsingState): HandshakeType;
export type Handshake = {
    type: HandshakeType;
    body: Buffer;
};
export declare function parseHandshake(state: ParsingState): Handshake;
export type Random = {
    timestamp: number;
    buffer: Buffer;
};
export declare function parseRandom(state: ParsingState): Random;
export type SessionId = {
    body: Buffer;
};
export declare function parseSessionId(state: ParsingState): SessionId;
export type CipherSuite = {
    one: number;
    two: number;
};
export declare function parseCipherSuite(state: ParsingState): CipherSuite;
export declare enum CompressionMethod {
    NULL = 0
}
export declare function parseCompressionMethod(state: ParsingState): CompressionMethod;
export type ClientHello = {
    protocolVersion: ProtocolVersion;
    random: Random;
    sessionId: SessionId;
    cipherSuites: Array<CipherSuite>;
    compressionMethods: Array<CompressionMethod>;
    extensions: Array<Extension>;
};
export declare enum ExtensionType {
    SERVER_NAME = 0,
    SIGNATURE_ALGORITHMS = 13
}
export declare function parseExtensionType(state: ParsingState): ExtensionType;
export type Extension = {
    type: ExtensionType;
    body: Buffer;
};
export declare function parseExtension(state: ParsingState): Extension;
export declare function parseClientHello(state: ParsingState): ClientHello;
export declare enum NameType {
    HOST_NAME = 0
}
export declare function parseNameType(state: ParsingState): NameType;
export type ServerName = {
    type: NameType;
    body: Buffer;
};
export declare function parseServerName(state: ParsingState): ServerName;
export declare function parseServerNames(state: ParsingState): ServerName[];
export type Hostname = {
    name: string;
};
export declare function parseHostname(state: ParsingState): Hostname;
export declare function getServername(head: Buffer): string;
export {};
