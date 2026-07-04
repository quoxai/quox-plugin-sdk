/**
 * rewriteExternalImportsToGlobals — regression tests for the ESM externals
 * gap: rollup ignores output.globals for format:'es', so bare external
 * imports must be rewritten to host-global reads or the dashboard's blob-URL
 * module loader fails with "Failed to resolve module specifier".
 */
import { describe, it, expect } from 'vitest';
import quoxPluginVite from '../index.js';

const { rewriteExternalImportsToGlobals: rewrite } = quoxPluginVite.__testables;

describe('rewriteExternalImportsToGlobals', () => {
    it('rewrites a default import (minified, no space before quote)', () => {
        const out = rewrite('import Ce from"react";const x=Ce.useState;');
        expect(out).not.toContain('from"react"');
        expect(out).toContain('const Ce = window.__quoxSharedDeps.React;');
    });

    it('rewrites a default import (pretty)', () => {
        const out = rewrite("import React from 'react';\n");
        expect(out).toContain('const React = window.__quoxSharedDeps.React;');
        expect(out).not.toContain("from 'react'");
    });

    it('rewrites named imports with as-renames', () => {
        const out = rewrite('import{useState as s,useEffect}from"react";');
        expect(out).toContain('const { useState: s, useEffect } = window.__quoxSharedDeps.React;');
    });

    it('rewrites combined default + named imports', () => {
        const out = rewrite('import Ce,{jsx as h}from"react";');
        expect(out).toContain('const Ce = window.__quoxSharedDeps.React;');
        expect(out).toContain('const { jsx: h } = window.__quoxSharedDeps.React;');
    });

    it('rewrites namespace imports', () => {
        const out = rewrite('import * as RRD from "react-router-dom";');
        expect(out).toContain('const RRD = window.__quoxSharedDeps.ReactRouterDOM;');
    });

    it('drops bare side-effect imports of externals', () => {
        const out = rewrite('import"react";rest();');
        expect(out).not.toContain('import"react"');
        expect(out).toContain('rest();');
    });

    it('maps react-dom/client to ReactDOM and @quox/glass to __quoxGlass', () => {
        const out = rewrite('import{createRoot}from"react-dom/client";import{GlassPanel}from"@quox/glass";');
        expect(out).toContain('const { createRoot } = window.__quoxSharedDeps.ReactDOM;');
        expect(out).toContain('const { GlassPanel } = window.__quoxGlass;');
    });

    it('leaves non-external imports untouched', () => {
        const src = 'import x from"./local.js";import y from"other-lib";';
        expect(rewrite(src)).toBe(src);
    });

    it('leaves the rest of the chunk intact', () => {
        const out = rewrite('import Ce from"react";function f(){return Ce.version}');
        expect(out).toContain('function f(){return Ce.version}');
    });
});
