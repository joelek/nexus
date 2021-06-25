import * as autoguard from "@joelek/ts-autoguard";
import * as libhttp from "http";
import * as libserver from "./api/server";

export function serve(pathPrefix: string, port: number): libhttp.Server {
	let api = libserver.makeServer({
		getStaticContent: async (request) => {
			let options = request.options();
			let pathSuffix = (options.filename ?? []).join("/");
			return autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
		}
	});
	let server = libhttp.createServer({}, api);
	server.listen(port, () => {
		process.stdout.write(`Serving "${pathPrefix}" at http://localhost:${port}/"\n`);
	});
	return server;
};
