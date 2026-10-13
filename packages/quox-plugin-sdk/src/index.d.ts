import type { QuoxPluginApi, PluginExports, SharedDeps } from './types';
export * from './types';

export const MANIFEST_ID_PATTERN: RegExp;
export const RESERVED_ID_PREFIXES: string[];
/** Permission the host requires per window.quox RPC method (community sandbox, fail-closed). */
export const COMMUNITY_PERMISSION_FOR_METHOD: Readonly<Record<string, PluginPermission>>;
export function validateManifestId(id: unknown): string | null;
export function getQuox(): QuoxPluginApi;
export function usePluginApi(): QuoxPluginApi;
export function getSharedDeps(): SharedDeps;
export function registerPlugin(pluginId: string, exports: PluginExports): void;
/** @deprecated Always throws. Use plugin.css. */
export function getGlassComponents(): never;
