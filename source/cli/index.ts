#!/usr/bin/env node

import * as lib from "../lib";

function run(): void {
	let options: lib.Options = {
		pathPrefix: "./",
		port: 8000
	};
	let found_unrecognized_argument = false;
	for (let arg of process.argv.slice(2)) {
		let parts: RegExpExecArray | null = null;
		if (false) {
		} else if ((parts = /^--root=(.+)$/.exec(arg)) !== null) {
			options.pathPrefix = parts[1];
		} else if ((parts = /^--port=([0-9]+)$/.exec(arg)) !== null) {
			options.port = Number.parseInt(parts[1]);
		} else if ((parts = /^--indices=(true|false)$/.exec(arg)) !== null) {
			options.generateIndices = parts[1] === "true";
		} else {
			found_unrecognized_argument = true;
			process.stderr.write(`Unrecognized argument "${arg}"!\n`);
		}
	}
	if (found_unrecognized_argument) {
		process.stderr.write(`Arguments:\n`);
		process.stderr.write(`	--root=string\n`);
		process.stderr.write(`		Set root directory for server.\n`);
		process.stderr.write(`	--port=number\n`);
		process.stderr.write(`		Set server port.\n`);
		process.stderr.write(`	--indices=boolean\n`);
		process.stderr.write(`		Configure automatic generation of index documents.\n`);
		process.exit(0);
	} else {
		lib.makeServer(options);
	}
};

run();
