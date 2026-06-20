#!/bin/sh

clear
ts-node source/cli/ --http=40001 --https=40002 --trust=::1 --log=tcp
