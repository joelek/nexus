import * as autoguard from "@joelek/ts-autoguard/dist/lib-client";
import * as shared from "./index";
export declare type Client = autoguard.api.Client<shared.Autoguard.Requests, shared.Autoguard.Responses>;
export declare const makeClient: (clientOptions?: autoguard.api.ClientOptions | undefined) => Client;
