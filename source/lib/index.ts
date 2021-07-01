import * as autoguard from "@joelek/ts-autoguard";
import * as libhttp from "http";
import * as libpath from "path";
import * as libserver from "./api/server";

export function computeSimpleHash(string: string): number {
	let hash = string.length;
	for (let char of string) {
		let codePoint = char.codePointAt(0) ?? 0;
		hash *= 31;
		hash += codePoint;
	}
	return hash;
};

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
			align-items: center;
			color: rgb(191, 191, 191);
			border-radius: 4px;
			display: grid;
			gap: 1rem;
			grid-template-columns: auto 1fr auto;
			margin: 0px auto;
			max-width: 1280px;
			padding: 1rem;
			text-decoration: none;
			transition: color 0.125s;
		}

		a:nth-child(2n+1) {
			background-color: rgb(47, 47, 47);
		}

		a:hover {
			color: rgb(255, 255, 255);
		}

		p {
			font-family: sans-serif;
			font-size: 1rem;
			line-height: 1.25;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		p:nth-child(1) {
			background-color: rgb(255, 255, 255);
			border-radius: 1rem;
			padding-bottom: 1rem;
			width: 1rem;
		}
	`.replace(/\s+/g, " ");
};

export function formatSize(size: number): string {
	let units = ["B", "KiB", "MiB", "GiB", "TiB"];
	for (let i = units.length - 1; i >= 0; i--) {
		let factor = 1024 ** i;
		if (size > factor * 10) {
			return `${Math.round(size / factor)} ${units[i]}`;
		}
	}
	return `${size} B`;
};

export function renderDirectoryListing(directoryListing: autoguard.api.DirectoryListing): string {
	let { components, directories, files } = { ...directoryListing };
	return [
		`<!DOCTYPE html>`,
		`<html>`,
		`<base href="/${components.map((component) => encodeURIComponent(component)).join("/")}"/>`,
		`<meta charset="utf-8"/>`,
		`<meta content="width=device-width,initial-scale=1.0" name="viewport"/>`,
		`<style>${makeStylesheet()}</style>`,
		`<title>${components.join("/")}</title>`,
		`<head>`,
		`</head>`,
		`<body>`,
		...directories.map((entry) => {
			return `<a href="${encodeURIComponent(entry.name)}/"><p></p><p>${encodeXMLText(entry.name)}/</p><p></p></a>`;
		}),
		...files.map((entry) => {
			let hue = computeSimpleHash(libpath.extname(entry.name)) % 360;
			return `<a href="${encodeURIComponent(entry.name)}"><p style="background-color: hsl(${hue}, 50%, 50%);"></p><p>${encodeXMLText(entry.name)}</p><p>${formatSize(entry.size)}</p></a>`;
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
		},
		headStaticContent: async (request) => {
			let options = request.options();
			let pathSuffix = (options.filename ?? []).join("/");
			let response = autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
			return {
				status: response.status,
				headers: response.headers
			};
		}
	});
	let server = libhttp.createServer({}, api);
	server.listen(port, () => {
		process.stdout.write(`Serving "${pathPrefix}" at http://localhost:${port}/"\n`);
	});
	return server;
};
