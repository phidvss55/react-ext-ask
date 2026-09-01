.PHONY: help install test build clean check

help:
	@printf '%s\n' \
		'Available targets:' \
		'  make install  Install project dependencies' \
		'  make test     Run configured tests (skips when none exist)' \
		'  make build    Type-check and build the extension to dist/' \
		'  make check    Run tests and build' \
		'  make clean    Remove build output'

install:
	npm install

test:
	npm run test --if-present

build:
	npm run build

check: test build

clean:
	rm -rf dist
	sh clean.sh
