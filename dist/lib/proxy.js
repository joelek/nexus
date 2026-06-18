"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = exports.setupConnectionLogging = exports.getServerAddress = exports.formatAddress = exports.setConnectionId = exports.getConnectionId = exports.setTargetAddress = exports.getTargetAddress = exports.setSourceAddress = exports.getSourceAddress = exports.createSourceAddress = exports.createTargetAddress = exports.createProxyHeader = exports.normalizeToIPv6 = exports.normalizeIPv6 = exports.getRemoteAddress = exports.getLocalAddress = exports.serializeHeader = exports.parseHeader = void 0;
const libnet = require("net");
const terminal = require("./terminal");
function parseHeader(buffer) {
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
    }
    else if (type === "TCP6") {
        if (parts.length !== 6) {
            throw new Error();
        }
        if (!libnet.isIPv6(source_address)) {
            throw new Error();
        }
        if (!libnet.isIPv6(target_address)) {
            throw new Error();
        }
    }
    else if (type === "UNKNOWN") {
        return {
            buffer
        };
    }
    else {
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
}
exports.parseHeader = parseHeader;
;
function serializeHeader(header) {
    let string = [
        "PROXY",
        header.type,
        header.source_address,
        header.target_address,
        `${header.source_port}`,
        `${header.target_port}`
    ].join(" ") + "\r\n";
    return Buffer.from(string, "ascii");
}
exports.serializeHeader = serializeHeader;
;
function getLocalAddress(socket) {
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
}
exports.getLocalAddress = getLocalAddress;
;
function getRemoteAddress(socket) {
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
}
exports.getRemoteAddress = getRemoteAddress;
;
function normalizeIPv6(ip) {
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
    let groups = new Array();
    let position = ip.indexOf("::");
    if (position >= 0) {
        let prefixGroups = ip.slice(0, position).split(":");
        let suffixGroups = ip.slice(position + 2).split(":");
        let zeroedGroups = new Array(8 - (prefixGroups.length + suffixGroups.length)).fill("0000");
        groups.push(...prefixGroups);
        groups.push(...zeroedGroups);
        groups.push(...suffixGroups);
    }
    else {
        groups.push(...ip.split(":"));
    }
    let normalizedIp = groups.map((group) => group.padStart(4, "0")).join(":").toLowerCase();
    return normalizedIp;
}
exports.normalizeIPv6 = normalizeIPv6;
;
function normalizeToIPv6(address) {
    let ip = address === "localhost" ? "::1" : address;
    if (libnet.isIPv6(ip)) {
        return normalizeIPv6(ip);
    }
    if (libnet.isIPv4(ip)) {
        return normalizeIPv6(ip === "127.0.0.1" ? "::1" : `::ffff:${ip}`);
    }
    throw new Error(`Expected "${address}" to be a valid IPv4 or IPv6 address!`);
}
exports.normalizeToIPv6 = normalizeToIPv6;
;
function createProxyHeader(socket) {
    let remoteAddress = getRemoteAddress(socket);
    let localAddress = getLocalAddress(socket);
    return {
        type: remoteAddress.family === "IPv4" ? "TCP4" : "TCP6",
        source_address: remoteAddress.address,
        target_address: localAddress.address,
        source_port: remoteAddress.port,
        target_port: localAddress.port
    };
}
exports.createProxyHeader = createProxyHeader;
;
function createTargetAddress(header) {
    return {
        family: header.type === "TCP4" ? "IPv4" : "IPv6",
        address: header.target_address,
        port: header.target_port
    };
}
exports.createTargetAddress = createTargetAddress;
;
function createSourceAddress(header) {
    return {
        family: header.type === "TCP4" ? "IPv4" : "IPv6",
        address: header.source_address,
        port: header.source_port
    };
}
exports.createSourceAddress = createSourceAddress;
;
const SOURCE_KEY = Symbol();
function getSourceAddress(socket) {
    if (SOURCE_KEY in socket) {
        return socket[SOURCE_KEY];
    }
}
exports.getSourceAddress = getSourceAddress;
;
function setSourceAddress(socket, header) {
    delete socket[SOURCE_KEY];
    let sourceAddress = createSourceAddress(header);
    Object.defineProperty(socket, SOURCE_KEY, {
        value: sourceAddress,
        configurable: true
    });
}
exports.setSourceAddress = setSourceAddress;
;
const TARGET_KEY = Symbol();
function getTargetAddress(socket) {
    if (TARGET_KEY in socket) {
        return socket[TARGET_KEY];
    }
}
exports.getTargetAddress = getTargetAddress;
;
function setTargetAddress(socket, header) {
    delete socket[TARGET_KEY];
    let targetAddress = createTargetAddress(header);
    Object.defineProperty(socket, TARGET_KEY, {
        value: targetAddress,
        configurable: true
    });
}
exports.setTargetAddress = setTargetAddress;
;
const CONNECTION_ID_KEY = Symbol();
function getConnectionId(socket) {
    if (CONNECTION_ID_KEY in socket) {
        return socket[CONNECTION_ID_KEY];
    }
}
exports.getConnectionId = getConnectionId;
;
function setConnectionId(socket, connectionId) {
    delete socket[CONNECTION_ID_KEY];
    Object.defineProperty(socket, CONNECTION_ID_KEY, {
        value: connectionId,
        configurable: true
    });
}
exports.setConnectionId = setConnectionId;
;
function formatAddress(address) {
    return address.family === "IPv4" ? `${address.address}:${address.port}` : `[${address.address}]:${address.port}`;
}
exports.formatAddress = formatAddress;
;
function getServerAddress(server) {
    let address = server.address();
    if (address == null || typeof address === "string") {
        throw new Error(`Expected type AddressInfo!`);
    }
    return address;
}
exports.getServerAddress = getServerAddress;
;
function setupConnectionLogging(socket) {
    let localAddress = getLocalAddress(socket);
    process.stderr.write(`Client connection ${getConnectionId(socket)} ${terminal.stylize("established", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(localAddress), terminal.FG_YELLOW)}` + "\n");
    socket.once("close", (had_error) => {
        process.nextTick(() => {
            process.stderr.write(`Client connection ${getConnectionId(socket)} ${terminal.stylize("closed", terminal.FG_CYAN)} for ${terminal.stylize(formatAddress(localAddress), terminal.FG_YELLOW)} ${had_error ? "with error" : "without error"}` + "\n");
        });
    });
    socket.on("error", (error) => {
        var _a;
        process.stderr.write(`Client connection ${(_a = getConnectionId(socket)) !== null && _a !== void 0 ? _a : "-"} emitted error event with message "${error.message}"` + "\n");
    });
}
exports.setupConnectionLogging = setupConnectionLogging;
;
function createServer(options, connectionListener) {
    var _a, _b;
    let trustedRemoteAddresses = (_a = options === null || options === void 0 ? void 0 : options.trustedRemoteAddresses) !== null && _a !== void 0 ? _a : [];
    let debug = (_b = options.debug) !== null && _b !== void 0 ? _b : false;
    return libnet.createServer({
        allowHalfOpen: true
    }, (socket) => {
        let remoteAddress = getRemoteAddress(socket);
        setConnectionId(socket, `${remoteAddress.port}`);
        if (debug) {
            setupConnectionLogging(socket);
        }
        socket.on("error", (error) => { }); // NOTE: Prevent errors from being thrown.
        socket.on("data", function ondata(chunk) {
            socket.off("data", ondata);
            try {
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
            }
            catch (error) {
                socket.resetAndDestroy();
            }
        });
    });
}
exports.createServer = createServer;
;
