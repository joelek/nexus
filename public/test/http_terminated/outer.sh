#!/bin/sh

clear
ts-node source/cli/ --sign=true --root=http://localhost:40001 --debug=tcp
