#!/bin/sh

clear
ts-node source/cli/ --sign=true --root=pipe://localhost:40001 --log=tcp
