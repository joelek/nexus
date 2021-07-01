import * as autoguard from "@joelek/ts-autoguard";
export declare namespace Autoguard {
    const Guards: {};
    type Guards = {
        [A in keyof typeof Guards]: ReturnType<typeof Guards[A]["as"]>;
    };
    const Requests: {
        getStaticContent: autoguard.serialization.MessageGuard<{
            options?: {
                [x: string]: autoguard.api.JSON;
                filename?: string[] | undefined;
            } | undefined;
            headers?: {
                [x: string]: autoguard.api.JSON;
            } | undefined;
            payload?: autoguard.api.AsyncBinary | autoguard.api.SyncBinary | undefined;
        }>;
        headStaticContent: autoguard.serialization.MessageGuard<{
            options?: {
                [x: string]: autoguard.api.JSON;
                filename?: string[] | undefined;
            } | undefined;
            headers?: {
                [x: string]: autoguard.api.JSON;
            } | undefined;
            payload?: autoguard.api.AsyncBinary | autoguard.api.SyncBinary | undefined;
        }>;
    };
    type Requests = {
        [A in keyof typeof Requests]: ReturnType<typeof Requests[A]["as"]>;
    };
    const Responses: {
        getStaticContent: autoguard.serialization.MessageGuard<{
            headers?: {
                [x: string]: autoguard.api.JSON;
            } | undefined;
            payload?: autoguard.api.AsyncBinary | autoguard.api.SyncBinary | undefined;
            status?: number | undefined;
        }>;
        headStaticContent: autoguard.serialization.MessageGuard<{
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
