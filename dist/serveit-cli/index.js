#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const serveit_lib_1 = require("../serveit-lib");
function run() {
    let options = {
        root: "./",
        port: 8000
    };
    let found_unrecognized_argument = false;
    for (let arg of process.argv.slice(2)) {
        let parts = null;
        if (false) {
        }
        else if ((parts = /^--root=(.+)$/.exec(arg)) !== null) {
            options.root = parts[1];
        }
        else if ((parts = /^--port=([0-9]+)$/.exec(arg)) !== null) {
            options.port = Number.parseInt(parts[1]);
        }
        else {
            found_unrecognized_argument = true;
            process.stderr.write("Argument \"" + arg + "\" was not recognized!\n");
        }
    }
    if (found_unrecognized_argument) {
        process.stderr.write("Arguments:\n");
        process.stderr.write("	--root=string\n");
        process.stderr.write("	--port=number\n");
        process.exit(0);
    }
    else {
        serveit_lib_1.serve(options.root, options.port);
    }
}
run();
