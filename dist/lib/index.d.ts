/// <reference types="node" />
import * as autoguard from "@joelek/ts-autoguard/dist/lib-server";
import * as libhttp from "http";
export declare type Options = {
    pathPrefix: string;
    port: number;
    generateIndices?: boolean;
    clientRouting?: boolean;
};
export declare function computeSimpleHash(string: string): number;
export declare function encodeXMLText(string: string): string;
export declare function makeStylesheet(): string;
export declare function formatSize(size: number): string;
export declare function renderDirectoryListing(directoryListing: autoguard.api.DirectoryListing): string;
export declare function makeDirectoryListingResponse(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>): autoguard.api.EndpointResponse & {
    payload: autoguard.api.Binary;
};
export declare function makeRequestListener(options: Options): libhttp.RequestListener;
export declare function makeServer(options: Options): libhttp.Server;
export declare function serve(pathPrefix: string, port: number): libhttp.Server;
