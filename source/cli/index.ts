#!/usr/bin/env node

import * as lib from "../lib";

function run(): void {
	let options: lib.Options = {
		pathPrefix: "./",
		httpPort: 8000
	};
	let found_unrecognized_argument = false;
	for (let arg of process.argv.slice(2)) {
		let parts: RegExpExecArray | null = null;
		if (false) {
		} else if ((parts = /^--root=(.+)$/.exec(arg)) !== null) {
			options.pathPrefix = parts[1];
		} else if ((parts = /^--port=([0-9]+)$/.exec(arg)) !== null) {
			// TODO: Remove compatibility behaviour in v2.
			options.httpPort = Number.parseInt(parts[1]);
		} else if ((parts = /^--http=([0-9]+)$/.exec(arg)) !== null) {
			options.httpPort = Number.parseInt(parts[1]);
		} else if ((parts = /^--https=([0-9]+)$/.exec(arg)) !== null) {
			options.httpsPort = Number.parseInt(parts[1]);
		} else if ((parts = /^--key=(.*)$/.exec(arg)) !== null) {
			options.key = parts[1] || undefined;
		} else if ((parts = /^--cert=(.*)$/.exec(arg)) !== null) {
			options.cert = parts[1] || undefined;
		} else if ((parts = /^--indices=(true|false)$/.exec(arg)) !== null) {
			options.generateIndices = parts[1] === "true";
		} else if ((parts = /^--routing=(true|false)$/.exec(arg)) !== null) {
			options.clientRouting = parts[1] === "true";
		} else {
			found_unrecognized_argument = true;
			process.stderr.write(`Unrecognized argument "${arg}"!\n`);
		}
	}
	if (found_unrecognized_argument) {
		process.stderr.write(`Arguments:\n`);
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
		process.stderr.write(`	--indices=boolean\n`);
		process.stderr.write(`		Configure automatic generation of index documents.\n`);
		process.stderr.write(`	--routing=boolean\n`);
		process.stderr.write(`		Configure support for client-side routing.\n`);
		process.exit(0);
	} else {
		lib.makeServer(options);
	}
};

run();
