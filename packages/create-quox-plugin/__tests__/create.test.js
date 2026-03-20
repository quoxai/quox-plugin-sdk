import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CREATE_SCRIPT = path.resolve(__dirname, '../bin/create.js');

describe('create-quox-plugin scaffolder', () => {
    let tmpDir;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quox-plugin-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function scaffold(name, template) {
        const pluginDir = path.join(tmpDir, name);
        // Provide answers for: display name (default), category (default), author, description
        const input = '\n\n\n\n';
        execSync(
            `printf '${input}' | node ${CREATE_SCRIPT} ${name} --template ${template}`,
            { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] }
        );
        return pluginDir;
    }

    function readManifest(pluginDir) {
        return JSON.parse(fs.readFileSync(path.join(pluginDir, 'manifest.json'), 'utf8'));
    }

    function listFiles(dir, prefix = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        let files = [];
        for (const entry of entries) {
            const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                files = files.concat(listFiles(path.join(dir, entry.name), rel));
            } else {
                files.push(rel);
            }
        }
        return files.sort();
    }

    describe('basic template', () => {
        it('generates correct file set', () => {
            const dir = scaffold('test-basic', 'basic');
            const files = listFiles(dir);
            expect(files).toContain('manifest.json');
            expect(files).toContain('src/index.jsx');
            expect(files).toContain('src/views/MainView.jsx');
            expect(files).toContain('vite.config.js');
            expect(files).toContain('package.json');
            expect(files).toContain('.gitignore');
        });

        it('has correct permissions', () => {
            const dir = scaffold('test-basic', 'basic');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toEqual(['sidebar', 'storage', 'notifications']);
        });

        it('has correct plugin ID', () => {
            const dir = scaffold('test-basic', 'basic');
            const manifest = readManifest(dir);
            expect(manifest.id).toBe('test-basic');
        });
    });

    describe('monitoring-dashboard template', () => {
        it('generates correct file set', () => {
            const dir = scaffold('test-monitor', 'monitoring-dashboard');
            const files = listFiles(dir);
            expect(files).toContain('manifest.json');
            expect(files).toContain('src/index.jsx');
            expect(files).toContain('src/views/MainView.jsx');
            expect(files).toContain('src/views/SettingsPanel.jsx');
            expect(files).toContain('src/hooks/usePolling.js');
            expect(files).toContain('src/data/mock.js');
        });

        it('has configSchema with serviceUrl and apiKey', () => {
            const dir = scaffold('test-monitor', 'monitoring-dashboard');
            const manifest = readManifest(dir);
            expect(manifest.configSchema).toBeDefined();
            expect(manifest.configSchema.serviceUrl).toBeDefined();
            expect(manifest.configSchema.apiKey).toBeDefined();
            expect(manifest.configSchema.apiKey.type).toBe('password');
        });

        it('has NOC integration', () => {
            const dir = scaffold('test-monitor', 'monitoring-dashboard');
            const manifest = readManifest(dir);
            expect(manifest.nocIntegration).toBeDefined();
            expect(manifest.nocIntegration.quickActions).toHaveLength(2);
        });

        it('includes network permission', () => {
            const dir = scaffold('test-monitor', 'monitoring-dashboard');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toContain('network');
        });
    });

    describe('fleet-management template', () => {
        it('generates correct file set', () => {
            const dir = scaffold('test-fleet', 'fleet-management');
            const files = listFiles(dir);
            expect(files).toContain('src/components/ConfirmModal.jsx');
            expect(files).toContain('src/data/mock.js');
        });

        it('has safety block', () => {
            const dir = scaffold('test-fleet', 'fleet-management');
            const manifest = readManifest(dir);
            expect(manifest.safety).toBeDefined();
            expect(manifest.safety.destructiveActions).toContain('restart-host');
            expect(manifest.safety.aeeRequired).toBe(true);
            expect(manifest.safety.killSwitchEnabled).toBe(true);
        });

        it('has AEE capabilities', () => {
            const dir = scaffold('test-fleet', 'fleet-management');
            const manifest = readManifest(dir);
            expect(manifest.capabilities).toBeDefined();
            expect(manifest.capabilities.aeeIntents.length).toBeGreaterThan(0);
        });

        it('includes aee and tools permissions', () => {
            const dir = scaffold('test-fleet', 'fleet-management');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toContain('aee');
            expect(manifest.permissions).toContain('tools');
        });
    });

    describe('service-bridge template', () => {
        it('generates correct file set', () => {
            const dir = scaffold('test-bridge', 'service-bridge');
            const files = listFiles(dir);
            expect(files).toContain('src/components/AgentSidebar.jsx');
            expect(files).toContain('src/data/mock.js');
        });

        it('has specialist agent', () => {
            const dir = scaffold('test-bridge', 'service-bridge');
            const manifest = readManifest(dir);
            expect(manifest.specialist).toBeDefined();
            expect(manifest.specialist.name).toContain('Agent');
            expect(manifest.specialist.capabilities.length).toBeGreaterThan(0);
        });

        it('has comparison tiers', () => {
            const dir = scaffold('test-bridge', 'service-bridge');
            const manifest = readManifest(dir);
            expect(manifest.comparison).toBeDefined();
            expect(manifest.comparison.free).toBeDefined();
            expect(manifest.comparison.paid).toBeDefined();
        });

        it('has marketing metadata', () => {
            const dir = scaffold('test-bridge', 'service-bridge');
            const manifest = readManifest(dir);
            expect(manifest.heroGradient).toBeDefined();
            expect(manifest.badge).toBeDefined();
            expect(manifest.testimonials).toHaveLength(1);
            expect(manifest.marketingPoints.length).toBeGreaterThan(0);
        });

        it('includes memory permission', () => {
            const dir = scaffold('test-bridge', 'service-bridge');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toContain('memory');
        });
    });

    describe('ui-feature template', () => {
        it('generates correct file set', () => {
            const dir = scaffold('test-ui', 'ui-feature');
            const files = listFiles(dir);
            expect(files).toContain('src/components/EmptyState.jsx');
            expect(files).toContain('src/data/mock.js');
            expect(files).toContain('src/views/SettingsPanel.jsx');
        });

        it('has configSchema with preferences', () => {
            const dir = scaffold('test-ui', 'ui-feature');
            const manifest = readManifest(dir);
            expect(manifest.configSchema).toBeDefined();
            expect(manifest.configSchema.sortOrder).toBeDefined();
            expect(manifest.configSchema.showCompleted).toBeDefined();
        });

        it('has comparison tiers', () => {
            const dir = scaffold('test-ui', 'ui-feature');
            const manifest = readManifest(dir);
            expect(manifest.comparison).toBeDefined();
            expect(manifest.comparison.free).toBeDefined();
            expect(manifest.comparison.paid).toBeDefined();
        });

        it('has minimal permissions', () => {
            const dir = scaffold('test-ui', 'ui-feature');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toEqual(['sidebar', 'storage', 'notifications']);
        });
    });

    describe('enterprise-extension template', () => {
        it('generates correct file set', () => {
            const dir = scaffold('test-enterprise', 'enterprise-extension');
            const files = listFiles(dir);
            expect(files).toContain('src/components/UsageMeter.jsx');
            expect(files).toContain('src/components/UpgradeGate.jsx');
            expect(files).toContain('backend/server.js');
            expect(files).toContain('backend/package.json');
            expect(files).toContain('Dockerfile');
        });

        it('has multi-tier limits', () => {
            const dir = scaffold('test-enterprise', 'enterprise-extension');
            const manifest = readManifest(dir);
            expect(manifest.limits).toBeDefined();
            expect(manifest.limits.free).toBeDefined();
            expect(manifest.limits.pro).toBeDefined();
            expect(manifest.limits.enterprise).toBeDefined();
        });

        it('has 3-tier comparison', () => {
            const dir = scaffold('test-enterprise', 'enterprise-extension');
            const manifest = readManifest(dir);
            expect(manifest.comparison).toBeDefined();
            expect(Object.keys(manifest.comparison)).toEqual(['free', 'pro', 'enterprise']);
        });

        it('has backend block', () => {
            const dir = scaffold('test-enterprise', 'enterprise-extension');
            const manifest = readManifest(dir);
            expect(manifest.backend).toBeDefined();
            expect(manifest.backend.healthPath).toBe('/health');
            expect(manifest.backend.port).toBe(8080);
        });

        it('has premium-flagged config fields', () => {
            const dir = scaffold('test-enterprise', 'enterprise-extension');
            const manifest = readManifest(dir);
            expect(manifest.configSchema.maxRetention.premium).toBe(true);
            expect(manifest.configSchema.advancedAnalytics.enterprise).toBe(true);
        });

        it('includes memory and aee permissions', () => {
            const dir = scaffold('test-enterprise', 'enterprise-extension');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toContain('memory');
            expect(manifest.permissions).toContain('aee');
        });
    });
});
