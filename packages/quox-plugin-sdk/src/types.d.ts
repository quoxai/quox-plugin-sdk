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
