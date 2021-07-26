import * as autoguard from "@joelek/ts-autoguard/dist/lib-server";
import * as shared from "./index";
export declare const makeServer: (routes: autoguard.api.Server<shared.Autoguard.Requests, shared.Autoguard.Responses>, options?: Partial<{
    urlPrefix: string;
}> | undefined) => autoguard.api.RequestListener;
