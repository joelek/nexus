#!/bin/sh

ts-node source/cli/ --key=./public/test/key.pem --cert=./public/test/cert.pem --root=proxy://localhost:40001
