import * as libnet from "net";
import * as wtf from "@joelek/wtf";
import * as proxy from "./proxy";

wtf.test(`Server should immediately reset connections sending bad proxy headers.`, async (assert) => {
	return new Promise<void>((resolve, reject) => {
		setTimeout(reject, 1 * 1000);
		let server = proxy.createServer({}, (socket, header) => {});
		server.listen(undefined, () => {
			let address = proxy.getServerAddress(server);
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
				socket.write("PROXY 1337");
			});
		});
	});
});
