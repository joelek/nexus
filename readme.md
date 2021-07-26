# @joelek/ts-serveit

Static web server written completely in TypeScript.

![](./public/images/mobile.png)

## Features

### Instant server

Serveit serves the contents of any directory by launching a web server that accepts GET and HEAD requests.

Use the command line utility to launch serveit.

```
serveit
```

Serveit serves the contents of the current working direcory over port 8000 by default. You may specify a different root or port using the `--root=<string>` and `--http=<number>` arguments, respectively.

### Index documents

Serveit automatically generates and serves index documents for directory requests. The feature is turned _on_ by default and can be configued using the `--indices=<boolean>` argument.

### Client-side routing

Serveit includes support for applications utilizing client-side routing. The feature is turned _off_ by default and can be configured using the `--routing=<boolean>` argument.

Client-side routing is implemented as a redirect to the index document for all requests that would normally result in a 404 response. This allows an application to properly handle deep-linking using the history API but will alter to which resource relative URIs resolve. Placing a `<base href="/"/>` within the index document makes all relative URIs resolve with respect to the root directory which is the behaviour of the server with the feature turned off.

### Transport layer security

Serveit includes support for transport layer security for which a private key and certificate is required. These can be generated using tools like OpenSSL and signed using an ACME-enabled certificate authority like Let's Encrypt.

The paths for the private key and certificate files may be specified using the `--key=<string>` and `--cert=<string>` arguments, respectively. When specified, serveit will serve the contents over HTTPS using port 8443 as a default. You may specify a different port using the `--https=<number>` argument. An HTTP to HTTPS redirect will be served over regular HTTP.

### Host filtering

Serveit includes support for host filtering which prevents the server from being accessed without knowing information about its host. The use of host filtering can block some malicious access attempts but should not be relied on solely for server hardening.

Host filtering may be specified using the `--host=<string>` argument where single asterisk labels are treated as wildcards.

It is important to understand that serveit will stop accepting requests to `localhost` when host filtering is used. Local DNS needs be modified to direct the desired host to the local machine in order to access a locally running server.

## Sponsorship

The continued development of this software depends on your sponsorship. Please consider sponsoring this project if you find that the software creates value for you and your organization.

The sponsor button can be used to view the different sponsoring options. Contributions of all sizes are welcome.

Thank you for your support!

## Installation

Releases follow semantic versioning and release packages are published using the GitHub platform. Use the following command to install the latest release.

```
npm install -g joelek/ts-serveit#semver:^1
```

Use the following command to install the very latest build. The very latest build may include breaking changes and should not be used in production environments.

```
npm install -g joelek/ts-serveit#master
```

## Roadmap

* Add support for custom CSS-files.
