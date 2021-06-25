"use strict";
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
exports.serve = void 0;
const autoguard = require("@joelek/ts-autoguard");
const libhttp = require("http");
const libserver = require("./api/server");
function serve(pathPrefix, port) {
    let api = libserver.makeServer({
        getStaticContent: (request) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            let options = request.options();
            let pathSuffix = ((_a = options.filename) !== null && _a !== void 0 ? _a : []).join("/");
            return autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
        })
    });
    let server = libhttp.createServer({}, api);
    server.listen(port, () => {
        process.stdout.write(`Serving "${pathPrefix}" at http://localhost:${port}/"\n`);
    });
    return server;
}
exports.serve = serve;
;
