import * as autoguard from "@joelek/autoguard/dist/lib-shared";
export declare const Handler: autoguard.serialization.MessageGuard<Handler>;
export type Handler = autoguard.guards.StringLiteral<"git">;
export declare const Domain: autoguard.serialization.MessageGuard<Domain>;
export type Domain = autoguard.guards.Object<{}, {
    "root": autoguard.guards.String;
    "key": autoguard.guards.String;
    "cert": autoguard.guards.String;
    "pass": autoguard.guards.String;
    "host": autoguard.guards.String;
    "handler": autoguard.guards.Reference<Handler>;
    "indices": autoguard.guards.Boolean;
    "routing": autoguard.guards.Boolean;
}>;
export declare const Options: autoguard.serialization.MessageGuard<Options>;
export type Options = autoguard.guards.Object<{}, {
    "domains": autoguard.guards.Array<autoguard.guards.Reference<Domain>>;
    "http": autoguard.guards.Number;
    "https": autoguard.guards.Number;
    "sign": autoguard.guards.Boolean;
}>;
export declare namespace Autoguard {
    const Guards: {
        Handler: autoguard.guards.ReferenceGuard<"git">;
        Domain: autoguard.guards.ReferenceGuard<{
            root?: string | undefined;
            key?: string | undefined;
            cert?: string | undefined;
            pass?: string | undefined;
            host?: string | undefined;
            handler?: "git" | undefined;
            indices?: boolean | undefined;
            routing?: boolean | undefined;
        }>;
        Options: autoguard.guards.ReferenceGuard<{
            domains?: autoguard.guards.Array<{
                root?: string | undefined;
                key?: string | undefined;
                cert?: string | undefined;
                pass?: string | undefined;
                host?: string | undefined;
                handler?: "git" | undefined;
                indices?: boolean | undefined;
                routing?: boolean | undefined;
            }> | undefined;
            http?: number | undefined;
            https?: number | undefined;
            sign?: boolean | undefined;
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
