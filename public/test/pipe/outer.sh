#!/bin/sh

clear
ts-node source/cli/ --root=pipe://localhost:40002 --log=tcp
