import * as autoguard from "@joelek/ts-autoguard/dist/lib-shared";
export declare namespace Autoguard {
    const Guards: {};
    type Guards = {
        [A in keyof typeof Guards]: ReturnType<typeof Guards[A]["as"]>;
    };
    const Requests: {
        getRequest: autoguard.guards.ObjectGuard<import("@joelek/ts-stdlib/dist/lib/routing").MessageMap<unknown>, {
            options: {
                [x: string]: any;
                filename?: autoguard.guards.Array<string> | undefined;
            };
            headers: {
                [x: string]: any;
            };
            payload: autoguard.api.AsyncBinary | autoguard.api.SyncBinary;
        }>;
        headRequest: autoguard.guards.ObjectGuard<import("@joelek/ts-stdlib/dist/lib/routing").MessageMap<unknown>, {
            options: {
                [x: string]: any;
                filename?: autoguard.guards.Array<string> | undefined;
            };
            headers: {
                [x: string]: any;
            };
            payload: autoguard.api.AsyncBinary | autoguard.api.SyncBinary;
        }>;
    };
    type Requests = {
        [A in keyof typeof Requests]: ReturnType<typeof Requests[A]["as"]>;
    };
    const Responses: {
        getRequest: autoguard.guards.ObjectGuard<import("@joelek/ts-stdlib/dist/lib/routing").MessageMap<unknown>, {
            status: number;
            headers: {
                [x: string]: any;
            };
            payload: autoguard.api.AsyncBinary | autoguard.api.SyncBinary;
        }>;
        headRequest: autoguard.guards.ObjectGuard<import("@joelek/ts-stdlib/dist/lib/routing").MessageMap<unknown>, {
            status: number;
            headers: {
                [x: string]: any;
            };
            payload: autoguard.api.AsyncBinary | autoguard.api.SyncBinary;
        }>;
    };
    type Responses = {
        [A in keyof typeof Responses]: ReturnType<typeof Responses[A]["as"]>;
    };
}
