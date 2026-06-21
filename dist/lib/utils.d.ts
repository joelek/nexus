/// <reference types="node" />
import * as libnet from "net";
export declare function matchesHostnamePattern(subject: string, pattern: string): boolean;
export declare function normalizeIPv6(ip: string): string;
export declare function normalizeToIPv6(address: string): string;
export declare function getLocalAddress(socket: libnet.Socket): libnet.AddressInfo;
export declare function getRemoteAddress(socket: libnet.Socket): libnet.AddressInfo;
export declare function formatAddress(address: libnet.AddressInfo): string;
export declare function getServerAddress(server: libnet.Server): libnet.AddressInfo;
export type LogType = "http" | "tcp" | "system";
export declare class Logger {
    protected types: Array<string>;
    constructor(types: Array<string>);
    isLoggingEnabled(kind: LogType): boolean;
    log(type: LogType, line: string): void;
}
export declare function isTrusted(remoteAddress: string, trustedRemoteAddresses: Array<string>): boolean;
