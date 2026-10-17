import type { StatusRowPayload, PluginStatusRowDecl } from './types';

export declare const STATUS_ROW_TONES: readonly ['ok', 'warn', 'error', 'info', 'neutral'];
export interface StatusRowValidation { ok: boolean; errors: string[] }
/** Build a clean payload (trims, drops unknown keys). Throws TypeError on bad input. */
export declare function statusRow(fields: StatusRowPayload): StatusRowPayload;
export declare function validateStatusRowPayload(obj: unknown): StatusRowValidation;
export declare function validateStatusRowDecls(decls: unknown): StatusRowValidation;
export type { StatusRowPayload, PluginStatusRowDecl };
