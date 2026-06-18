#!/bin/sh

clear
curl -k --limit-rate 100k "http://localhost:8080/$1" -D - --output ./private/out.bin
