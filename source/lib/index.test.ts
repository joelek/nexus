import * as libhttp from "http";
import * as libhttps from "https";
import * as wtf from "@joelek/wtf";
import * as index from "./index";
import * as utils from "./utils";

wtf.test(`Server should support http protocol.`, async (assert) => {
	return new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let server = libhttp.createServer({});
		server.on("request", (request, response) => {
			response.writeHead(404);
			response.end();
		});
		server.on("listening", () => {
			let serverAddress = utils.getServerAddress(server);
			let options: index.Options = {
				domains: [
					{
						root: `http://localhost:${serverAddress.port}`
					}
				]
			};
			let config = index.createConfigFromOptions(options);
			let proxy = index.createHttpServer(config, options);
			proxy.on("listening", () => {
				let proxyAddress = utils.getServerAddress(proxy);
				let request = libhttp.request({
					port: proxyAddress.port,
				});
				request.on("finish", () => {});
				request.on("response", (response) => {
					response.on("data", () => {});
					response.on("end", () => {});
					response.on("close", resolve);
				});
				request.on("close", () => {});
				request.end();
			});
			proxy.listen({
				port: 8080,
				host: "0.0.0.0"
			});
		});
		server.listen(undefined);
	});
});
