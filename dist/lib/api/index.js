"use strict";
// This file was auto-generated by @joelek/autoguard. Edit at own risk.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Autoguard = void 0;
const autoguard = require("@joelek/autoguard/dist/lib-shared");
var Autoguard;
(function (Autoguard) {
    Autoguard.Guards = {};
    Autoguard.Requests = {
        "getRequest": autoguard.guards.Object.of({}, {
            "options": autoguard.guards.Intersection.of(autoguard.guards.Object.of({}, {
                "filename": autoguard.guards.Array.of(autoguard.guards.String)
            }), autoguard.api.Options),
            "headers": autoguard.guards.Intersection.of(autoguard.guards.Object.of({}, {}), autoguard.api.Headers),
            "payload": autoguard.api.Binary
        }),
        "headRequest": autoguard.guards.Object.of({}, {
            "options": autoguard.guards.Intersection.of(autoguard.guards.Object.of({}, {
                "filename": autoguard.guards.Array.of(autoguard.guards.String)
            }), autoguard.api.Options),
            "headers": autoguard.guards.Intersection.of(autoguard.guards.Object.of({}, {}), autoguard.api.Headers),
            "payload": autoguard.api.Binary
        })
    };
    Autoguard.Responses = {
        "getRequest": autoguard.guards.Object.of({}, {
            "status": autoguard.guards.Integer,
            "headers": autoguard.guards.Intersection.of(autoguard.guards.Object.of({}, {}), autoguard.api.Headers),
            "payload": autoguard.api.Binary
        }),
        "headRequest": autoguard.guards.Object.of({}, {
            "status": autoguard.guards.Integer,
            "headers": autoguard.guards.Intersection.of(autoguard.guards.Object.of({}, {}), autoguard.api.Headers),
            "payload": autoguard.api.Binary
        })
    };
})(Autoguard = exports.Autoguard || (exports.Autoguard = {}));
;
