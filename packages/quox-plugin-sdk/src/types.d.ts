/**
 * QuoxCORE Plugin SDK — TypeScript type definitions
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

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    author?: string;
    description?: string;
    category?: string;
    license?: 'free' | string;
    permissions?: PluginPermission[];
    sidebar?: SidebarItem[];
    routes?: Record<string, string>;
    minQuoxVersion?: string;
    backend?: {
        image: string;
        healthPath?: string;
        port?: number;
    };
    configSchema?: Record<string, ConfigSchemaField>;
    safety?: SafetyConfig;
    nocIntegration?: NocIntegration;
    specialist?: SpecialistAgent;
    agentDefinition?: AgentDefinition;
    agentPersona?: AgentPersona;
    toolDefinitions?: ToolDefinition[];
    team?: TeamDefinition;
    agents?: AgentDefinition[];
    agentPersonas?: AgentPersona[];
    comparison?: ComparisonTier;
    limits?: TierLimits;
    capabilities?: Capabilities;
    heroGradient?: string;
    accentColor?: string;
    badge?: string;
    testimonials?: Testimonial[];
    marketingPoints?: string[];
}

export type PluginPermission =
    | 'sidebar'
    | 'storage'
    | 'network'
    | 'memory'
    | 'notifications'
    | 'aee'
    | 'tools';

export interface SidebarItem {
    path: string;
    label: string;
    icon: string;
    minRole?: 'runner' | 'builder' | 'admin';
    badge?: string;
}

export interface PluginExports {
    routes?: Record<string, React.ComponentType>;
    sidebar?: SidebarItem[];
    hooks?: {
        // DOM lifecycle (stable, fire on every page load)
        onActivate?: (api: PluginAPI) => void | Promise<void>;
        onDeactivate?: () => void | Promise<void>;
        // PD-5 install lifecycle (fire once per org-level boundary)
        onInstall?: (api: PluginAPI, ctx: { manifestVersion: string }) => void | Promise<void>;
        onUpgrade?: (api: PluginAPI, ctx: { fromVersion: string | null; toVersion: string }) => void | Promise<void>;
        onUninstall?: (api: PluginAPI, ctx: { deleteData: boolean }) => void | Promise<void>;
        // Reserved — wired up when backup/restore integration lands.
        onRestore?: (api: PluginAPI, ctx: { backupSnapshot: unknown }) => void | Promise<void>;
    };
}

/**
 * Plugin runtime API.
 *
 * Persistence model:
 *   - api.cache    — browser-only, ephemeral. NOT durable. Use for UI state.
 *   - api.durable  — server-backed, org/user scoped, survives all browser
 *                    state resets and syncs across devices. Default for
 *                    anything a user expects to persist.
 *   - api.secrets  — encrypted at rest server-side. Plaintext returned only
 *                    via api.secrets.get() and audit-logged.
 *   - api.memory   — long-form facts/observations into the QuoxCORE memory
 *                    service.
 *
 * `api.storage` is preserved as a deprecated alias of `api.cache` for one
 * minor release. New plugins must use `api.cache` (for UI state) or
 * `api.durable` (for anything that should survive). Future SDK versions
 * remove `api.storage` entirely.
 */
export interface PluginAPI {
    pluginId: string;

    /** Browser-only namespaced KV. Ephemeral — never use as the only store. */
    cache: {
        get(key: string): any;
        set(key: string, value: any): void;
        remove(key: string): void;
        keys(): string[];
    };

    /** @deprecated Use `api.cache` (UI state) or `api.durable` (persistent data). */
    storage: PluginAPI['cache'];

    /** Server-backed durable KV — org-scoped by default; pass scope:'user' for per-user. */
    durable: {
        get(key: string, opts?: { scope?: 'org' | 'user' }): Promise<any>;
        set(key: string, value: any, opts?: { scope?: 'org' | 'user' }): Promise<void>;
        remove(key: string, opts?: { scope?: 'org' | 'user' }): Promise<void>;
        keys(opts?: { scope?: 'org' | 'user' }): Promise<string[]>;
    };

    /** Per-plugin encrypted secrets vault. Plaintext only via get(); reads audit. */
    secrets: {
        list(): Promise<string[]>;
        get(name: string): Promise<string | null>;
        set(name: string, value: string, opts?: { description?: string }): Promise<void>;
        remove(name: string): Promise<void>;
    };

    config: {
        get(): Record<string, any>;
        save(config: Record<string, any>): void;
    };
    fetch(path: string, options?: RequestInit): Promise<Response>;
    notify(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
    memory: {
        save(entry: { type: string; content: string; tags?: string[] }): Promise<any>;
        search(query: string, limit?: number): Promise<any>;
    };
    aee: {
        emit(intent: string, payload: any): Promise<any>;
    };

    /** PSDK-4: navigate the host shell (dispatches quox-navigate). */
    navigate(path: string): void;

    /** PSDK-4: current user context, read from host auth state. */
    getUser(): { userId: string | null; orgId: string | null; role: string; tier: string };

    /**
     * PSDK-4: agent chat. openSidebar dispatches quox-open-agent-chat; the
     * host (SDK-DX P4) renders AgentChatPanel in a right-side dock. Dismiss
     * with a quox-close-agent-chat window event.
     */
    chat: {
        openSidebar(agentId: string, options?: { agentName?: string; agentColor?: string; additionalContext?: string; width?: number }): void;
    };
}

export interface SharedDeps {
    React: typeof import('react');
    ReactDOM: typeof import('react-dom/client');
    ReactRouterDOM: typeof import('react-router-dom');
}

// --- __quoxGlass component library ---
//
// Types below match the PRODUCTION implementations exposed by
// quox-dashboard's thirdPartyPluginHost.js (window.__quoxGlass, PSDK-2).
// The quox-plugin-vite dev host (P1) installs a functional but simplified
// approximation of the same names at `npm run dev` time — see
// docs/plugin-api.md "__quoxGlass component library" for the honest list of
// dev-vs-prod deltas (e.g. GlassPanel's `highlight`/`hoverable`/`onClick`
// props are prod-only; AgentChatPanel/AgentChatSidebar render a static
// "dev preview" placeholder instead of a live agent).

/** quox-dashboard/src/components/compliance/glass-primitives.jsx */
export interface GlassPanelProps {
    children?: React.ReactNode;
    style?: React.CSSProperties;
    /** Hex/CSS color used to tint the top/left border + glow. */
    highlight?: string;
    onClick?: () => void;
    /** Enables hover lift + press-down transforms. */
    hoverable?: boolean;
}

export interface GlassPillProps {
    children?: React.ReactNode;
    color?: string;
    style?: React.CSSProperties;
}

export interface GlassTab {
    id: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
}

export interface GlassTabBarProps {
    tabs: GlassTab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export interface SectionHeaderProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    action?: React.ReactNode;
}

export interface ProgressRingProps {
    /** 0-100. */
    value: number;
    size?: number;
    strokeWidth?: number;
    /** Defaults to a value/threshold-derived color (green >90, amber >=60, else red). */
    color?: string;
    label?: React.ReactNode;
}

export interface SparklineProps {
    data?: number[];
    color?: string;
    width?: number;
    height?: number;
}

export interface GlassSkeletonProps {
    height?: number;
    style?: React.CSSProperties;
}

export interface GlassErrorProps {
    message?: React.ReactNode;
    onRetry?: () => void;
}

/** quox-dashboard/src/components/ui/MarkdownContent.jsx */
export interface MarkdownContentProps {
    children?: string;
    /** Applies the `.md-compact` class for denser rendering (sidebars). */
    compact?: boolean;
    className?: string;
}

/**
 * quox-dashboard/src/components/chat/AgentChatPanel.jsx
 *
 * Full-featured multi-tab agent chat panel — wraps ChatTab with automatic
 * auth/workspace/LLM-routing context wiring. Renders a 48px collapsed rail
 * when `collapsed` is true.
 */
export interface AgentChatPanelProps {
    /** Agent id to chat with, e.g. "auditus". Resolved via entityRegistry for name/color fallback. */
    agentId: string;
    /** Overrides the display name resolved from the agent's entity registry entry. */
    agentName?: string;
    /** Overrides the accent color resolved from the agent's entity registry entry. Defaults to '#30ff90'. */
    agentColor?: string;
    /** Extra context text injected into the conversation's system context. */
    additionalContext?: string;
    /** When true, renders only the 48px collapsed rail (click to expand via onToggle). */
    collapsed?: boolean;
    onToggle?: () => void;
    /** Panel width in px when expanded. Defaults to 300 (AppShell's SDK-DX P4 dock uses 360). */
    width?: number;
    /** Custom header node rendered above the chat body. */
    headerContent?: React.ReactNode;
    /** ChatTab session/tab id. Defaults to `${agentId}-panel`. */
    tabId?: string;
    className?: string;
}

/** quox-dashboard/src/components/chat/AgentChatSidebar.jsx */
export interface AgentChatSidebarExtraSection {
    id: string;
    label: React.ReactNode;
    badge?: number;
    icon?: React.ReactNode;
    content: React.ReactNode;
}

/**
 * quox-dashboard/src/components/chat/AgentChatSidebar.jsx
 *
 * Lightweight sidebar chat pattern (PSDK-1) — the same primitive that backs
 * 14+ built-in *ChatSidebar.jsx surfaces in quox-dashboard. Prefer this over
 * AgentChatPanel for docked/embedded sidebars; use AgentChatPanel for a
 * fuller multi-tab experience.
 */
export interface AgentChatSidebarProps {
    agentId: string;
    agentName?: string;
    agentColor?: string;
    agentRole?: string;
    avatarUrl?: string;
    /** Builds extra context passed to ChatEngine, e.g. `async () => ({ surface: 'sidebar' })`. */
    contextBuilder?: () => Promise<Record<string, any>> | Record<string, any>;
    /** Suggestion chips shown in the empty state (max 6 rendered). */
    suggestions?: string[];
    collapsed?: boolean;
    onToggle?: () => void;
    headerContent?: React.ReactNode;
    placeholder?: string;
    emptyIcon?: React.ReactNode;
    emptyText?: string;
    className?: string;
    enableVoice?: boolean;
    enableSmartRouter?: boolean;
    enableMemory?: boolean;
    /** Session storage key prefix. Defaults to `${agentId.toUpperCase()}_SIDEBAR`. */
    sessionPrefix?: string;
    vizStorageKey?: string;
    /** Adds a section toggle bar under the header; chat is always the 'chat' section. */
    extraSections?: AgentChatSidebarExtraSection[];
    /** Controlled active section id. Falls back to internal state when omitted. */
    activeSection?: string;
    onSectionChange?: (sectionId: string) => void;
    defaultSection?: string;
    /** Populated by the component each render with imperative send/clear handles. */
    chatHandleRef?: { current: { send: (text: string) => void; clear: () => void } | null };
    renderMessageAddon?: (message: Record<string, any>) => React.ReactNode;
    onAssistantMessage?: (message: Record<string, any>) => void;
    /** Extra header controls rendered before the New Chat button and collapse chevron. */
    headerExtra?: React.ReactNode;
}

/**
 * window.__quoxGlass — real quox-dashboard glass-design-system components
 * exposed at plugin-activation time (production) or a functional dev
 * approximation exposed by quox-plugin-vite's dev host (`npm run dev`, P1).
 * See thirdPartyPluginHost.js `initPluginHost()` (PSDK-2) for the canonical
 * production export list.
 */
export interface QuoxGlassComponents {
    // Chat patterns (2 shipped tiers; AgentChatPage full-screen tier is a
    // future phase — see the TODO comment in thirdPartyPluginHost.js).
    AgentChatSidebar: React.ComponentType<AgentChatSidebarProps>;
    AgentChatPanel: React.ComponentType<AgentChatPanelProps>;

    // Glass design system
    GlassPanel: React.ComponentType<GlassPanelProps>;
    GlassPill: React.ComponentType<GlassPillProps>;
    GlassTabBar: React.ComponentType<GlassTabBarProps>;
    SectionHeader: React.ComponentType<SectionHeaderProps>;
    ProgressRing: React.ComponentType<ProgressRingProps>;
    Sparkline: React.ComponentType<SparklineProps>;
    GlassSkeleton: React.ComponentType<GlassSkeletonProps>;
    GlassError: React.ComponentType<GlassErrorProps>;

    // Design tokens
    COLORS: {
        purple: string;
        cyan: string;
        green: string;
        amber: string;
        red: string;
        teal: string;
        indigo: string;
        white: string;
        dimText: string;
        subtleText: string;
    };
    STATUS_COLORS: {
        compliant: string;
        partial: string;
        'non-compliant': string;
        not_measured: string;
        gap: string;
        pass: string;
        fail: string;
        warn: string;
        pending: string;
    };
    PROTOCOL_COLORS: {
        AEE: string;
        AOCL: string;
        VOLT: string;
        WARD: string;
    };
    /** Monospace font stack: `'JetBrains Mono','Fira Code',monospace`. */
    M: string;
    /** Sans-serif font stack: `'Inter',system-ui,sans-serif`. */
    F: string;

    // Content rendering
    MarkdownContent: React.ComponentType<MarkdownContentProps>;
}

declare global {
    interface Window {
        __quoxSharedDeps: SharedDeps;
        __quoxPluginRegister: (pluginId: string, exports: PluginExports) => void;
        __quoxPluginApi: Record<string, PluginAPI>;
        /**
         * Glass design-system + chat components. Present in production after
         * `initPluginHost()` runs (before first render) and in dev via the
         * quox-plugin-vite dev host (unless `?bare=1` or `devHost: false`).
         */
        __quoxGlass?: QuoxGlassComponents;
        /**
         * Dev-only: the plugin project's parsed manifest.json, injected by
         * quox-plugin-vite's dev host at `/__quox-dev/manifest.js`. Never set
         * in production — plugin code should not rely on this at runtime.
         */
        __quoxDevManifest?: PluginManifest;
    }
}
