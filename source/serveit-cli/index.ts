#!/usr/bin/env node

import { serve } from "../serveit-lib";

let options = {
	root: "./",
	port: 8000,
	help: false
};

for (let arg of process.argv.slice(2)) {
	let parts: RegExpExecArray | null = null;
	if (false) {
	} else if ((parts = /^--root=(.+)$/.exec(arg)) !== null) {
		options.root = parts[1];
	} else if ((parts = /^--port=([0-9]+)$/.exec(arg)) !== null) {
		options.port = Number.parseInt(parts[1]);
	} else if ((parts = /^--help$/.exec(arg)) !== null) {
		options.help = true;
	} else {
		process.stderr.write("Argument \"" + arg + "\" was not recognized!\n");
	}
}

if (options.help) {
	process.stdout.write("usage: server [--root=<root>] [--port=<port>] [--help]\n");
	process.exit(0);
} else {
	serve(options.root, options.port);
}
