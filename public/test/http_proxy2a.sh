#!/bin/sh

clear
ts-node source/cli/ --root=http://localhost:40002 --debug=tcp --debug=http
