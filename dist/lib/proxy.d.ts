/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as libnet from "net";
export type Header = {
    type: "TCP4" | "TCP6";
    source_address: string;
    target_address: string;
    source_port: number;
    target_port: number;
};
export declare function parseHeader(buffer: Buffer): {
    header?: Header;
    buffer: Buffer;
};
export declare function serializeHeader(header: Header): Buffer;
export declare function getLocalAddress(socket: libnet.Socket): libnet.AddressInfo;
export declare function getRemoteAddress(socket: libnet.Socket): libnet.AddressInfo;
export declare function normalizeIPv6(ip: string): string;
export declare function normalizeToIPv6(address: string): string;
export declare function createProxyHeader(socket: libnet.Socket): Header;
export declare function createTargetAddress(header: Header): libnet.AddressInfo;
export declare function createSourceAddress(header: Header): libnet.AddressInfo;
export declare function getSourceAddress(socket: libnet.Socket): libnet.AddressInfo | undefined;
export declare function getTargetAddress(socket: libnet.Socket): libnet.AddressInfo | undefined;
export declare function setSourceAddress(socket: libnet.Socket, header: Header): void;
export declare function setTargetAddress(socket: libnet.Socket, header: Header): void;
export declare function formatAddress(address: libnet.AddressInfo): string;
export type Server = libnet.Server;
export type ConnectionListener = (socket: libnet.Socket, header: Header | undefined) => void;
export type Options = {
    trustedRemoteAddresses: Array<string>;
    tcpDebug: boolean;
};
export declare function createServer(options: Partial<Options>, connectionListener: ConnectionListener): Server;
