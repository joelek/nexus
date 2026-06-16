#!/bin/sh

clear
ts-node source/cli/ --key=./public/test/key.pem --cert=./public/test/cert.pem --http=40001 --https=40002 --trust=::1 --debug=tcp --debug=http
