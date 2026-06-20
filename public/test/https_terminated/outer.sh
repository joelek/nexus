#!/bin/sh

clear
ts-node source/cli/ --sign=true --root=https://localhost:40002 --log=tcp
