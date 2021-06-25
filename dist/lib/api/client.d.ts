import * as autoguard from "@joelek/ts-autoguard";
import * as shared from "./index";
export declare const makeClient: (options?: Partial<{
    urlPrefix: string;
    requestHandler: autoguard.api.RequestHandler;
}> | undefined) => autoguard.api.Client<shared.Autoguard.Requests, shared.Autoguard.Responses>;
