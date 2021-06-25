"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serve = void 0;
const libfs = require("fs");
const libhttp = require("http");
const libpath = require("path");
const liburl = require("url");
function getPathType(path) {
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
function serve(root, port) {
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
        let path = libpath.join(root, decodeURI(liburl.parse(url).pathname || ""));
        let type = getPathType(path);
        if (type === "file") {
            response.writeHead(200);
            let stream = libfs.createReadStream(path);
            stream.pipe(response);
            return;
        }
        else if (type === "directory") {
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
        }
        else {
            response.writeHead(500);
            return response.end();
        }
    }).listen(port, () => {
        process.stdout.write("Serving \"" + root + "\" at http://localhost:" + port + "/.\n");
    });
}
exports.serve = serve;
