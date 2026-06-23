/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as autoguard from "@joelek/autoguard/dist/lib-server";
import * as libevents from "events";
import * as libhttp from "http";
import * as libhttps from "https";
import * as libnet from "net";
import * as libtls from "tls";
import { Options, Handler } from "./config";
export { Domain, Options, Handler } from "./config";
import * as http from "./http";
import * as proxy from "./proxy";
import * as utils from "./utils";
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
export declare function makeRequestListener(pathPrefix: string, handler: Handler | undefined, clientRouting: boolean, generateIndices: boolean, logger: utils.Logger): libhttp.RequestListener;
export declare function makeRedirectRequestListener(httpsPort: number): libhttp.RequestListener;
export declare function createProxyRawHeaders(request: libhttp.IncomingMessage, overrides: Record<string, string>): Array<string>;
export declare function setupServerRequestLogging(clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, serverRequest: libhttp.ClientRequest, logger: utils.Logger): void;
export declare function makeServerRequest(agent: libhttp.Agent, clientRequest: libhttp.IncomingMessage, clientResponse: libhttp.ServerResponse, cc: ConnectionConfig, logger: utils.Logger): libhttp.ClientRequest;
export declare function makeProxyRequestListener(agent: libhttp.Agent, cc: ConnectionConfig, logger: utils.Logger): libhttp.RequestListener;
export declare function makeProxyUpgradeListener(agent: libhttp.Agent, cc: ConnectionConfig, logger: utils.Logger): http.UpgradeListener;
export type ConnectionConfig = {
    protocol: string;
    hostname: string;
    port: number;
    trusted: boolean;
};
export type ConnectionConfigAndHostname = {
    hostname: string;
    connectionConfig: ConnectionConfig;
};
export declare const TCP_PROTOCOLS: string[];
export declare const HTTP_PROTOCOLS: string[];
export declare function parseConnectionConfig(root: string, defaultPort: number, trustedRemoteAddresses: Array<string>): ConnectionConfig | undefined;
export declare class TimeoutError extends Error {
    protected action: string;
    protected timeout_seconds: number;
    constructor(action: string, timeout_seconds: number);
    get message(): string;
}
export declare function destroySocket(socket: libnet.Socket | libtls.TLSSocket): void;
export declare function setupProxySocketsLogging(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket, logger: utils.Logger): void;
export declare function connectProxySockets(clientSocket: libnet.Socket | libtls.TLSSocket, serverSocket: libnet.Socket | libtls.TLSSocket, logger: utils.Logger): void;
export interface SocketFactoryEvents {
    connect: [libnet.Socket];
}
export declare class SocketFactory extends libevents.EventEmitter<SocketFactoryEvents> {
    constructor();
    createSocket(options: libnet.TcpNetConnectOpts): libnet.Socket;
}
export declare function connectTls(socketFactory: SocketFactory, options: libnet.TcpNetConnectOpts & {
    rejectUnauthorized?: boolean;
}, timeout_seconds: number, logger: utils.Logger): Promise<libtls.TLSSocket>;
export declare function connectTcp(socketFactory: SocketFactory, options: libnet.TcpSocketConnectOpts, timeout_seconds: number, logger: utils.Logger): libnet.Socket;
export declare function makeTcpProxyConnection(socketFactory: SocketFactory, host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket, logger: utils.Logger): libnet.Socket;
export declare function getSocket(tlsSocket: libtls.TLSSocket): libnet.Socket | undefined;
export declare function setSocket(tlsSocket: libtls.TLSSocket, socket: libnet.Socket): void;
export declare function createTLSSocket(clientSocket: libnet.Socket, buffer: Buffer, secureContext: libtls.SecureContext, callback: (tlsSocket: libtls.TLSSocket) => void): void;
export declare abstract class DeferredSecureContext {
    protected host: string;
    constructor(host: string);
    abstract getSecureContext(logger: utils.Logger): libtls.SecureContext;
    matchesHostname(hostname: string): boolean;
}
export declare class CertificateDeferredSecureContext extends DeferredSecureContext {
    protected key: string | undefined;
    protected cert: string | undefined;
    protected pass: string | undefined;
    protected secureContext: libtls.SecureContext | undefined;
    constructor(host: string, key: string | undefined, cert: string | undefined, pass: string | undefined);
    getSecureContext(logger: utils.Logger): libtls.SecureContext;
}
export declare function generateSelfSignedCertificate(host: string, days: number): {
    key: string;
    cert: string;
};
export declare class SelfSignedDeferredSecureContext extends DeferredSecureContext {
    protected days: number;
    protected secureContext: libtls.SecureContext | undefined;
    constructor(host: string, days: number);
    getSecureContext(logger: utils.Logger): libtls.SecureContext;
}
export declare function createDeferredSecureContext(options: {
    host: string;
    key?: string;
    cert?: string;
    pass?: string;
    sign: boolean;
}): DeferredSecureContext | undefined;
export declare function createAgent(cc: ConnectionConfig, logger: utils.Logger, socketFactory: SocketFactory): libhttp.Agent | libhttps.Agent;
export type Config = {
    logger: utils.Logger;
    deferredSecureContexts: Array<DeferredSecureContext>;
    httpRequestListeners: Array<http.RequestListenerAndHostname>;
    httpUpgradeListeners: Array<http.UpgradeListenerAndHostname>;
    httpSocketFactory: SocketFactory;
    httpsRequestListeners: Array<http.RequestListenerAndHostname>;
    httpsUpgradeListeners: Array<http.UpgradeListenerAndHostname>;
    httpsSocketFactory: SocketFactory;
    handledConnectionConfigs: Array<ConnectionConfigAndHostname>;
    delegatedConnectionConfigs: Array<ConnectionConfigAndHostname>;
};
export declare function createConfigFromOptions(options: Options): Config;
export declare function createHttpServer(config: Config, options: Options): proxy.Server;
export declare function createHttpsServer(config: Config, options: Options): proxy.Server;
export declare function makeServer(options: Options): void;
