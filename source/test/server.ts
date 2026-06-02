import * as libnet from "net";
import * as libtls from "tls";
import * as libfs from "fs";

libnet.createServer({}, (proxy) => {
	console.log(`proxy connected to server`);
	proxy.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("server got ECONNRESET from proxy");
		}
	});
	proxy.on("close", (had_error) => {
		console.log(`proxy disconnected from server`, had_error);
	});
	proxy.on("data", (data: Buffer) => {
		console.log(data.toString("ascii"));
	});
	proxy.write("hello from server");
}).listen(40005);

libtls.createServer({
	key: libfs.readFileSync("./public/test/key.pem"),
	cert: libfs.readFileSync("./public/test/cert.pem")
}, (proxy) => {
	console.log(`proxy connected to server`);
	proxy.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("server got ECONNRESET from proxy");
		}
	});
	proxy.on("close", (had_error) => {
		console.log(`proxy disconnected from server`, had_error);
	});
	proxy.on("data", (data: Buffer) => {
		console.log(data.toString("ascii"));
	});
	proxy.write("hello from server");
}).listen(40006);
