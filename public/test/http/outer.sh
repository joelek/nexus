#!/bin/sh

clear
ts-node source/cli/ --root=http://localhost:40001 --debug=tcp
