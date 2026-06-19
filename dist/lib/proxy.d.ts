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
export declare function createProxyHeader(socket: libnet.Socket): Header;
export declare function createTargetAddress(header: Header): libnet.AddressInfo;
export declare function createSourceAddress(header: Header): libnet.AddressInfo;
export declare function getSourceAddress(socket: libnet.Socket): libnet.AddressInfo | undefined;
export declare function setSourceAddress(socket: libnet.Socket, header: Header): void;
export declare function getTargetAddress(socket: libnet.Socket): libnet.AddressInfo | undefined;
export declare function setTargetAddress(socket: libnet.Socket, header: Header): void;
export declare function getConnectionId(socket: libnet.Socket): string | undefined;
export declare function setConnectionId(socket: libnet.Socket, connectionId: string | undefined): void;
export declare class Server extends libnet.Server {
}
export type ConnectionListener = (socket: libnet.Socket, header: Header | undefined) => void;
export type Options = {
    trustedRemoteAddresses?: Array<string>;
    debug?: boolean;
};
export declare function setupConnectionLogging(socket: libnet.Socket): void;
export declare function createServer(options: Options, connectionListener: ConnectionListener): Server;
