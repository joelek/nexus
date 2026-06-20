#!/bin/sh

clear
ts-node source/cli/ --root=proxy://localhost:40002 --log=tcp
