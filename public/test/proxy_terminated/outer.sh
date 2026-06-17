#!/bin/sh

clear
ts-node source/cli/ --sign=true --root=proxy://localhost:40001 --debug=tcp
