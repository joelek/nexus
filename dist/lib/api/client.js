"use strict";
// This file was auto-generated by @joelek/ts-autoguard. Edit at own risk.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeClient = void 0;
const autoguard = require("@joelek/ts-autoguard/dist/lib-client");
const shared = require("./index");
const makeClient = (clientOptions) => ({
    "getRequest": (request) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        let guard = autoguard.api.wrapMessageGuard(shared.Autoguard.Requests["getRequest"], clientOptions === null || clientOptions === void 0 ? void 0 : clientOptions.debugMode);
        guard.as(request, "request");
        let method = "GET";
        let components = new Array();
        components.push(...autoguard.api.encodeComponents((_b = (_a = request.options) === null || _a === void 0 ? void 0 : _a["filename"]) !== null && _b !== void 0 ? _b : [], true));
        let parameters = new Array();
        parameters.push(...autoguard.api.encodeUndeclaredParameterPairs((_c = request.options) !== null && _c !== void 0 ? _c : {}, [...["filename"], ...parameters.map((parameter) => parameter[0])]));
        let headers = new Array();
        headers.push(...autoguard.api.encodeUndeclaredHeaderPairs((_d = request.headers) !== null && _d !== void 0 ? _d : {}, headers.map((header) => header[0])));
        let payload = (_e = request.payload) !== null && _e !== void 0 ? _e : [];
        let requestHandler = (_f = clientOptions === null || clientOptions === void 0 ? void 0 : clientOptions.requestHandler) !== null && _f !== void 0 ? _f : autoguard.api.xhr;
        let defaultHeaders = (_h = (_g = clientOptions === null || clientOptions === void 0 ? void 0 : clientOptions.defaultHeaders) === null || _g === void 0 ? void 0 : _g.slice()) !== null && _h !== void 0 ? _h : [];
        defaultHeaders.push(["Content-Type", "application/octet-stream"]);
        defaultHeaders.push(["Accept", "application/octet-stream"]);
        let raw = yield requestHandler(autoguard.api.finalizeRequest({ method, components, parameters, headers, payload }, defaultHeaders), clientOptions);
        {
            let status = raw.status;
            let headers = {};
            headers = Object.assign(Object.assign({}, headers), autoguard.api.decodeUndeclaredHeaders(raw.headers, Object.keys(headers)));
            let payload = raw.payload;
            let guard = autoguard.api.wrapMessageGuard(shared.Autoguard.Responses["getRequest"], clientOptions === null || clientOptions === void 0 ? void 0 : clientOptions.debugMode);
            let response = guard.as({ status, headers, payload }, "response");
            return new autoguard.api.ServerResponse(response, true);
        }
    }),
    "headRequest": (request) => __awaiter(void 0, void 0, void 0, function* () {
        var _j, _k, _l, _m, _o, _p, _q, _r;
        let guard = autoguard.api.wrapMessageGuard(shared.Autoguard.Requests["headRequest"], clientOptions === null || clientOptions === void 0 ? void 0 : clientOptions.debugMode);
        guard.as(request, "request");
        let method = "HEAD";
        let components = new Array();
        components.push(...autoguard.api.encodeComponents((_k = (_j = request.options) === null || _j === void 0 ? void 0 : _j["filename"]) !== null && _k !== void 0 ? _k : [], true));
        let parameters = new Array();
        parameters.push(...autoguard.api.encodeUndeclaredParameterPairs((_l = request.options) !== null && _l !== void 0 ? _l : {}, [...["filename"], ...parameters.map((parameter) => parameter[0])]));
        let headers = new Array();
        headers.push(...autoguard.api.encodeUndeclaredHeaderPairs((_m = request.headers) !== null && _m !== void 0 ? _m : {}, headers.map((header) => header[0])));
        let payload = (_o = request.payload) !== null && _o !== void 0 ? _o : [];
        let requestHandler = (_p = clientOptions === null || clientOptions === void 0 ? void 0 : clientOptions.requestHandler) !== null && _p !== void 0 ? _p : autoguard.api.xhr;
        let defaultHeaders = (_r = (_q = clientOptions === null || clientOptions === void 0 ? void 0 : clientOptions.defaultHeaders) === null || _q === void 0 ? void 0 : _q.slice()) !== null && _r !== void 0 ? _r : [];
        defaultHeaders.push(["Content-Type", "application/octet-stream"]);
        defaultHeaders.push(["Accept", "application/octet-stream"]);
        let raw = yield requestHandler(autoguard.api.finalizeRequest({ method, components, parameters, headers, payload }, defaultHeaders), clientOptions);
        {
            let status = raw.status;
            let headers = {};
            headers = Object.assign(Object.assign({}, headers), autoguard.api.decodeUndeclaredHeaders(raw.headers, Object.keys(headers)));
            let payload = raw.payload;
            let guard = autoguard.api.wrapMessageGuard(shared.Autoguard.Responses["headRequest"], clientOptions === null || clientOptions === void 0 ? void 0 : clientOptions.debugMode);
            let response = guard.as({ status, headers, payload }, "response");
            return new autoguard.api.ServerResponse(response, true);
        }
    }),
});
exports.makeClient = makeClient;
