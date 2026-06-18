/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as autoguard from "@joelek/autoguard/dist/lib-server";
import * as libhttp from "http";
import * as libhttps from "https";
import * as libnet from "net";
import * as libtls from "tls";
import { Options, Handler } from "./config";
export { Domain, Options, Handler } from "./config";
import * as http from "./http";
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
export declare function setupServerRequestLogging(clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, serverRequest: libhttp.ClientRequest): void;
export declare function makeServerRequest(agent: libhttp.Agent, clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, cc: ConnectionConfig, httpDebug: boolean): libhttp.ClientRequest;
export declare function makeProxyRequestListener(agent: libhttp.Agent, cc: ConnectionConfig, httpDebug: boolean): libhttp.RequestListener;
export declare function makeProxyUpgradeListener(agent: libhttp.Agent, cc: ConnectionConfig, httpDebug: boolean): http.UpgradeListener;
export type ConnectionConfig = {
    protocol: string;
    hostname: string;
    port: number;
};
export type ConnectionConfigAndHostname = {
    hostname: string;
    connectionConfig: ConnectionConfig;
};
export declare const TCP_PROTOCOLS: string[];
export declare const HTTP_PROTOCOLS: string[];
export declare function parseConnectionConfig(root: string, defaultPort: number): ConnectionConfig | undefined;
export declare class TimeoutError extends Error {
    protected action: string;
    protected timeout_seconds: number;
    constructor(action: string, timeout_seconds: number);
    get message(): string;
}
export declare function destroySocket(socket: libnet.Socket | libtls.TLSSocket): void;
export declare function setupProxySocketsLogging(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket): void;
export declare function connectProxySockets(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket, debug: boolean): void;
export declare function connectTls(options: libnet.TcpNetConnectOpts, timeout_seconds: number, debug: boolean): Promise<libtls.TLSSocket>;
export declare function connectTcp(options: libnet.TcpNetConnectOpts, timeout_seconds: number, debug: boolean): libnet.Socket;
export declare function makeTcpProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket, debug: boolean): libnet.Socket;
export declare function getSocket(tlsSocket: libtls.TLSSocket): libnet.Socket | undefined;
export declare function setSocket(tlsSocket: libtls.TLSSocket, socket: libnet.Socket): void;
export declare function createTLSSocket(clientSocket: libnet.Socket, buffer: Buffer, secureContext: libtls.SecureContext, callback: (tlsSocket: libtls.TLSSocket) => void): void;
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
export declare function createAgent(cc: ConnectionConfig, tcpDebug: boolean): libhttp.Agent | libhttps.Agent;
export declare function makeServer(options: Options): void;
