import { describe, it, expect } from 'vitest';

// The vite plugin uses CJS, so we need to handle that
const quoxPluginVite = require('../index.js');

describe('@quoxai/quox-plugin-vite', () => {
    it('exports a function', () => {
        expect(typeof quoxPluginVite).toBe('function');
    });

    it('returns a plugin object with correct name', () => {
        const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
        expect(plugin.name).toBe('quox-plugin');
    });

    it('sets enforce to pre', () => {
        const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
        expect(plugin.enforce).toBe('pre');
    });

    describe('config', () => {
        it('sets rollup entry to src/index.jsx', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            const config = plugin.config({});
            expect(config.build.rollupOptions.input).toBe('src/index.jsx');
        });

        it('sets ES module output format with code-splitting enabled', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            const config = plugin.config({});
            expect(config.build.rollupOptions.output.format).toBe('es');
            expect(config.build.rollupOptions.output.inlineDynamicImports).toBe(false);
        });

        it('externalises React dependencies', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            const config = plugin.config({});
            expect(config.build.rollupOptions.external).toContain('react');
            expect(config.build.rollupOptions.external).toContain('react-dom');
            expect(config.build.rollupOptions.external).toContain('react-dom/client');
            expect(config.build.rollupOptions.external).toContain('react-router-dom');
        });

        it('maps globals to window.__quoxSharedDeps', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            const config = plugin.config({});
            const globals = config.build.rollupOptions.output.globals;
            expect(globals.react).toBe('window.__quoxSharedDeps.React');
            expect(globals['react-dom']).toBe('window.__quoxSharedDeps.ReactDOM');
            expect(globals['react-router-dom']).toBe('window.__quoxSharedDeps.ReactRouterDOM');
        });

        it('outputs plugin.esm.js as the entry filename and chunks lazily-loaded code under assets/', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            const config = plugin.config({});
            expect(config.build.rollupOptions.output.entryFileNames).toBe('plugin.esm.js');
            expect(config.build.rollupOptions.output.chunkFileNames).toBe('assets/[name]-[hash].js');
        });
    });

    describe('resolveId', () => {
        it('marks react as external', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            const result = plugin.resolveId('react');
            expect(result).toEqual({ id: 'react', external: true });
        });

        it('marks react-dom as external', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            const result = plugin.resolveId('react-dom');
            expect(result).toEqual({ id: 'react-dom', external: true });
        });

        it('marks react-router-dom as external', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            const result = plugin.resolveId('react-router-dom');
            expect(result).toEqual({ id: 'react-router-dom', external: true });
        });

        it('returns null for other modules', () => {
            const plugin = quoxPluginVite({ pluginId: 'test-plugin' });
            expect(plugin.resolveId('lodash')).toBeNull();
            expect(plugin.resolveId('./myModule')).toBeNull();
        });
    });
});
