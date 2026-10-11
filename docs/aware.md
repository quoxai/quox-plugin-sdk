# Make your plugin aware: report to LUCID

Backend plugins can speak to LUCID (situational awareness) as their own feed. Import the Node-only
helper from `@quox/plugin-sdk/aware` (zero dependencies, global `fetch`). It never throws: every
call resolves `{ ok, status, error }`.

The helper reads no env. Pass your existing collector URL and `INTERNAL_SERVICE_KEY` yourself.
`feed` is stamped on every event's `source.feed`, so the plugin speaks as itself.

```js
import { createAware, startHeartbeat } from '@quox/plugin-sdk/aware';

const aware = createAware({
  feed: 'myplug', orgId, surface: 'myplug',
  collectorUrl: COLLECTOR_URL, serviceKey: INTERNAL_SERVICE_KEY,
});
const hb = startHeartbeat(aware, 30_000, () => (db.ok() ? {} : { error: 'db down' }));
await aware.emit({
  ledger: 'intentional', kind: 'ask', subject: 'myplug:export:42',
  summary: 'Export 42 needs a decision', salience: { needs: 'owner', gates: ['export:42'] },
});
await aware.snapshot('myplug:job:', jobs.map((j) => ({
  ledger: 'operational', kind: 'state', subject: `myplug:job:${j.id}`, summary: j.title,
})), { asOf: Date.now() });
// on shutdown: hb.stop()
```

Event fields: `ledger` (vital|operational|intentional|social|security), `kind`
(state|delta|ask|heartbeat|retract), `subject`, optional `summary`, `ttl_s`, `causes`,
`salience {needs, gates}`, `state.layers`, `state.affects`, `state.actor`.
Snapshots retract open subjects of your feed and prefix not heard since `asOf`.
`aware.expect([...feeds])` declares feeds that should be live. `startHeartbeat` backs off
(x2, capped at 10x) while posts fail and counts failures (`hb.stats()`).

## Manifest convention

```json
"aware": { "feed": "myplug", "subjects": [{ "prefix": "myplug:job:", "area": "work", "kind": "job" }], "heartbeat_s": 30 }
```
