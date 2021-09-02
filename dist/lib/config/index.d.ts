import * as autoguard from "@joelek/ts-autoguard/dist/lib-shared";
export declare const Domain: autoguard.serialization.MessageGuard<Domain>;
export declare type Domain = autoguard.guards.Object<{}, {
    "root": autoguard.guards.String;
    "key": autoguard.guards.String;
    "cert": autoguard.guards.String;
    "host": autoguard.guards.String;
    "indices": autoguard.guards.Boolean;
    "routing": autoguard.guards.Boolean;
}>;
export declare const Options: autoguard.serialization.MessageGuard<Options>;
export declare type Options = autoguard.guards.Object<{}, {
    "domains": autoguard.guards.Array<autoguard.guards.Reference<Domain>>;
    "http": autoguard.guards.Number;
    "https": autoguard.guards.Number;
}>;
export declare namespace Autoguard {
    const Guards: {
        Domain: autoguard.serialization.MessageGuard<{
            root?: string | undefined;
            key?: string | undefined;
            cert?: string | undefined;
            host?: string | undefined;
            indices?: boolean | undefined;
            routing?: boolean | undefined;
        }>;
        Options: autoguard.serialization.MessageGuard<{
            domains?: autoguard.guards.Array<{
                root?: string | undefined;
                key?: string | undefined;
                cert?: string | undefined;
                host?: string | undefined;
                indices?: boolean | undefined;
                routing?: boolean | undefined;
            }> | undefined;
            http?: number | undefined;
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
