/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as libhttp from "http";
import * as libnet from "net";
export type RequestListener = libhttp.RequestListener;
export type UpgradeListener = (request: libhttp.IncomingMessage, socket: libnet.Socket, head: Buffer) => void;
export type Server = libhttp.Server;
export type RequestListenerAndHostname = {
    hostname: string;
    listener: RequestListener;
};
export type UpgradeListenerAndHostname = {
    hostname: string;
    listener: UpgradeListener;
};
export type Options = {
    requestListeners?: Array<RequestListenerAndHostname>;
    upgradeListeners?: Array<UpgradeListenerAndHostname>;
    httpKeepAliveTimeoutSeconds?: number;
};
export declare function createServer(options: Options): Server;
