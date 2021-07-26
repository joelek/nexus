#!/usr/bin/env node
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
const lib = require("../lib");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let domain = {};
        let options = {
            domains: []
        };
        let found_unrecognized_argument = false;
        for (let arg of process.argv.slice(2)) {
            let parts = null;
            if (false) {
            }
            else if ((parts = /^--config=(.*)$/.exec(arg)) !== null) {
                options = lib.loadConfig(parts[1]);
                break;
            }
            else if ((parts = /^--root=(.*)$/.exec(arg)) !== null) {
                domain.root = parts[1] || undefined;
            }
            else if ((parts = /^--port=([0-9]+)$/.exec(arg)) !== null) {
                // TODO: Remove compatibility behaviour in v2.
                options.http = Number.parseInt(parts[1]);
            }
            else if ((parts = /^--http=([0-9]+)$/.exec(arg)) !== null) {
                options.http = Number.parseInt(parts[1]);
            }
            else if ((parts = /^--https=([0-9]+)$/.exec(arg)) !== null) {
                options.https = Number.parseInt(parts[1]);
            }
            else if ((parts = /^--key=(.*)$/.exec(arg)) !== null) {
                domain.key = parts[1] || undefined;
            }
            else if ((parts = /^--cert=(.*)$/.exec(arg)) !== null) {
                domain.cert = parts[1] || undefined;
            }
            else if ((parts = /^--host=(.*)$/.exec(arg)) !== null) {
                domain.host = parts[1] || undefined;
                options.domains.push(Object.assign({}, domain));
            }
            else if ((parts = /^--indices=(true|false)$/.exec(arg)) !== null) {
                domain.indices = parts[1] === "true";
            }
            else if ((parts = /^--routing=(true|false)$/.exec(arg)) !== null) {
                domain.routing = parts[1] === "true";
            }
            else {
                found_unrecognized_argument = true;
                process.stderr.write(`Unrecognized argument "${arg}"!\n`);
            }
        }
        if (found_unrecognized_argument) {
            process.stderr.write(`Arguments:\n`);
            process.stderr.write(`	--config=string\n`);
            process.stderr.write(`		Load specified config.\n`);
            process.stderr.write(`	--root=string\n`);
            process.stderr.write(`		Set root directory for server.\n`);
            process.stderr.write(`	--http=number\n`);
            process.stderr.write(`		Set HTTP server port.\n`);
            process.stderr.write(`	--https=number\n`);
            process.stderr.write(`		Set HTTPS server port.\n`);
            process.stderr.write(`	--key=string\n`);
            process.stderr.write(`		Set path for TLS private key.\n`);
            process.stderr.write(`	--cert=string\n`);
            process.stderr.write(`		Set path for TLS certificate.\n`);
            process.stderr.write(`	--host=string\n`);
            process.stderr.write(`		Set host for which to respond.\n`);
            process.stderr.write(`	--indices=boolean\n`);
            process.stderr.write(`		Configure automatic generation of index documents.\n`);
            process.stderr.write(`	--routing=boolean\n`);
            process.stderr.write(`		Configure support for client-side routing.\n`);
            process.exit(0);
        }
        else {
            if (options.domains.length === 0) {
                options.domains.push(Object.assign({}, domain));
            }
            lib.makeServer(options);
        }
    });
}
;
run().catch((error) => console.log(String(error)));
