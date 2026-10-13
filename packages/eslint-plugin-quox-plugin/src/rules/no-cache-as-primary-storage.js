/**
 * no-cache-as-primary-storage
 *
 * Flags a module that writes to browser-only storage (`localStorage.setItem`,
 * `sessionStorage.setItem`, or a legacy `api.cache.set`) without ever
 * persisting through `window.quox.storage` or `window.quox.memory.save`.
 * Browser-only persistence is lost on every cache clear or device switch, and
 * inside the Quox sandbox frame (opaque origin) it is not reliable at all. The
 * server-backed store is `window.quox.storage` (`getQuox().storage`).
 *
 * The check is deliberately lexical (member-expression text match) rather
 * than type-aware. False positives are easy to silence with a per-line
 * disable.
 */
export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow browser-only storage as the only persistence path in a plugin module',
            recommended: true,
        },
        messages: {
            noCacheAsPrimary:
                'Browser-only storage is lost on every cache clear or device switch. ' +
                'Persist this state with window.quox.storage.set(key, value) (server-backed) ' +
                'or window.quox.memory.save(entry). See plugin-api.md.',
        },
        schema: [],
    },

    create(context) {
        const browserWriteSites = [];
        let sawPersist = false;

        function memberPath(node) {
            // Build "a.b.c" string from a MemberExpression.
            const parts = [];
            let cur = node;
            while (cur && cur.type === 'MemberExpression' && !cur.computed && cur.property?.name) {
                parts.unshift(cur.property.name);
                cur = cur.object;
            }
            if (cur?.type === 'Identifier') parts.unshift(cur.name);
            else if (cur?.type === 'ThisExpression') parts.unshift('this');
            return parts.join('.');
        }

        return {
            CallExpression(node) {
                const callee = node.callee;
                if (!callee || callee.type !== 'MemberExpression') return;
                const path = memberPath(callee);

                // Only writes count: reads imply someone else owns the truth.
                if (/(^|\.)storage\.(set|remove)$/.test(path)) sawPersist = true;
                if (/(^|\.)memory\.save$/.test(path)) sawPersist = true;

                if (/(^|\.)(localStorage|sessionStorage)\.setItem$/.test(path)) browserWriteSites.push(node);
                if (/(^|\.)cache\.set$/.test(path)) browserWriteSites.push(node);
            },

            'Program:exit'() {
                if (sawPersist) return;
                for (const node of browserWriteSites) {
                    context.report({ node, messageId: 'noCacheAsPrimary' });
                }
            },
        };
    },
};
