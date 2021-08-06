"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServername = exports.parseHostname = exports.parseServerNames = exports.parseServerName = exports.parseNameType = exports.NameType = exports.parseClientHello = exports.parseExtension = exports.parseExtensionType = exports.ExtensionType = exports.parseCompressionMethod = exports.CompressionMethod = exports.parseCipherSuite = exports.parseSessionId = exports.parseRandom = exports.parseHandshake = exports.parseHandshakeType = exports.HandshakeType = exports.parseTlsPlaintext = exports.parseProtocolVersion = exports.parseContentType = exports.ContentType = void 0;
function getSubState(state, bytes) {
    let length = state.buffer.readUIntBE(state.offset, bytes);
    state.offset += bytes;
    if (state.offset + length > state.buffer.length) {
        throw `Expected at least ${length} bytes remaining in buffer at position ${state.offset}!`;
    }
    let buffer = state.buffer.slice(state.offset, state.offset + length);
    state.offset += length;
    return {
        buffer: buffer,
        offset: 0
    };
}
;
var ContentType;
(function (ContentType) {
    ContentType[ContentType["CHANGE_CIPHER_SPEC"] = 20] = "CHANGE_CIPHER_SPEC";
    ContentType[ContentType["ALERT"] = 21] = "ALERT";
    ContentType[ContentType["HANDSHAKE"] = 22] = "HANDSHAKE";
    ContentType[ContentType["APPLICATION_DATA"] = 23] = "APPLICATION_DATA";
})(ContentType = exports.ContentType || (exports.ContentType = {}));
;
function parseContentType(state) {
    let value = state.buffer.readUIntBE(state.offset, 1);
    state.offset += 1;
    return value;
}
exports.parseContentType = parseContentType;
;
function parseProtocolVersion(state) {
    let major = state.buffer.readUIntBE(state.offset, 1);
    state.offset += 1;
    let minor = state.buffer.readUIntBE(state.offset, 1);
    state.offset += 1;
    return {
        major,
        minor
    };
}
exports.parseProtocolVersion = parseProtocolVersion;
;
function parseTlsPlaintext(state) {
    let type = parseContentType(state);
    let protocolVersion = parseProtocolVersion(state);
    let body = getSubState(state, 2).buffer;
    return {
        type,
        protocolVersion,
        body
    };
}
exports.parseTlsPlaintext = parseTlsPlaintext;
;
var HandshakeType;
(function (HandshakeType) {
    HandshakeType[HandshakeType["HELLO_REQUEST"] = 0] = "HELLO_REQUEST";
    HandshakeType[HandshakeType["CLIENT_HELLO"] = 1] = "CLIENT_HELLO";
    HandshakeType[HandshakeType["SERVER_HELLO"] = 2] = "SERVER_HELLO";
    HandshakeType[HandshakeType["CERTIFICATE"] = 11] = "CERTIFICATE";
    HandshakeType[HandshakeType["SERVER_KEY_EXCHANGE"] = 12] = "SERVER_KEY_EXCHANGE";
    HandshakeType[HandshakeType["CERTIFICATE_REQUEST"] = 13] = "CERTIFICATE_REQUEST";
    HandshakeType[HandshakeType["SERVER_HELLO_DONE"] = 14] = "SERVER_HELLO_DONE";
    HandshakeType[HandshakeType["CERTIFICATE_VERIFY"] = 15] = "CERTIFICATE_VERIFY";
    HandshakeType[HandshakeType["CLIENT_KEY_EXCHANGE"] = 16] = "CLIENT_KEY_EXCHANGE";
    HandshakeType[HandshakeType["FINISHED"] = 20] = "FINISHED";
    HandshakeType[HandshakeType["CERTIFICATE_URL"] = 21] = "CERTIFICATE_URL";
    HandshakeType[HandshakeType["CERTIFICATE_STATUS"] = 22] = "CERTIFICATE_STATUS";
})(HandshakeType = exports.HandshakeType || (exports.HandshakeType = {}));
;
function parseHandshakeType(state) {
    let value = state.buffer.readUIntBE(state.offset, 1);
    state.offset += 1;
    return value;
}
exports.parseHandshakeType = parseHandshakeType;
;
function parseHandshake(state) {
    let type = parseHandshakeType(state);
    let body = getSubState(state, 3).buffer;
    return {
        type,
        body
    };
}
exports.parseHandshake = parseHandshake;
;
function parseRandom(state) {
    let timestamp = state.buffer.readUIntBE(state.offset, 4);
    state.offset += 4;
    if (state.offset + 28 > state.buffer.length) {
        throw `Expected at least ${28} bytes remaining in buffer at position ${state.offset}!`;
    }
    let buffer = state.buffer.slice(state.offset, state.offset + 28);
    state.offset += 28;
    return {
        timestamp,
        buffer
    };
}
exports.parseRandom = parseRandom;
;
function parseSessionId(state) {
    let body = getSubState(state, 1).buffer;
    return {
        body
    };
}
exports.parseSessionId = parseSessionId;
;
function parseCipherSuite(state) {
    let one = state.buffer.readUIntBE(state.offset, 1);
    state.offset += 1;
    let two = state.buffer.readUIntBE(state.offset, 1);
    state.offset += 1;
    return {
        one,
        two
    };
}
exports.parseCipherSuite = parseCipherSuite;
;
var CompressionMethod;
(function (CompressionMethod) {
    CompressionMethod[CompressionMethod["NULL"] = 0] = "NULL";
})(CompressionMethod = exports.CompressionMethod || (exports.CompressionMethod = {}));
;
function parseCompressionMethod(state) {
    let value = state.buffer.readUIntBE(state.offset, 1);
    state.offset += 1;
    return value;
}
exports.parseCompressionMethod = parseCompressionMethod;
;
var ExtensionType;
(function (ExtensionType) {
    ExtensionType[ExtensionType["SERVER_NAME"] = 0] = "SERVER_NAME";
    ExtensionType[ExtensionType["SIGNATURE_ALGORITHMS"] = 13] = "SIGNATURE_ALGORITHMS";
})(ExtensionType = exports.ExtensionType || (exports.ExtensionType = {}));
;
function parseExtensionType(state) {
    let value = state.buffer.readUIntBE(state.offset, 2);
    state.offset += 2;
    return value;
}
exports.parseExtensionType = parseExtensionType;
;
function parseExtension(state) {
    let type = parseExtensionType(state);
    let body = getSubState(state, 2).buffer;
    return {
        type,
        body
    };
}
exports.parseExtension = parseExtension;
;
function parseClientHello(state) {
    let protocolVersion = parseProtocolVersion(state);
    let random = parseRandom(state);
    let sessionId = parseSessionId(state);
    let cipherSuites = new Array();
    if (true) {
        let subState = getSubState(state, 2);
        while (subState.offset < subState.buffer.length) {
            cipherSuites.push(parseCipherSuite(subState));
        }
    }
    let compressionMethods = new Array();
    if (true) {
        let subState = getSubState(state, 1);
        while (subState.offset < subState.buffer.length) {
            compressionMethods.push(parseCompressionMethod(subState));
        }
    }
    let extensions = new Array();
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
}
exports.parseClientHello = parseClientHello;
;
var NameType;
(function (NameType) {
    NameType[NameType["HOST_NAME"] = 0] = "HOST_NAME";
})(NameType = exports.NameType || (exports.NameType = {}));
;
function parseNameType(state) {
    let value = state.buffer.readUIntBE(state.offset, 1);
    state.offset += 1;
    return value;
}
exports.parseNameType = parseNameType;
;
function parseServerName(state) {
    let type = parseNameType(state);
    let body = state.buffer.slice(state.offset);
    state.offset = state.buffer.length;
    return {
        type,
        body
    };
}
exports.parseServerName = parseServerName;
;
function parseServerNames(state) {
    let serverNames = new Array();
    if (true) {
        let subState = getSubState(state, 2);
        while (subState.offset < subState.buffer.length) {
            serverNames.push(parseServerName(subState));
        }
    }
    return serverNames;
}
exports.parseServerNames = parseServerNames;
;
// TODO: Parse international hostnames properly.
function parseHostname(state) {
    let body = getSubState(state, 2);
    return {
        name: body.buffer.toString("ascii")
    };
}
exports.parseHostname = parseHostname;
;
function getServername(head) {
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
}
exports.getServername = getServername;
;
