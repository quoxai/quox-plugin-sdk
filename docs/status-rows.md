# Status rows: one line in the quox CLI window

A status row is a single line of live status that your plugin puts in the `quox` terminal window,
for example `Backups  3  failed overnight  up 2`. The host polls a route of your plugin's own
backend, validates the JSON, strips terminal control characters and draws the line.

The contract helper is `@quox/plugin-sdk/status-row` (zero dependencies, pure functions).

## The payload

Your backend route returns JSON with these fields:

| Field   | Type                                   | Rule                                         |
|---------|----------------------------------------|----------------------------------------------|
| `text`  | string                                 | Required unless `value` is given. Max 160.   |
| `label` | string                                 | Max 16.                                      |
| `value` | finite number or string                | String max 24.                               |
| `tone`  | `ok` `warn` `error` `info` `neutral`   | Colours the row.                             |
| `trend` | `up` `down` `flat` or a finite number  | A number is the change.                      |
| `link`  | http(s) URL                            | No username or password. Max 500.            |

Unknown keys are dropped by `statusRow()` and ignored by the host.

## The manifest block

Declare up to 3 rows in `manifest.json`:

```json
{
  "statusRows": [
    { "id": "backups", "label": "Backups", "path": "rows/backups", "every": "5m",
      "description": "Failed backup jobs in the last 24 hours" }
  ]
}
```

- `id`: letters, digits, `_` or `-`, 1 to 24 chars, starts with a letter or digit, unique in the manifest.
- `label`: 1 to 24 chars.
- `path`: a relative route of your own backend. The host calls `GET /api/v1/plugins/<pluginId>/<path>` with the user's session. No leading `/`, no scheme, no `..` or `.` segments, no whitespace, `#` or backslash, max 300 chars.
- `every`: optional, like `30s`, `5m`, `1h`. Between 5s and 1 day.
- `description`: optional, max 200 chars.

`quox-plugin validate` checks these rules and fails on a bad block.

## A minimal backend route

```js
import { statusRow } from '@quox/plugin-sdk/status-row';

app.get('/rows/backups', async (req, res) => {
  const failed = await db.countFailedBackups();
  res.json(statusRow({
    label: 'Backups', value: failed, text: 'failed overnight',
    tone: failed ? 'error' : 'ok', trend: failed,
  }));
});
```

`statusRow()` trims strings, drops unknown keys and throws a `TypeError` with a clear message on bad input.
`validateStatusRowPayload(obj)` and `validateStatusRowDecls(decls)` return `{ ok, errors }` instead of throwing.

## A standalone script

Any endpoint that returns the payload works, no SDK needed:

```js
import http from 'node:http';

http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ label: 'Queue', value: 12, text: 'jobs waiting', tone: 'info' }));
}).listen(8099, '0.0.0.0');
// curl http://192.0.2.10:8099/   ->   {"label":"Queue","value":12,"text":"jobs waiting","tone":"info"}
```

## Adding a row as a user

```
quox rows add <id> --plugin <pluginId> [--row <rowId>]
quox rows test <id>
```

Or type `/row new` in the quox window. `rows test` fetches the route once and shows the row or the validation errors.

## Security rules

- No secrets in rows. Anyone who can see the terminal can read them.
- GET only. The host never POSTs to a row route.
- The host strips terminal control characters from every field before drawing.
- Command rows (rows that run a local command) are never shipped by plugins. A plugin can only declare rows served by its own backend.
- Links are http(s) only and never carry credentials.
- Use example hosts such as `quox.example` or 192.0.2.0/24 in docs and samples.
