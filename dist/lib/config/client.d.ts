import * as autoguard from "@joelek/ts-autoguard/dist/lib-client";
import * as shared from "./index";
export declare const makeClient: (options?: Partial<{
    urlPrefix: string;
    requestHandler: autoguard.api.RequestHandler;
}> | undefined) => autoguard.api.Client<shared.Autoguard.Requests, shared.Autoguard.Responses>;
