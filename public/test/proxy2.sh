#!/bin/sh

ts-node source/cli/ --http=40001 --https=40002 --trust=::1
