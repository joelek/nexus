import * as autoguard from "@joelek/ts-autoguard/dist/lib-server";
import * as libhttp from "http";
import * as libpath from "path";
import * as libserver from "./api/server";

export type Options = {
	pathPrefix: string;
	port: number;
	generateIndices?: boolean;
	clientRouting?: boolean;
};

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
			padding: 16px;
		}

		a {
			align-items: center;
			color: rgb(191, 191, 191);
			border-radius: 4px;
			display: grid;
			gap: 16px;
			grid-template-columns: auto 1fr auto;
			margin: 0px auto;
			max-width: 1080px;
			padding: 16px;
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
			font-size: 16px;
			line-height: 1.25;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		p:nth-child(1) {
			background-color: rgb(255, 255, 255);
			border-radius: 16px;
			padding-bottom: 16px;
			width: 16px;
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
			let hue = (computeSimpleHash(libpath.extname(entry.name)) % 12) * 30;
			return `<a href="${encodeURIComponent(entry.name)}"><p style="background-color: hsl(${hue}, 50%, 50%);"></p><p>${encodeXMLText(entry.name)}</p><p>${formatSize(entry.size)}</p></a>`;
		}),
		`</body>`,
		`</html>`,
	].join("");
};

export function makeDirectoryListingResponse(pathPrefix: string, pathSuffix: string, request: autoguard.api.ClientRequest<autoguard.api.EndpointRequest>): autoguard.api.EndpointResponse & {
	payload: autoguard.api.Binary;
} {
	let directoryListing = autoguard.api.makeDirectoryListing(pathPrefix, pathSuffix, request);
	return {
		status: 200,
		headers: {
			"Content-Type": "text/html; charset=utf-8"
		},
		payload: autoguard.api.serializeStringPayload(renderDirectoryListing(directoryListing))
	};
};

export function makeRequestListener(options: Options): libhttp.RequestListener {
	let pathPrefix = options.pathPrefix;
	let clientRouting = options.clientRouting ?? false;
	let generateIndices = options.generateIndices ?? true;
	return libserver.makeServer({
		async getStaticContent(request) {
			let options = request.options();
			let pathSuffix = (options.filename ?? []).join("/");
			try {
				return autoguard.api.makeReadStreamResponse(pathPrefix, pathSuffix, request);
			} catch (error) {
				if (error !== 404) {
					throw error;
				}
			}
			if (clientRouting) {
				try {
					return autoguard.api.makeReadStreamResponse(pathPrefix, "index.html", request);
				} catch (error) {
					if (error !== 404) {
						throw error;
					}
				}
			}
			if (generateIndices) {
				try {
					return makeDirectoryListingResponse(pathPrefix, pathSuffix, request);
				} catch (error) {
					if (error !== 404) {
						throw error;
					}
				}
			}
			throw 404;
		},
		async headStaticContent(request) {
			let response = await this.getStaticContent(request);
			return {
				...response,
				payload: []
			};
		}
	});
};

export function makeServer(options: Options): libhttp.Server {
	let pathPrefix = options.pathPrefix;
	let port = options.port;
	let server = libhttp.createServer({}, makeRequestListener(options));
	server.listen(port, () => {
		process.stdout.write(`Serving "${pathPrefix}" at http://localhost:${port}/"\n`);
	});
	return server;
};

// TODO: Remove compatibility shim in v2.
export function serve(pathPrefix: string, port: number): libhttp.Server {
	return makeServer({
		pathPrefix,
		port
	});
};
