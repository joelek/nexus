/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as autoguard from "@joelek/autoguard/dist/lib-server";
import * as libhttp from "http";
import * as libnet from "net";
import * as libtls from "tls";
import { Options, Handler } from "./config";
export { Domain, Options, Handler } from "./config";
export declare function loadConfig(config: string): Options;
export declare function computeSimpleHash(string: string): number;
export declare function encodeXMLText(string: string): string;
export declare function makeStylesheet(): string;
export declare function formatSize(size: number): string;
export declare function renderDirectoryListing(directoryListing: autoguard.api.DirectoryListing): string;
export declare function makeDirectoryListingResponse(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>): autoguard.api.EndpointResponse & {
    payload: autoguard.api.Binary;
};
export declare function makeReadStreamResponse(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>): autoguard.api.EndpointResponse & {
    payload: autoguard.api.Binary;
};
export declare function makeRequestListener(pathPrefix: string, handler: Handler | undefined, clientRouting: boolean, generateIndices: boolean): libhttp.RequestListener;
export declare function makeRedirectRequestListener(httpsPort: number): libhttp.RequestListener;
export declare function createProxyRawHeaders(request: libhttp.IncomingMessage, overrides: Record<string, string>): Array<string>;
export declare function makeProxyRequest(clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, scc: ServernameConnectionConfig): libhttp.ClientRequest;
export declare function makeProxyRequestListener(scc: ServernameConnectionConfig): libhttp.RequestListener;
export declare function makeProxyUpgradeListener(scc: ServernameConnectionConfig): UpgradeListener;
export declare function matchesHostnamePattern(subject: string, pattern: string): boolean;
export declare function getServerAddress(server: libnet.Server): libnet.AddressInfo;
export type ServernameConnectionConfig = {
    protocol: string;
    hostname: string;
    port: number;
};
export declare const TCP_PROTOCOLS: string[];
export declare const HTTP_PROTOCOLS: string[];
export declare function parseServernameConnectionConfig(root: string, defaultPort: number): ServernameConnectionConfig | undefined;
export declare class TimeoutError extends Error {
    protected action: string;
    protected timeout_seconds: number;
    constructor(action: string, timeout_seconds: number);
    get message(): string;
}
export declare function destroySocket(socket: libnet.Socket | libtls.TLSSocket): void;
export declare function connectProxySockets(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket): void;
export declare function connectTls(options: libtls.ConnectionOptions, timeout_seconds: number): libtls.TLSSocket;
export declare function makeTlsProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket): libtls.TLSSocket;
export declare function connectTcp(options: libnet.NetConnectOpts, timeout_seconds: number): libnet.Socket;
export declare function makeTcpProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket): libnet.Socket;
export declare function setSocket(tlsSocket: libtls.TLSSocket, socket: libnet.Socket): void;
export declare function handleTLS(clientSocket: libnet.Socket, buffer: Buffer, secureContext: libtls.SecureContext, callback: (tlsSocket: libtls.TLSSocket) => void): void;
export declare function formatAddress(address: libnet.AddressInfo): string;
export type DeferredSecureContext = {
    host: string;
    secureContext: libtls.SecureContext;
    dirty: boolean;
    load: () => void;
};
export declare function createDeferredSecureContext(options: {
    host: string;
    key?: string;
    cert?: string;
    pass?: string;
    sign: boolean;
    defaultSecureContext: libtls.SecureContext;
}): DeferredSecureContext | undefined;
type UpgradeListener = (request: libhttp.IncomingMessage, socket: libnet.Socket, head: Buffer) => void;
export declare function makeServer(options: Options): void;
