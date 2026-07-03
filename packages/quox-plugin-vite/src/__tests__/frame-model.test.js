import { describe, it, expect } from 'vitest';
import { buildFrameModel } from '../dev-host/frame-model.js';

// buildFrameModel is the pure logic extracted from dev-host/client.js so it
// can be unit-tested without react/react-dom/react-router-dom installed
// (those only resolve inside a consuming plugin project's node_modules).

describe('dev-host frame-model', () => {
    describe('no plugin registered', () => {
        it('returns ok:false with reason not-registered when exports is missing', () => {
            const model = buildFrameModel({ manifest: { id: 'star-alignment', name: 'Star Alignment' } });
            expect(model.ok).toBe(false);
            expect(model.reason).toBe('not-registered');
            expect(model.pluginId).toBe('star-alignment');
            expect(model.pluginName).toBe('Star Alignment');
            expect(model.sidebar).toEqual([]);
            expect(model.routes).toEqual([]);
            expect(model.homePath).toBeNull();
        });

        it('falls back to pluginId/manifest.id for pluginName when manifest.name is absent', () => {
            const model = buildFrameModel({ manifest: {}, pluginId: 'test-basic' });
            expect(model.pluginName).toBe('test-basic');
        });

        it('handles being called with no arguments at all', () => {
            const model = buildFrameModel();
            expect(model.ok).toBe(false);
            expect(model.pluginName).toBe('Plugin');
        });
    });

    describe('plugin registered with routes + sidebar', () => {
        const StarAlignmentView = () => null;
        const SettingsPanel = () => null;

        it('builds sidebar, routes, and homePath from exports (register-time payload wins)', () => {
            const model = buildFrameModel({
                manifest: { id: 'star-alignment', name: 'Star Alignment', sidebar: [{ path: '/manifest-path', label: 'Manifest' }] },
                pluginId: 'star-alignment',
                exports: {
                    routes: {
                        '/plugins/star-alignment': StarAlignmentView,
                        '/plugins/star-alignment/settings': SettingsPanel,
                    },
                    sidebar: [{ path: '/plugins/star-alignment', label: 'Star Alignment', icon: 'compass' }],
                },
            });

            expect(model.ok).toBe(true);
            expect(model.reason).toBeNull();
            expect(model.sidebar).toEqual([{ path: '/plugins/star-alignment', label: 'Star Alignment', icon: 'compass' }]);
            expect(model.routes).toEqual([
                { path: '/plugins/star-alignment', Component: StarAlignmentView },
                { path: '/plugins/star-alignment/settings', Component: SettingsPanel },
            ]);
            expect(model.homePath).toBe('/plugins/star-alignment');
        });

        it('falls back to manifest.sidebar when exports.sidebar is absent', () => {
            const model = buildFrameModel({
                manifest: { sidebar: [{ path: '/from-manifest', label: 'From manifest' }] },
                pluginId: 'p',
                exports: { routes: { '/from-manifest': StarAlignmentView } },
            });
            expect(model.sidebar).toEqual([{ path: '/from-manifest', label: 'From manifest' }]);
            expect(model.homePath).toBe('/from-manifest');
        });

        it('derives homePath from the first route when there is no sidebar at all', () => {
            const model = buildFrameModel({
                manifest: {},
                pluginId: 'p',
                exports: { routes: { '/only-route': StarAlignmentView } },
            });
            expect(model.sidebar).toEqual([]);
            expect(model.homePath).toBe('/only-route');
        });

        it('reports reason no-routes (but ok:true) when a plugin registers with an empty routes object', () => {
            const model = buildFrameModel({ manifest: {}, pluginId: 'p', exports: { routes: {}, sidebar: [] } });
            expect(model.ok).toBe(true);
            expect(model.reason).toBe('no-routes');
            expect(model.homePath).toBeNull();
        });
    });
});
