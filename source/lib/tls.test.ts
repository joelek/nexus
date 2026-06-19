import * as libnet from "net";
import * as wtf from "@joelek/wtf";
import * as tls from "./tls";
import * as utils from "./utils";

wtf.test(`getServernameAndBuffer() should reject when failing to parse a TLS plaintext message with servername within a set number of seconds.`, async (assert) => {
	return new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let server = libnet.createServer();
		server.on("connection", async (socket) => {
			try {
				let { servername, buffer } = await tls.getServernameAndBuffer({
					socket: socket,
					timeoutSeconds: 1
				});
				reject();
			} catch (error) {
				resolve();
			}
		});
		server.listen(undefined, () => {
			let address = utils.getServerAddress(server);
			let socket = libnet.connect({
				port: address.port
			})
			socket.on("error", (error) => {}); // NOTE: Prevent errors from being thrown.
			socket.once("close", (had_error) => {});
			socket.once("connect", () => {});
		});
	});
});

wtf.test(`getServernameAndBuffer() should reject when failing to parse a TLS plaintext message with servername within a set number of bytes.`, async (assert) => {
	return new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let server = libnet.createServer();
		server.on("connection", async (socket) => {
			try {
				let { servername, buffer } = await tls.getServernameAndBuffer({
					socket: socket,
					timeoutSeconds: 1
				});
				reject();
			} catch (error) {
				resolve();
			}
		});
		server.listen(undefined, () => {
			let address = utils.getServerAddress(server);
			let socket = libnet.connect({
				port: address.port
			})
			socket.on("error", (error) => {}); // NOTE: Prevent errors from being thrown.
			socket.once("close", (had_error) => {});
			socket.once("connect", () => {
				socket.write(Buffer.alloc(64 * 1024));
			});
		});
	});
});
