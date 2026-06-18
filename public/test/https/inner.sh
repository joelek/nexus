#!/bin/sh

clear
ts-node source/cli/ --sign=true --http=40001 --https=40002 --trust=::1 --debug=tcp
