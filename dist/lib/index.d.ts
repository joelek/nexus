/// <reference types="node" />
import * as autoguard from "@joelek/ts-autoguard/dist/lib-server";
import * as libhttp from "http";
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
export declare function makeRequestListener(pathPrefix: string, clientRouting: boolean, generateIndices: boolean): libhttp.RequestListener;
export declare function makeRedirectRequestListener(httpsPort: number): libhttp.RequestListener;
export declare function matchesHostPattern(subject: string, pattern: string): boolean;
export declare function makeServer(options: Options): libhttp.Server;
export declare function serve(root: string, http: number): libhttp.Server;
