/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import * as autoguard from "@joelek/ts-autoguard/dist/lib-server";
import * as libhttp from "http";
import * as libnet from "net";
import * as libtls from "tls";
import { Options } from "./config";
export { Domain, Options } from "./config";
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
export declare function makeRequestListener(pathPrefix: string, clientRouting: boolean, generateIndices: boolean): libhttp.RequestListener;
export declare function makeRedirectRequestListener(httpsPort: number): libhttp.RequestListener;
export declare function matchesHostnamePattern(subject: string, pattern: string): boolean;
export declare function connectSockets(serverSocket: libnet.Socket | libtls.TLSSocket, clientSocket: libnet.Socket | libtls.TLSSocket, head: Buffer): void;
export declare function makeTcpProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket): libnet.Socket;
export declare function makeTlsProxyConnection(host: string, port: number, head: Buffer, clientSocket: libnet.Socket | libtls.TLSSocket): libtls.TLSSocket;
export declare function getServerPort(server: libnet.Server): number;
export declare type ServernameConnectionConfig = {
    hostname: string;
    port: number;
};
export declare function parseServernameConnectionConfig(root: string, defaultPort: number): ServernameConnectionConfig;
export declare function makeServer(options: Options): void;
