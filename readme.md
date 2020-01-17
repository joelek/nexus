# @joelek/ts-serveit

Bare-minimum static web server.

## Features

Serveit serves the contents of any directory over HTTP by launching a very simple server. Serveit only accepts GET requests and automatically generates and serves index documents for directory requests.

Use the command line utility to launch serveit.

```
serveit
```

Serveit serves the contents of the current working direcory over port 8000 by default. You may specify a different root or port using the `--root=<root>` and `--port=<port>` arguments respectively.

## Configure

Globally install this package from GitHub.

```
npm install -g joelek/ts-serveit
```

This installs the command line utility "serveit".
