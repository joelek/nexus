import * as libhttp from "http";
import * as libhttps from "https";
import * as wtf from "@joelek/wtf";
import * as index from "./index";
import * as utils from "./utils";

const CREDENTIALS = index.generateSelfSignedCertificate("localhost", 1);

wtf.test(`HTTP server should support HTTP request proxying.`, async (assert) => {
	let events = new Array<wtf.data.SerializableData>();
	await new Promise<void>((resolve, reject) => {
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
				],
				trust: [
					"localhost"
				]
			};
			let config = index.createConfigFromOptions(options);
			let proxy = index.createHttpServer(config, options);
			proxy.on("listening", () => {
				let proxyAddress = utils.getServerAddress(proxy);
				let request = libhttp.request({
					port: proxyAddress.port
				});
				request.on("finish", () => {});
				request.on("response", (response) => {
					events.push({
						type: "request.response",
						status: response.statusCode
					});
					response.on("data", () => {});
					response.on("end", () => {});
					response.on("close", resolve);
				});
				request.on("close", () => {});
				request.end();
			});
			proxy.listen(undefined, "0.0.0.0");
		});
		server.listen(undefined, "0.0.0.0");
	});
	assert.equals(events, [
		{
			type: "request.response",
			status: 404
		}
	]);
});

wtf.test(`HTTP server should support HTTPS request proxying.`, async (assert) => {
	let events = new Array<wtf.data.SerializableData>();
	await new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let server = libhttps.createServer(CREDENTIALS);
		server.on("request", (request, response) => {
			response.writeHead(404);
			response.end();
		});
		server.on("listening", () => {
			let serverAddress = utils.getServerAddress(server);
			let options: index.Options = {
				domains: [
					{
						root: `https://localhost:${serverAddress.port}`
					}
				],
				trust: [
					"localhost"
				]
			};
			let config = index.createConfigFromOptions(options);
			let proxy = index.createHttpServer(config, options);
			proxy.on("listening", () => {
				let proxyAddress = utils.getServerAddress(proxy);
				let request = libhttp.request({
					port: proxyAddress.port
				});
				request.on("finish", () => {});
				request.on("response", (response) => {
					events.push({
						type: "request.response",
						status: response.statusCode
					});
					response.on("data", () => {});
					response.on("end", () => {});
					response.on("close", resolve);
				});
				request.on("close", () => {});
				request.end();
			});
			proxy.listen(undefined, "0.0.0.0");
		});
		server.listen(undefined, "0.0.0.0");
	});
	assert.equals(events, [
		{
			type: "request.response",
			status: 404
		}
	]);
});

wtf.test(`HTTPS server should support PIPE connection proxying.`, async (assert) => {
	let events = new Array<wtf.data.SerializableData>();
	await new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let server = libhttps.createServer(CREDENTIALS);
		server.on("request", (request, response) => {
			response.writeHead(404);
			response.end();
		});
		server.on("listening", () => {
			let serverAddress = utils.getServerAddress(server);
			let options: index.Options = {
				domains: [
					{
						root: `pipe://localhost:${serverAddress.port}`
					}
				],
				trust: [
					"localhost"
				]
			};
			let config = index.createConfigFromOptions(options);
			let proxy = index.createHttpsServer(config, options);
			proxy.on("listening", () => {
				let proxyAddress = utils.getServerAddress(proxy);
				let request = libhttps.request({
					port: proxyAddress.port,
					rejectUnauthorized: false
				});
				request.on("finish", () => {});
				request.on("response", (response) => {
					events.push({
						type: "request.response",
						status: response.statusCode
					});
					response.on("data", () => {});
					response.on("end", () => {});
					response.on("close", resolve);
				});
				request.on("close", () => {});
				request.end();
			});
			proxy.listen(undefined, "0.0.0.0");
		});
		server.listen(undefined, "0.0.0.0");
	});
	assert.equals(events, [
		{
			type: "request.response",
			status: 404
		}
	]);
});

wtf.test(`HTTPS server should support PROXY connection proxying.`, async (assert) => {
	let events = new Array<wtf.data.SerializableData>();
	await new Promise<void>((resolve, reject) => {
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
				],
				trust: [
					"localhost"
				],
				sign: true
			};
			let config = index.createConfigFromOptions(options);
			let inner = index.createHttpsServer(config, options);
			inner.on("listening", () => {
				let innerAddress = utils.getServerAddress(inner);
				let options: index.Options = {
					domains: [
						{
							root: `proxy://localhost:${innerAddress.port}`
						}
					],
					trust: [
						"localhost"
					]
				};
				let config = index.createConfigFromOptions(options);
				let outer = index.createHttpsServer(config, options);
				outer.on("listening", () => {
					let outerAddress = utils.getServerAddress(outer);
					let request = libhttps.request({
						port: outerAddress.port,
						rejectUnauthorized: false
					});
					request.on("finish", () => {});
					request.on("response", (response) => {
						events.push({
							type: "request.response",
							status: response.statusCode
						});
						response.on("data", () => {});
						response.on("end", () => {});
						response.on("close", resolve);
					});
					request.on("close", () => {});
					request.end();
				});
				outer.listen(undefined, "0.0.0.0");
			});
			inner.listen(undefined, "0.0.0.0");
		});
		server.listen(undefined, "0.0.0.0");
	});
	assert.equals(events, [
		{
			type: "request.response",
			status: 404
		}
	]);
});
