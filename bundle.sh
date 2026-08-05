#!/bin/sh

TS=$(date +'%y%m%d_%H_%M_%S')

git archive --format=zip --output=$PWD/bundle_$TS.zip main

