/// <reference types="node" />
import * as autoguard from "@joelek/ts-autoguard/dist/lib-server";
import * as libhttp from "http";
export declare type Options = {
    pathPrefix: string;
    port: number;
    generateIndices?: boolean;
};
export declare function computeSimpleHash(string: string): number;
export declare function encodeXMLText(string: string): string;
export declare function makeStylesheet(): string;
export declare function formatSize(size: number): string;
export declare function renderDirectoryListing(directoryListing: autoguard.api.DirectoryListing): string;
export declare function makeRequestListener(options: Options): libhttp.RequestListener;
export declare function makeServer(options: Options): libhttp.Server;
export declare function serve(pathPrefix: string, port: number): libhttp.Server;
