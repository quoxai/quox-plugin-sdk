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
            // basic never calls a backend, so no 'network' (least privilege).
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

        it('includes tools permission (no aee: not available to community plugins yet)', () => {
            const dir = scaffold('test-fleet', 'fleet-management');
            const manifest = readManifest(dir);
            expect(manifest.permissions).not.toContain('aee');
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

        it('does not declare memory (not available to community plugins yet)', () => {
            const dir = scaffold('test-bridge', 'service-bridge');
            const manifest = readManifest(dir);
            expect(manifest.permissions).not.toContain('memory');
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
            expect(manifest.permissions).toEqual(['sidebar', 'storage', 'notifications', 'network']);
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

        it('declares neither memory nor aee (not available to community plugins yet)', () => {
            const dir = scaffold('test-enterprise', 'enterprise-extension');
            const manifest = readManifest(dir);
            expect(manifest.permissions).not.toContain('memory');
            expect(manifest.permissions).not.toContain('aee');
        });
    });

    describe('specialist-agent template', () => {
        it('generates correct file set (14 files)', () => {
            const dir = scaffold('test-agent', 'specialist-agent');
            const files = listFiles(dir);
            expect(files).toContain('manifest.json');
            expect(files).toContain('src/index.jsx');
            expect(files).toContain('src/agent/agentDef.js');
            expect(files).toContain('src/agent/agentPersona.js');
            expect(files).toContain('src/agent/tools.js');
            expect(files).toContain('src/views/MainView.jsx');
            expect(files).toContain('src/views/SettingsPanel.jsx');
            expect(files).toContain('src/components/AgentStatusCard.jsx');
            expect(files).toContain('src/components/ToolCard.jsx');
            expect(files).toContain('src/components/AgentChat.jsx');
            expect(files).toContain('src/data/mock.js');
            expect(files).toContain('vite.config.js');
            expect(files).toContain('package.json');
            expect(files).toContain('.gitignore');
        });

        it('has agentDefinition with correct fields', () => {
            const dir = scaffold('test-agent', 'specialist-agent');
            const manifest = readManifest(dir);
            expect(manifest.agentDefinition).toBeDefined();
            expect(manifest.agentDefinition.role).toBe('specialist');
            expect(manifest.agentDefinition.level).toBe(1);
            expect(manifest.agentDefinition.ownership.source).toBe('plugin');
            expect(manifest.agentDefinition.defconLevel).toBe('AMBER');
            expect(manifest.agentDefinition.autonomy).toBeDefined();
            expect(manifest.agentDefinition.autonomy.canRunAutonomously).toBe(true);
            expect(manifest.agentDefinition.suggestions).toHaveLength(5);
        });

        it('has agentPersona with correct fields', () => {
            const dir = scaffold('test-agent', 'specialist-agent');
            const manifest = readManifest(dir);
            expect(manifest.agentPersona).toBeDefined();
            expect(manifest.agentPersona.shortName).toBeDefined();
            expect(manifest.agentPersona.color).toBe('#f59e0b');
            expect(manifest.agentPersona.llm.provider).toBe('anthropic');
        });

        it('has 3 tool definitions with input_schema', () => {
            const dir = scaffold('test-agent', 'specialist-agent');
            const manifest = readManifest(dir);
            expect(manifest.toolDefinitions).toHaveLength(3);
            manifest.toolDefinitions.forEach(tool => {
                expect(tool.input_schema).toBeDefined();
                expect(tool.input_schema.type).toBe('object');
            });
        });

        it('has safety and AEE capabilities', () => {
            const dir = scaffold('test-agent', 'specialist-agent');
            const manifest = readManifest(dir);
            expect(manifest.safety).toBeDefined();
            expect(manifest.safety.aeeRequired).toBe(true);
            expect(manifest.capabilities).toBeDefined();
            expect(manifest.capabilities.aeeIntents.length).toBeGreaterThan(0);
        });

        it('has specialist backward compat field', () => {
            const dir = scaffold('test-agent', 'specialist-agent');
            const manifest = readManifest(dir);
            expect(manifest.specialist).toBeDefined();
            expect(manifest.specialist.name).toContain('Agent');
            expect(manifest.specialist.capabilities.length).toBeGreaterThan(0);
        });

        it('includes tools but neither aee nor memory (not available yet) permissions', () => {
            const dir = scaffold('test-agent', 'specialist-agent');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toContain('tools');
            expect(manifest.permissions).not.toContain('aee');
            expect(manifest.permissions).not.toContain('memory');
        });

        it('has tool names with plugin_ prefix', () => {
            const dir = scaffold('test-agent', 'specialist-agent');
            const manifest = readManifest(dir);
            manifest.toolDefinitions.forEach(tool => {
                expect(tool.name).toMatch(/^plugin_test-agent_/);
            });
        });
    });

    describe('agentic-team template', () => {
        it('generates correct file set (17 files)', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const files = listFiles(dir);
            expect(files).toContain('manifest.json');
            expect(files).toContain('src/team/teamDef.js');
            expect(files).toContain('src/team/agents.js');
            expect(files).toContain('src/team/personas.js');
            expect(files).toContain('src/team/tools.js');
            expect(files).toContain('src/team/policies.js');
            expect(files).toContain('src/views/MainView.jsx');
            expect(files).toContain('src/views/SettingsPanel.jsx');
            expect(files).toContain('src/components/MemberCard.jsx');
            expect(files).toContain('src/components/TaskQueue.jsx');
            expect(files).toContain('src/components/SharedContextPanel.jsx');
            expect(files).toContain('src/components/PolicyBadges.jsx');
            expect(files).toContain('src/data/mock.js');
            expect(files).toContain('vite.config.js');
            expect(files).toContain('package.json');
            expect(files).toContain('.gitignore');
            expect(files).toContain('src/index.jsx');
        });

        it('has team with orchestrator and 3 members', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            expect(manifest.team).toBeDefined();
            expect(manifest.team.type).toBe('team');
            expect(manifest.team.orchestrator).toBeDefined();
            expect(manifest.team.orchestrator.role).toBe('orchestrator');
            expect(manifest.team.members).toHaveLength(4);
        });

        it('has 4 agent definitions (1 orchestrator + 3 non-orchestrator)', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            expect(manifest.agents).toHaveLength(4);
            const orchestrators = manifest.agents.filter(a => a.role === 'orchestrator');
            const nonOrchestrators = manifest.agents.filter(a => a.role !== 'orchestrator');
            expect(orchestrators).toHaveLength(1);
            expect(nonOrchestrators).toHaveLength(3);
        });

        it('has 4 personas with distinct colours', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            expect(manifest.agentPersonas).toHaveLength(4);
            const colors = manifest.agentPersonas.map(p => p.color);
            const uniqueColors = new Set(colors);
            expect(uniqueColors.size).toBe(4);
        });

        it('has policies with required fields', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            const p = manifest.team.policies;
            expect(p.maxBudgetTokens).toBeGreaterThan(0);
            expect(p.maxBudgetToolCalls).toBeGreaterThan(0);
            expect(p.maxDurationMs).toBeGreaterThan(0);
            expect(p.maxTaskDurationMs).toBeGreaterThan(0);
            expect(p.heartbeatIntervalMs).toBeGreaterThan(0);
            expect(p.maxParallelTasks).toBeGreaterThan(0);
            expect(typeof p.requireApprovalBeforeStart).toBe('boolean');
            expect(typeof p.checkpointAfterEachTask).toBe('boolean');
            expect(typeof p.voltRequired).toBe('boolean');
            expect(Array.isArray(p.allowedChannels)).toBe(true);
        });

        it('has 8+ tool definitions', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            expect(manifest.toolDefinitions.length).toBeGreaterThanOrEqual(8);
            manifest.toolDefinitions.forEach(tool => {
                expect(tool.input_schema).toBeDefined();
                expect(tool.input_schema.type).toBe('object');
            });
        });

        it('has member IDs that match agent IDs', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            const memberIds = manifest.team.members.map(m => m.agentId).sort();
            const agentIds = manifest.agents.map(a => a.id).sort();
            expect(memberIds).toEqual(agentIds);
        });

        it('has shared context', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            expect(manifest.team.sharedContext).toBeDefined();
            expect(typeof manifest.team.sharedContext).toBe('string');
            expect(manifest.team.sharedContext.length).toBeGreaterThan(0);
        });

        it('includes tools only (no aee or memory: never used) permissions', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            expect(manifest.permissions).toContain('tools');
            expect(manifest.permissions).not.toContain('aee');
            expect(manifest.permissions).not.toContain('memory');
        });

        it('all agents have valid DEFCON levels', () => {
            const dir = scaffold('test-team', 'agentic-team');
            const manifest = readManifest(dir);
            const validDefcons = ['GREEN', 'AMBER', 'ORANGE', 'RED'];
            manifest.agents.forEach(agent => {
                expect(validDefcons).toContain(agent.defconLevel);
            });
        });
    });
});
