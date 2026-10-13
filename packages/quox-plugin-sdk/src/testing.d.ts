import type { QuoxPluginApi, SharedDeps } from './types';

export interface MockQuoxOptions {
    pluginId?: string;
    user?: Partial<{ userId: string; orgId: string; role: string; tier: string }>;
    fetch?: (path: string, options: any) => { status: number; ok?: boolean; body?: any } | Promise<{ status: number; ok?: boolean; body?: any }>;
    /** Granted permissions, enforced like the host. Default (no permissions/manifest/strictPermissions): all granted. */
    permissions?: string[];
    /** Your manifest.json object: its permissions are used, fail-closed (absent = none). */
    manifest?: { permissions?: string[] };
    /** With no permissions/manifest, grant nothing instead of everything. */
    strictPermissions?: boolean;
    /** Default true: memory.* and aee.emit reject with not_available (like the host). false only for testing future behaviour. */
    simulateUnavailable?: boolean;
    sharedDeps?: SharedDeps | Record<string, unknown>;
}

export interface MockQuox extends QuoxPluginApi {
    storageMap: Map<string, any>;
    memoryStore: any[];
    aeeLog: { intent: string; payload: any }[];
    notifyLog: { message: string; type: string }[];
    navigateLog: string[];
    registered: Record<string, any>;
    emitEvent(method: string, args?: any[]): void;
    uninstall(): void;
}

export function createMockQuox(opts?: MockQuoxOptions): MockQuox;
export function installMockQuox(opts?: MockQuoxOptions): MockQuox;
export function uninstallMockQuox(): void;
/** @deprecated Always throws. Use createMockQuox. */
export function createMockPluginApi(): never;
/** @deprecated Always throws. Use installMockQuox. */
export function setupPluginTestEnv(): never;
/** @deprecated Always throws. Use uninstallMockQuox. */
export function teardownPluginTestEnv(): never;
/** @deprecated Always throws. */
export function setupGlassMocks(): never;
