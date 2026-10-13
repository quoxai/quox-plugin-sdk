/**
 * quox-plugin-sdk: TypeScript types for Quox community plugins.
 *
 * Community plugins run in a sandboxed iframe. Their host surface is exactly
 * `window.quox` (QuoxPluginApi), the shared React deps and
 * `window.__quoxPluginRegister`. The agent/team/marketing manifest types below
 * are part of the manifest schema but are IGNORED by the community sandbox.
 */

// --- Config & Safety Types ---

export interface ConfigSchemaField {
    type: 'string' | 'number' | 'boolean' | 'password' | 'select' | 'url';
    label: string;
    description?: string;
    default?: any;
    options?: string[];
    premium?: boolean;
    enterprise?: boolean;
}

export interface SafetyConfig {
    destructiveActions: string[];
    requiresApproval: string[];
    aeeRequired: boolean;
    killSwitchEnabled: boolean;
}

// --- NOC Integration Types ---

export interface NocQuickAction {
    id: string;
    label: string;
    icon: string;
    description: string;
    severity: 'info' | 'warning' | 'critical';
    prompt: string;
}

export interface NocIntegration {
    tab: {
        label: string;
        icon: string;
    };
    quickActions: NocQuickAction[];
}

// --- Agent Types ---

export interface SpecialistAgent {
    name: string;
    description: string;
    capabilities: string[];
}

export interface AgentPersonality {
    tone: string;
    verbosity: 'low' | 'medium' | 'high';
    formality: 'casual' | 'professional' | 'formal';
    traits: string[];
}

export interface AgentBudget {
    maxTokensPerRun: number;
    maxToolCallsPerRun: number;
    maxDurationMs: number;
    maxDailyRuns: number;
}

export interface AgentEscalation {
    onHighRisk: 'ESCALATE' | 'DEFER' | 'ABORT';
    onBudgetWarning: 'ESCALATE' | 'DEFER' | 'ABORT';
    onFailure: 'ESCALATE' | 'DEFER' | 'ABORT';
    maxRetries: number;
}

export interface AgentAutonomy {
    canRunAutonomously: boolean;
    defaultSchedule?: string;
    budget: AgentBudget;
    escalation: AgentEscalation;
    allowedTriggers?: string[];
}

export interface AgentDefinition {
    id: string;
    name: string;
    role: 'orchestrator' | 'specialist' | 'analyst';
    /** Accent colour (CSS hex) of the host-rendered agent sidebar. Default is a violet. */
    color?: string;
    level: number;
    domain: string;
    description: string;
    ownership: { source: 'plugin'; plugin: string };
    systemPrompt: string;
    personality: AgentPersonality;
    capabilities: string[];
    tools: string[];
    defconLevel: 'GREEN' | 'AMBER' | 'ORANGE' | 'RED';
    autonomy: AgentAutonomy;
    suggestions: string[];
    manages?: string[];
    reportsTo?: string;
    collaboratesWith?: string[];
}

export interface LlmConfig {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
}

export interface AgentPersona {
    id: string;
    name: string;
    shortName: string;
    voice: string;
    color: string;
    colorRgb: string;
    specialty: string;
    description: string;
    llm: LlmConfig;
    systemPrompt: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}

// --- Team Types ---

export interface TeamMemberRef {
    agentId: string;
    role: 'orchestrator' | 'specialist' | 'analyst';
    domains: string[];
}

export interface TeamPolicies {
    maxBudgetTokens: number;
    maxBudgetToolCalls: number;
    maxDurationMs: number;
    maxTaskDurationMs: number;
    heartbeatIntervalMs: number;
    maxParallelTasks: number;
    requireApprovalBeforeStart: boolean;
    checkpointAfterEachTask: boolean;
    voltRequired: boolean;
    allowedChannels: string[];
}

export interface TeamDefinition {
    id: string;
    type: 'team';
    version: string;
    displayName: string;
    description: string;
    author?: string;
    tier?: string;
    icon?: string;
    accentColor?: string;
    orchestrator: TeamMemberRef;
    members: TeamMemberRef[];
    policies: TeamPolicies;
    sharedContext: string;
}

// --- Tier & Licensing Types ---

export type ComparisonTier = Record<string, Record<string, string | boolean | number>>;

export type TierLimits = Record<string, Record<string, any>>;

export interface Capabilities {
    aeeIntents: string[];
    toolAccess?: string[];
}

// --- Marketing Types ---

export interface Testimonial {
    quote: string;
    author: string;
    role: string;
}

// --- Plugin Manifest ---

/**
 * manifest.json. The host REQUIRES `id`, `name`, `version`. The id must match
 * MANIFEST_ID_PATTERN and must not start with a reserved prefix
 * (RESERVED_ID_PREFIXES), both exported from "quox-plugin-sdk".
 *
 * Fields the host reads: id, name, version, author, permissions, sidebar,
 * routeGuards, integrity, official, backend, agentDefinition, agentPersona,
 * delegatorKeywords. Everything else is optional metadata.
 */
export interface PluginManifest {
    /** Lowercase alphanumeric + dashes, 3-64 chars. No core-/system-/quox-/admin- prefix. */
    id: string;
    name: string;
    version: string;
    author?: string;
    description?: string;
    category?: string;
    license?: 'free' | string;
    permissions?: PluginPermission[];
    /** Sidebar entries. Ignored if the bundle registers its own via registerPlugin(). */
    sidebar?: SidebarItem[];
    /** Route map (path to component name). */
    routes?: Record<string, string>;
    /**
     * Per-route access guards, keyed by route path. Lives in the manifest so
     * the signature covers it.
     */
    routeGuards?: Record<string, { minRole?: 'runner' | 'builder' | 'admin'; auditorAllowed?: boolean }>;
    /** Bundle integrity hash used for official (signed) bundles. Set by tooling. */
    integrity?: string | Record<string, string>;
    /** Only honoured for bundles signed by a Quox official key. Community plugins cannot set this. */
    official?: boolean;
    minQuoxVersion?: string;
    backend?: {
        image: string;
        healthPath?: string;
        port?: number;
    };

    // --- The fields below are IGNORED by the community sandbox. ---
    // They apply to official/in-parent plugins only; they are kept in the
    // type so existing manifests still type-check.

    /** Ignored by the community sandbox. */
    configSchema?: Record<string, ConfigSchemaField>;
    /** Ignored by the community sandbox. */
    safety?: SafetyConfig;
    /** Ignored by the community sandbox. */
    nocIntegration?: NocIntegration;
    /** Ignored by the community sandbox. */
    specialist?: SpecialistAgent;
    /**
     * Declare an agent and the Quox host renders the agent sidebar next to your
     * plugin, the same component Quox's own agents use, so it always matches.
     * The host reads `id`, `name`, `role`, `color` and `suggestions` (max 6) for
     * the sidebar. Do not build your own chat panel inside the plugin frame, and
     * note that no data from the plugin frame is sent to the chat as context.
     */
    agentDefinition?: AgentDefinition;
    /** Set `false` to opt out of the host-rendered agent sidebar even when `agentDefinition` is declared. */
    agentSidebar?: boolean;
    /** Agent registration is not available to community plugins. */
    agentPersona?: AgentPersona;
    /** Agent registration is not available to community plugins. */
    delegatorKeywords?: string[];
    /** Ignored by the community sandbox. */
    toolDefinitions?: ToolDefinition[];
    /** Ignored by the community sandbox. */
    team?: TeamDefinition;
    /** Ignored by the community sandbox. */
    agents?: AgentDefinition[];
    /** Ignored by the community sandbox. */
    agentPersonas?: AgentPersona[];
    /** Marketing metadata only. */
    comparison?: ComparisonTier;
    /** Marketing metadata only. */
    limits?: TierLimits;
    /** Marketing metadata only. */
    capabilities?: Capabilities;
    /** Marketing metadata only. */
    heroGradient?: string;
    /** Marketing metadata only. */
    accentColor?: string;
    /** Marketing metadata only. */
    badge?: string;
    /** Marketing metadata only. */
    testimonials?: Testimonial[];
    /** Marketing metadata only. */
    marketingPoints?: string[];
}

/**
 * Enforced by the sandbox host (fail-closed, see COMMUNITY_PERMISSION_FOR_METHOD):
 * storage, network, memory, aee, notifications. A call without the matching
 * declaration rejects with Error('permission_denied: <perm>').
 * 'sidebar' and 'tools' are declarative only: shown to the admin at install
 * time, not enforced on window.quox calls in the sandbox.
 */
export type PluginPermission =
    | 'sidebar'
    | 'storage'
    | 'network'
    | 'memory'
    | 'notifications'
    | 'aee'
    | 'tools';

export interface SidebarItem {
    /** Route path, normally `/plugins/<id>` or a sub-path of it. */
    path: string;
    label: string;
    icon?: string;
    /** Sidebar section heading. */
    section?: string;
    title?: string;
}

/** What a plugin passes to registerPlugin(). Components stay in the sandbox frame. */
export interface PluginExports {
    routes?: Record<string, import('react').ComponentType<any>>;
    sidebar?: SidebarItem[];
}

/**
 * The plugin API: `window.quox`, available inside the Quox sandbox frame.
 * Every method returns a Promise (RPC over postMessage). This is the WHOLE
 * surface: there is no durable, secrets, config, cache or chat API for
 * community plugins.
 */
export interface QuoxPluginApi {
    readonly pluginId: string;

    /** Server-backed key/value store scoped to this plugin. Values must be structured-cloneable. */
    storage: {
        get(key: string): Promise<any>;
        set(key: string, value: any): Promise<void>;
        remove(key: string): Promise<void>;
        keys(): Promise<string[]>;
        getAll(): Promise<Record<string, any>>;
    };

    /**
     * Call this plugin's own backend namespace. `path` is RELATIVE to
     * /collector/api/v1/plugins/<id>/ ; absolute URLs and ".." are refused and
     * methods are allowlisted. Resolves with the response (does not throw on
     * non-2xx); `body` is the raw response text.
     */
    fetch(path: string, options?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{
        status: number;
        ok: boolean;
        body: string;
    }>;

    /**
     * @experimental Not available to community plugins yet: every call rejects
     * with Error('not_available: memory') after the permission check. Use
     * `storage` or your plugin's own backend meanwhile.
     */
    memory: {
        save(entry: { type: string; content: string; tags?: string[] }): Promise<any>;
        search(query: string, limit?: number): Promise<any>;
    };

    /**
     * @experimental Not available to community plugins yet: emit rejects with
     * Error('not_available: aee') after the permission check. Use your plugin's
     * own backend meanwhile.
     */
    aee: {
        emit(intent: string, payload: any): Promise<any>;
    };

    /** Navigate the host shell. */
    navigate(path: string): Promise<void>;
    notify(message: string, type?: 'info' | 'success' | 'warning' | 'error'): Promise<void>;
    getUser(): Promise<{ userId: string | null; orgId: string | null; role: string; tier: string }>;

    /** Set a handler for host events (for example `route`). Synchronous. */
    onEvent(fn: (method: string, args: Record<string, any>) => void): void;
}

/** @deprecated Renamed to QuoxPluginApi. The old PluginAPI surface does not exist in the sandbox. */
export type PluginAPI = QuoxPluginApi;

export interface SharedDeps {
    React: typeof import('react');
    ReactDOM: typeof import('react-dom/client');
    ReactRouterDOM: typeof import('react-router-dom');
    ReactJSXRuntime: typeof import('react/jsx-runtime');
}

declare global {
    interface Window {
        /** The plugin API. Present inside a Quox host only. */
        quox: QuoxPluginApi;
        /** Same object as window.quox. */
        usePluginApi: () => QuoxPluginApi;
        __quoxSharedDeps: SharedDeps;
        __quoxPluginRegister: (pluginId: string, exports: PluginExports) => void;
    }
}
