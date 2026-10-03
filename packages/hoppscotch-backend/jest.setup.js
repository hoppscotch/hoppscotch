require('@relmify/jest-fp-ts');

// graphql 17 is loaded as ESM under Jest's require(esm) support. Load it before any
// test module so CJS dependants (e.g. graphql-tag) don't require it mid-link, which
// Jest reports as "Cannot require() ES Module ... in a cycle".
require('graphql');
