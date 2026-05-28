"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = exports.createRemoteAddress = exports.createLocalAddress = exports.createSocketProxy = exports.createProxyHeader = exports.normalizeToIPv6 = exports.normalizeIPv6 = exports.getRemoteAddress = exports.getLocalAddress = exports.serializeHeader = exports.parseHeader = void 0;
const libnet = require("net");
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
    if (ip.startsWith("[") && ip.endsWith("]")) {
        ip = ip.slice(1, -1);
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
    let normalizedIp = `[${groups.map((group) => group.padStart(4, "0")).join(":").toLowerCase()}]`;
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
        return normalizeIPv6(ip === "127.0.0.1" ? "::1" : `::ffff:${address}`);
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
function createSocketProxy(socket, remoteAddress) {
    return new Proxy(socket, {
        get: (target, key, receiver) => {
            if (key === "remoteFamily") {
                return remoteAddress.family;
            }
            if (key === "remoteAddress") {
                return remoteAddress.address;
            }
            if (key === "remotePort") {
                return remoteAddress.port;
            }
            return target[key];
        }
    });
}
exports.createSocketProxy = createSocketProxy;
;
function createLocalAddress(header) {
    return {
        family: header.type === "TCP4" ? "IPv4" : "IPv6",
        address: header.target_address,
        port: header.target_port
    };
}
exports.createLocalAddress = createLocalAddress;
;
function createRemoteAddress(header) {
    return {
        family: header.type === "TCP4" ? "IPv4" : "IPv6",
        address: header.source_address,
        port: header.source_port
    };
}
exports.createRemoteAddress = createRemoteAddress;
;
function createServer(options, connectionListener) {
    var _a, _b;
    let trustedRemoteAddresses = (_a = options === null || options === void 0 ? void 0 : options.trustedRemoteAddresses) !== null && _a !== void 0 ? _a : [];
    let overrideSocketRemote = (_b = options === null || options === void 0 ? void 0 : options.overrideSocketRemote) !== null && _b !== void 0 ? _b : false;
    return libnet.createServer((socket) => {
        socket.on("data", function ondata(chunk) {
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
                if (overrideSocketRemote && header != null) {
                    socket = createSocketProxy(socket, createRemoteAddress(header));
                }
                ;
                connectionListener(socket, header);
            }
            catch (error) {
                socket.end();
            }
        });
    });
}
exports.createServer = createServer;
;
