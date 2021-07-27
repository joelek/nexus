import * as autoguard from "@joelek/ts-autoguard/dist/lib-shared";
export declare const Domain: autoguard.serialization.MessageGuard<{
    host?: string | undefined;
    cert?: string | undefined;
    key?: string | undefined;
    root?: string | undefined;
    indices?: boolean | undefined;
    routing?: boolean | undefined;
}>;
export declare type Domain = ReturnType<typeof Domain["as"]>;
export declare const Options: autoguard.serialization.MessageGuard<{
    http?: number | undefined;
    domains?: {
        host?: string | undefined;
        cert?: string | undefined;
        key?: string | undefined;
        root?: string | undefined;
        indices?: boolean | undefined;
        routing?: boolean | undefined;
    }[] | undefined;
    https?: number | undefined;
}>;
export declare type Options = ReturnType<typeof Options["as"]>;
export declare namespace Autoguard {
    const Guards: {
        Domain: autoguard.serialization.MessageGuard<{
            host?: string | undefined;
            cert?: string | undefined;
            key?: string | undefined;
            root?: string | undefined;
            indices?: boolean | undefined;
            routing?: boolean | undefined;
        }>;
        Options: autoguard.serialization.MessageGuard<{
            http?: number | undefined;
            domains?: {
                host?: string | undefined;
                cert?: string | undefined;
                key?: string | undefined;
                root?: string | undefined;
                indices?: boolean | undefined;
                routing?: boolean | undefined;
            }[] | undefined;
            https?: number | undefined;
        }>;
    };
    type Guards = {
        [A in keyof typeof Guards]: ReturnType<typeof Guards[A]["as"]>;
    };
    const Requests: {};
    type Requests = {
        [A in keyof typeof Requests]: ReturnType<typeof Requests[A]["as"]>;
    };
    const Responses: {};
    type Responses = {
        [A in keyof typeof Responses]: ReturnType<typeof Responses[A]["as"]>;
    };
}
