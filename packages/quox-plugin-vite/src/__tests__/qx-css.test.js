import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const quoxPluginVite = require('../index.js');
const vendored = fs.readFileSync(path.resolve(__dirname, '../../assets/qx-components.css'), 'utf8');

function run(plugin, bundle) {
    const emitted = [];
    const ctx = { emitFile: (f) => { emitted.push(f); bundle[f.fileName] = { type: 'asset', fileName: f.fileName, source: f.source }; } };
    const hook = plugin.generateBundle;
    (typeof hook === 'function' ? hook : hook.handler).call(ctx, {}, bundle);
    return emitted;
}

describe('qxCss (vendored qx component css in dist/plugin.css)', () => {
    it('prepends the vendored css to the plugin own css by default', () => {
        const p = quoxPluginVite({ pluginId: 'p' });
        p.configResolved({ command: 'build' });
        const bundle = { 'plugin.css': { type: 'asset', fileName: 'plugin.css', source: '.mine{color:red}' } };
        run(p, bundle);
        const out = String(bundle['plugin.css'].source);
        expect(out.startsWith(vendored.slice(0, 200))).toBe(true);
        expect(out).toContain('.qx-pill');
        expect(out.endsWith('.mine{color:red}')).toBe(true);
        expect(out.indexOf('.qx-pill')).toBeLessThan(out.indexOf('.mine'));
    });

    it('emits plugin.css when the plugin has no css of its own', () => {
        const p = quoxPluginVite({ pluginId: 'p' });
        p.configResolved({ command: 'build' });
        const bundle = {};
        const emitted = run(p, bundle);
        expect(emitted).toHaveLength(1);
        expect(emitted[0].fileName).toBe('plugin.css');
        expect(emitted[0].source).toContain('.qx-pill');
    });

    it('qxCss:false leaves css untouched and emits nothing', () => {
        const p = quoxPluginVite({ pluginId: 'p', qxCss: false });
        p.configResolved({ command: 'build' });
        const bundle = { 'plugin.css': { type: 'asset', fileName: 'plugin.css', source: '.mine{}' } };
        expect(run(p, bundle)).toHaveLength(0);
        expect(bundle['plugin.css'].source).toBe('.mine{}');
        const empty = {};
        expect(run(p, empty)).toHaveLength(0);
    });

    it('does not touch css in serve mode', () => {
        const p = quoxPluginVite({ pluginId: 'p' });
        p.configResolved({ command: 'serve' });
        expect(run(p, {})).toHaveLength(0);
    });
});
