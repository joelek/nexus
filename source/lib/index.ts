import * as autoguard from "@joelek/ts-autoguard";
import * as libhttp from "http";
import * as libserver from "./api/server";

export function encodeXMLText(string: string): string {
	return string.replace(/[&<>'"]/g, (match) => {
		return {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"'": "&#39;",
			"\"": "&quot;"
		}[match] ?? match;
	});
};

export function makeStylesheet(): string {
	return `
		* {
			border: none;
			margin: 0px;
			outline: none;
			padding: 0px;
		}

		body {
			background-color: rgb(31, 31, 31);
			padding: 1rem;
		}

		a {
			color: rgb(191, 191, 191);
			border-radius: 4px;
			display: block;
			font-family: sans-serif;
			font-size: 1rem;
			line-height: 1.0;
			overflow: hidden;
			padding: 1rem;
			text-decoration: none;
			text-overflow: ellipsis;
			transition: color 0.125s;
			white-space: nowrap;
		}

		a:nth-child(2n+1) {
			background-color: rgb(47, 47, 47);
		}

		a:hover {
			color: rgb(255, 255, 255);
		}
	`.replace(/\s+/g, " ");
};

export function renderDirectoryListing(directoryListing: autoguard.api.DirectoryListing): string {
	let { components, directories, files } = { ...directoryListing };
	return [
		`<!DOCTYPE html>`,
		`<html>`,
		`<base href="/${components.join("/")}"/>`,
		`<meta charset="utf-8"/>`,
		`<meta content="width=device-width,initial-scale=1.0" name="viewport"/>`,
		`<style>${makeStylesheet()}</style>`,
		`<title>${components.join("/")}</title>`,
		`<head>`,
		`</head>`,
		`<body>`,
		...directories.map((entry) => {
			return `<a href="${encodeURIComponent(entry.name)}/">${encodeXMLText(entry.name)}/</a>`;
		}),
		...files.map((entry) => {
			return `<a href="${encodeURIComponent(entry.name)}">${encodeXMLText(entry.name)}</a>`;
		}),
		`</body>`,
		`</html>`,
	].join("");
};

export function serve(pathPrefix: string, port: number): libhttp.Server {
	let api = libserver.makeServer({
		getStaticContent: async (request) => {
			let options = request.options();
			let pathSuffix = (options.filename ?? []).join("/");
			try {
				return autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
			} catch (error) {
				if (error === 404) {
					let directoryListing = autoguard.api.makeDirectoryListing(pathPrefix, pathSuffix, request);
					return {
						status: 200,
						headers: {
							"Content-Type": "text/html; charset=utf-8"
						},
						payload: autoguard.api.serializeStringPayload(renderDirectoryListing(directoryListing))
					}
				}
				throw error;
			}
		}
	});
	let server = libhttp.createServer({}, api);
	server.listen(port, () => {
		process.stdout.write(`Serving "${pathPrefix}" at http://localhost:${port}/"\n`);
	});
	return server;
};
