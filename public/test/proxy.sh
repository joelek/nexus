#!/bin/sh

clear
curl -k --limit-rate 10k "https://localhost:8443/test.mp4" --output out.mp4
