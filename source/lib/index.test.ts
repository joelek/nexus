import * as libhttp from "http";
import * as libhttps from "https";
import * as libnet from "net";
import * as wtf from "@joelek/wtf";
import * as index from "./index";
import * as utils from "./utils";

const CREDENTIALS = index.generateSelfSignedCertificate("localhost", 1);

wtf.test(`HTTP server should support HTTP request proxying.`, async (assert) => {
	let events = new Array<wtf.data.SerializableData>();
	await new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let sockets = new Set<libnet.Socket>();
		function trackSocket(socket: libnet.Socket) {
			sockets.add(socket);
			socket.once("close", () => {
				sockets.delete(socket);
				if (sockets.size === 0) {
					resolve();
				}
			});
		};
		let options: index.Options = {
			domains: [
				{
					root: `./public/`
				}
			]
		};
		let config = index.createConfigFromOptions(options);
		let server = index.createHttpServer(config, options);
		server.on("connection", trackSocket);
		server.on("connect", trackSocket);
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
			proxy.on("connection", trackSocket);
			proxy.on("connect", trackSocket);
			proxy.on("listening", () => {
				let proxyAddress = utils.getServerAddress(proxy);
				let request = libhttp.request({
					port: proxyAddress.port,
					headers: [
						"Host", "localhost",
						"Connection", "close"
					]
				});
				request.on("response", (response) => {
					events.push({
						type: "request.response",
						status: response.statusCode
					});
				});
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
		let sockets = new Set<libnet.Socket>();
		function trackSocket(socket: libnet.Socket) {
			sockets.add(socket);
			socket.once("close", () => {
				sockets.delete(socket);
				if (sockets.size === 0) {
					resolve();
				}
			});
		};
		let options: index.Options = {
			domains: [
				{
					root: `./public/`,
					cert: CREDENTIALS.cert,
					key: CREDENTIALS.key
				}
			]
		};
		let config = index.createConfigFromOptions(options);
		let server = index.createHttpsServer(config, options);
		server.on("connection", trackSocket);
		server.on("connect", trackSocket);
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
			proxy.on("connection", trackSocket);
			proxy.on("connect", trackSocket);
			proxy.on("listening", () => {
				let proxyAddress = utils.getServerAddress(proxy);
				let request = libhttp.request({
					port: proxyAddress.port,
					headers: [
						"Host", "localhost",
						"Connection", "close"
					]
				});
				request.on("response", (response) => {
					events.push({
						type: "request.response",
						status: response.statusCode
					});
				});
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

wtf.test(`HTTPS server should support unterminated PIPE connection proxying.`, async (assert) => {
	let events = new Array<wtf.data.SerializableData>();
	await new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let sockets = new Set<libnet.Socket>();
		function trackSocket(socket: libnet.Socket) {
			sockets.add(socket);
			socket.once("close", () => {
				sockets.delete(socket);
				if (sockets.size === 0) {
					resolve();
				}
			});
		};
		let options: index.Options = {
			domains: [
				{
					root: `./public/`,
					cert: CREDENTIALS.cert,
					key: CREDENTIALS.key
				}
			]
		};
		let config = index.createConfigFromOptions(options);
		let server = index.createHttpsServer(config, options);
		server.on("connection", trackSocket);
		server.on("connect", trackSocket);
		server.on("listening", () => {
			let serverAddress = utils.getServerAddress(server);
			let options: index.Options = {
				domains: [
					{
						root: `pipe://localhost:${serverAddress.port}`
					}
				]
			};
			let config = index.createConfigFromOptions(options);
			let proxy = index.createHttpsServer(config, options);
			proxy.on("connection", trackSocket);
			proxy.on("connect", trackSocket);
			proxy.on("listening", () => {
				let proxyAddress = utils.getServerAddress(proxy);
				let request = libhttps.request({
					port: proxyAddress.port,
					headers: [
						"Host", "localhost",
						"Connection", "close"
					],
					rejectUnauthorized: false
				});
				request.on("response", (response) => {
					events.push({
						type: "request.response",
						status: response.statusCode
					});
				});
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

wtf.test(`HTTPS server should support unterminated PROXY connection proxying.`, async (assert) => {
	let events = new Array<wtf.data.SerializableData>();
	await new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let sockets = new Set<libnet.Socket>();
		function trackSocket(socket: libnet.Socket) {
			sockets.add(socket);
			socket.once("close", () => {
				sockets.delete(socket);
				if (sockets.size === 0) {
					resolve();
				}
			});
		};
		let options: index.Options = {
			domains: [
				{
					root: `./public/`,
					cert: CREDENTIALS.cert,
					key: CREDENTIALS.key
				}
			]
		};
		let config = index.createConfigFromOptions(options);
		let server = index.createHttpsServer(config, options);
		server.on("connection", trackSocket);
		server.on("connect", trackSocket);
		server.on("listening", () => {
			let serverAddress = utils.getServerAddress(server);
			let options: index.Options = {
				domains: [
					{
						root: `proxy://localhost:${serverAddress.port}`
					}
				]
			};
			let config = index.createConfigFromOptions(options);
			let proxy = index.createHttpsServer(config, options);
			proxy.on("connection", trackSocket);
			proxy.on("connect", trackSocket);
			proxy.on("listening", () => {
				let proxyAddress = utils.getServerAddress(proxy);
				let request = libhttps.request({
					port: proxyAddress.port,
					headers: [
						"Host", "localhost",
						"Connection", "close"
					],
					rejectUnauthorized: false
				});
				request.on("response", (response) => {
					events.push({
						type: "request.response",
						status: response.statusCode
					});
				});
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
