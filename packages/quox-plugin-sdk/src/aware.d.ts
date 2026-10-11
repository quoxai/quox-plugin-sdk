export type Ledger = 'vital' | 'operational' | 'intentional' | 'social' | 'security';
export type EventKind = 'state' | 'delta' | 'ask' | 'heartbeat' | 'retract';
export interface AwareEvent {
    ledger: Ledger;
    kind: EventKind;
    subject: string;
    summary?: string;
    ttl_s?: number;
    causes?: unknown[];
    salience?: { needs?: boolean; gates?: boolean };
    state?: {
        layers?: { L0?: string; L1?: unknown; L2?: unknown };
        affects?: unknown[];
        actor?: { type: 'agent' | 'session' | 'human' | 'system'; id?: string; name?: string };
        [k: string]: unknown;
    };
    [k: string]: unknown;
}
export interface AwareResult { ok: boolean; status: number; error?: string }
export interface AwareOptions {
    feed: string; orgId: string; collectorUrl: string; serviceKey: string;
    surface?: string; fetchImpl?: typeof fetch; timeoutMs?: number;
}
export interface Aware {
    feed: string;
    emit(event: AwareEvent): Promise<AwareResult>;
    heartbeat(opts?: { ttlS?: number; error?: string }): Promise<AwareResult>;
    snapshot(prefix: string, events: AwareEvent[], opts?: { asOf?: number }): Promise<AwareResult>;
    expect(feeds: string[]): Promise<AwareResult>;
}
export const LEDGERS: Ledger[];
export const KINDS: EventKind[];
export function validateEvent(ev: unknown): string | null;
export function createAware(opts: AwareOptions): Aware;
export function startHeartbeat(
    aware: Aware, everyMs: number,
    healthFn?: () => unknown | Promise<unknown>,
    opts?: { maxBackoffFactor?: number; onTick?: (r: AwareResult, failures: number) => void },
): { stop(): void; stats(): { failures: number; total: number; nextDelayMs: number } };
