/// <reference types="node" />
import * as autoguard from "@joelek/ts-autoguard";
import * as libhttp from "http";
export declare function encodeXMLText(string: string): string;
export declare function makeStylesheet(): string;
export declare function renderDirectoryListing(directoryListing: autoguard.api.DirectoryListing): string;
export declare function serve(pathPrefix: string, port: number): libhttp.Server;
