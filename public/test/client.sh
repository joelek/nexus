#!/bin/sh

clear
curl -k --limit-rate 100k "https://localhost:8443/$1" -D - --output out.mp4
