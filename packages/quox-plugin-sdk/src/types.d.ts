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
        onActivate?: () => void;
        onDeactivate?: () => void;
    };
}

export interface PluginAPI {
    pluginId: string;
    storage: {
        get(key: string): any;
        set(key: string, value: any): void;
        remove(key: string): void;
        keys(): string[];
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
}

export interface SharedDeps {
    React: typeof import('react');
    ReactDOM: typeof import('react-dom/client');
    ReactRouterDOM: typeof import('react-router-dom');
}

declare global {
    interface Window {
        __quoxSharedDeps: SharedDeps;
        __quoxPluginRegister: (pluginId: string, exports: PluginExports) => void;
    }
}
