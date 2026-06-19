import * as libnet from "net";
import * as wtf from "@joelek/wtf";
import * as proxy from "./proxy";
import * as utils from "./utils";

wtf.test(`Server should immediately reset connections sending bad proxy headers.`, async (assert) => {
	return new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let server = proxy.createServer({
			trustedRemoteAddresses: []
		}, (socket, header) => {});
		server.listen(undefined, () => {
			let address = utils.getServerAddress(server);
			let socket = libnet.connect({
				port: address.port
			});
			socket.on("error", (error) => {}); // NOTE: Prevent errors from being thrown.
			socket.once("close", (had_error) => {
				if (socket.errored != null && (socket.errored as NodeJS.ErrnoException).code === "ECONNRESET") {
					resolve();
				} else {
					reject();
				}
			});
			socket.once("connect", () => {
				socket.write("PROXY\r\n");
			});
		});
	});
});

wtf.test(`Server should pass PROXY header when remote address is trusted.`, async (assert) => {
	return new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let server = proxy.createServer({
			trustedRemoteAddresses: ["localhost"]
		}, (socket, header) => {
			if (header != null) {
				resolve();
			} else {
				reject();
			}
		});
		server.listen(undefined, () => {
			let address = utils.getServerAddress(server);
			let socket = libnet.connect({
				port: address.port
			});
			socket.on("error", (error) => {}); // NOTE: Prevent errors from being thrown.
			socket.once("close", (had_error) => {
				reject();
			});
			socket.once("connect", () => {
				socket.write("PROXY TCP4 0.1.2.3 4.5.6.7 8 9\r\n");
			});
		});
	});
});

wtf.test(`Server should not pass PROXY header when remote address is untrusted.`, async (assert) => {
	return new Promise<void>((resolve, reject) => {
		setTimeout(reject, 5 * 1000);
		let server = proxy.createServer({
			trustedRemoteAddresses: []
		}, (socket, header) => {
			if (header != null) {
				reject();
			} else {
				resolve();
			}
		});
		server.listen(undefined, () => {
			let address = utils.getServerAddress(server);
			let socket = libnet.connect({
				port: address.port
			});
			socket.on("error", (error) => {}); // NOTE: Prevent errors from being thrown.
			socket.once("close", (had_error) => {
				reject();
			});
			socket.once("connect", () => {
				socket.write("PROXY TCP4 0.1.2.3 4.5.6.7 8 9\r\n");
			});
		});
	});
});
