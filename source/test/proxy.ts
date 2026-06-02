import * as libnet from "net";
import * as libtls from "tls";
import * as libfs from "fs";

libnet.createServer({}, (client) => {
	console.log(`client connected to proxy`);
	client.on("close", (had_error) => {
		console.log(`client disconnected from proxy`, had_error);
	});
	let server = libnet.connect({
		host: "localhost",
		port: 40005
	}, () => {
		console.log(`proxy connected to server`);
		server.on("close", (had_error) => {
			console.log(`proxy disconnected from server`, had_error);
		});
	});
	server.pipe(client);
	client.pipe(server);
	server.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("proxy got ECONNRESET from server");
		}
	});
	client.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("proxy got ECONNRESET from client");
		}
	});
	server.on("close", () => {
		client.end();
	});
	client.on("close", () => {
		server.end();
	});
}).listen(40001);

libtls.createServer({
	key: libfs.readFileSync("./public/test/key.pem"),
	cert: libfs.readFileSync("./public/test/cert.pem")
}, (client) => {
	console.log(`client connected to proxy`);
	client.on("close", (had_error) => {
		console.log(`client disconnected from proxy`, had_error);
	});
	let server = libtls.connect({
		host: "localhost",
		port: 40006,
		rejectUnauthorized: false
	}, () => {
		console.log(`proxy connected to server`);
		server.on("close", (had_error) => {
			console.log(`proxy disconnected from server`, had_error);
		});
	});
	server.pipe(client);
	client.pipe(server);
	server.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("proxy got ECONNRESET from server");
		}
	});
	client.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("proxy got ECONNRESET from client");
		}
	});
	server.on("close", () => {
		client.end();
	});
	client.on("close", () => {
		server.end();
	});
}).listen(40002);

libnet.createServer({}, (client) => {
	console.log(`client connected to proxy`);
	client.on("close", (had_error) => {
		console.log(`client disconnected from proxy`, had_error);
	});
	let server = libtls.connect({
		host: "localhost",
		port: 40006,
		rejectUnauthorized: false
	}, () => {
		console.log(`proxy connected to server`);
		server.on("close", (had_error) => {
			console.log(`proxy disconnected from server`, had_error);
		});
	});
	server.pipe(client);
	client.pipe(server);
	server.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("proxy got ECONNRESET from server");
		}
	});
	client.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("proxy got ECONNRESET from client");
		}
	});
	server.on("close", () => {
		client.end();
	});
	client.on("close", () => {
		server.end();
	});
}).listen(40003);

libtls.createServer({
	key: libfs.readFileSync("./public/test/key.pem"),
	cert: libfs.readFileSync("./public/test/cert.pem")
}, (client) => {
	console.log(`client connected to proxy`);
	client.on("close", (had_error) => {
		console.log(`client disconnected from proxy`, had_error);
	});
	let server = libnet.connect({
		host: "localhost",
		port: 40005
	}, () => {
		console.log(`proxy connected to server`);
		server.on("close", (had_error) => {
			console.log(`proxy disconnected from server`, had_error);
		});
	});
	server.pipe(client);
	client.pipe(server);
	server.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("proxy got ECONNRESET from server");
		}});
	client.on("error", (error: any) => {
		if (error.code === "ECONNRESET") {
			console.log("proxy got ECONNRESET from client");
		}
	});
	server.on("close", () => {
		client.end();
	});
	client.on("close", () => {
		server.end();
	});
}).listen(40004);
