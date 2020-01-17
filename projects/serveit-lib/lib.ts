import * as libfs from "fs";
import * as libhttp from "http";
import * as libpath from "path";

function getPathType(path: string): "file" | "directory" | "neither" {
	if (libfs.existsSync(path)) {
		let stat = libfs.statSync(path);
		if (stat.isDirectory()) {
			return "directory";
		}
		if (stat.isFile()) {
			return "file";
		}
	}
	return "neither";
}

export function serve(root: string, port: number): libhttp.Server {
	root = libpath.resolve(root);
	if (getPathType(root) !== "directory") {
		process.stderr.write("Path \"" + root + "\" is not a directory!\n");
		process.exit(1);
	}
	return libhttp.createServer((request, response) => {
		let method = request.method || "";
		let url = request.url || "";
		process.stdout.write(method + ":" + url + "\n");
		if (method !== "GET") {
			response.writeHead(405);
			return response.end();
		}
		let path = libpath.join(root, url);
		let type = getPathType(path);
		if (type === "file") {
			response.writeHead(200);
			let stream = libfs.createReadStream(path);
			stream.pipe(response);
			return;
		} else if (type === "directory") {
			response.writeHead(200);
			let links = libfs.readdirSync(path, { withFileTypes: true })
				.map((subpath) => {
					if (subpath.isFile()) {
						return subpath.name;
					}
					if (subpath.isDirectory()) {
						return subpath.name + "/";
					}
					return null;
				}).filter((subpath) => {
					return subpath !== null;
				}).map((subpath) => {
					return "<p><a href=\"" + subpath + "\">" + subpath + "</a></p>";
				});
			return response.end([
				"<html>",
				"<body>",
				...links,
				"</body>",
				"</html>"
			].join("\n"));
		} else {
			response.writeHead(500);
			return response.end();
		}
	}).listen(port, () => {
		process.stdout.write("Serving \"" + root + "\" at http://localhost:" + port + "\n");
	});
}
