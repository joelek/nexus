#!/bin/sh

clear
ts-node source/cli/ --key=./public/test/key.pem --cert=./public/test/cert.pem --root=http://localhost:40001 --debug=tcp --debug=http
