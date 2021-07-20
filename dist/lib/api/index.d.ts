import * as autoguard from "@joelek/ts-autoguard/dist/lib-shared";
export declare namespace Autoguard {
    const Guards: {};
    type Guards = {
        [A in keyof typeof Guards]: ReturnType<typeof Guards[A]["as"]>;
    };
    const Requests: {
        getRequest: autoguard.serialization.MessageGuard<{
            headers?: {
                [x: string]: autoguard.api.JSON;
            } | undefined;
            options?: {
                [x: string]: autoguard.api.JSON;
                filename?: string[] | undefined;
            } | undefined;
            payload?: autoguard.api.AsyncBinary | autoguard.api.SyncBinary | undefined;
        }>;
        headRequest: autoguard.serialization.MessageGuard<{
            headers?: {
                [x: string]: autoguard.api.JSON;
            } | undefined;
            options?: {
                [x: string]: autoguard.api.JSON;
                filename?: string[] | undefined;
            } | undefined;
            payload?: autoguard.api.AsyncBinary | autoguard.api.SyncBinary | undefined;
        }>;
    };
    type Requests = {
        [A in keyof typeof Requests]: ReturnType<typeof Requests[A]["as"]>;
    };
    const Responses: {
        getRequest: autoguard.serialization.MessageGuard<{
            headers?: {
                [x: string]: autoguard.api.JSON;
            } | undefined;
            payload?: autoguard.api.AsyncBinary | autoguard.api.SyncBinary | undefined;
            status?: number | undefined;
        }>;
        headRequest: autoguard.serialization.MessageGuard<{
            headers?: {
                [x: string]: autoguard.api.JSON;
            } | undefined;
            payload?: autoguard.api.AsyncBinary | autoguard.api.SyncBinary | undefined;
            status?: number | undefined;
        }>;
    };
    type Responses = {
        [A in keyof typeof Responses]: ReturnType<typeof Responses[A]["as"]>;
    };
}
