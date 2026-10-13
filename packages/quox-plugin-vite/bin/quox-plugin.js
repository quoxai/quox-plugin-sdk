#!/usr/bin/env node
process.exitCode = require('../src/cli/main.js').run(process.argv.slice(2));
