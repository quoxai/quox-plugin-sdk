/**
 * no-cache-as-primary-storage
 *
 * Flags any module that calls `api.cache.set(...)` (or the deprecated
 * `api.storage.set(...)` alias) without anywhere also calling
 * `api.durable.<set|memory>` or `api.memory.save`. Browser-only persistence
 * loses user data on every cache clear / device switch / private window;
 * this rule catches the case where a plugin author has *only* used the
 * ephemeral path.
 *
 * The check is deliberately lexical (member-expression text match) rather
 * than full type-aware tracing — keeps the rule cheap and works without a
 * TypeScript program. False positives are easy to silence with a per-line
 * disable.
 */
export default {
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow api.cache as the only persistence path in a plugin module',
            recommended: true,
        },
        messages: {
            noCacheAsPrimary:
                'api.cache is browser-only and lost on every cache clear or device switch. ' +
                'Pair it with api.durable or api.memory, or move this state to api.durable. ' +
                'See the persistence section in plugin-api.md.',
            useCacheNotStorage:
                'api.storage is a deprecated alias of api.cache. Update to api.cache and ' +
                'consider whether this state should be in api.durable instead.',
        },
        schema: [],
    },

    create(context) {
        let cacheWriteSites = [];
        let storageWriteSites = [];
        let sawDurable = false;
        let sawMemorySave = false;

        function memberPath(node) {
            // Build "a.b.c" string from a MemberExpression.
            const parts = [];
            let cur = node;
            while (cur && cur.type === 'MemberExpression' && !cur.computed && cur.property?.name) {
                parts.unshift(cur.property.name);
                cur = cur.object;
            }
            if (cur?.type === 'Identifier') parts.unshift(cur.name);
            return parts.join('.');
        }

        return {
            CallExpression(node) {
                const callee = node.callee;
                if (!callee || callee.type !== 'MemberExpression') return;
                const path = memberPath(callee);

                // Track presence of any durable/memory write — keys/list/get
                // alone don't count, since reads imply someone else owns the
                // truth. We require an actual write for the "balance" check.
                if (/(^|\.)durable\.(set|remove)$/.test(path)) sawDurable = true;
                if (/(^|\.)memory\.save$/.test(path)) sawMemorySave = true;

                // Track ephemeral writes.
                if (/(^|\.)cache\.set$/.test(path)) cacheWriteSites.push(node);
                if (/(^|\.)storage\.set$/.test(path)) storageWriteSites.push(node);
            },

            'Program:exit'() {
                // api.storage is deprecated regardless of pairing.
                for (const node of storageWriteSites) {
                    context.report({ node, messageId: 'useCacheNotStorage' });
                }

                // Cache writes are fine if paired with a durable/memory write
                // somewhere in the same module.
                if (sawDurable || sawMemorySave) return;
                for (const node of cacheWriteSites) {
                    context.report({ node, messageId: 'noCacheAsPrimary' });
                }
            },
        };
    },
};
