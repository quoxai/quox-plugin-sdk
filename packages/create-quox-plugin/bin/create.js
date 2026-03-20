#!/usr/bin/env node
/**
 * create-quox-plugin — Interactive scaffolder for QuoxCORE third-party plugins.
 *
 * Usage:
 *   npx create-quox-plugin my-plugin
 *   npx create-quox-plugin my-plugin --template with-backend
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

const CATEGORIES = ['Monitoring', 'Productivity', 'Communication', 'AI & Intelligence', 'Infrastructure', 'Compliance & Audit', 'Other'];

async function main() {
    const args = process.argv.slice(2);
    let pluginName = args[0];
    let template = 'basic';

    const templateIdx = args.indexOf('--template');
    if (templateIdx !== -1 && args[templateIdx + 1]) {
        template = args[templateIdx + 1];
    }

    if (!pluginName) {
        pluginName = await ask('Plugin name (kebab-case): ');
    }

    // Validate name
    if (!/^[a-z][a-z0-9-]{1,62}[a-z0-9]$/.test(pluginName)) {
        console.error('Invalid plugin name. Use lowercase letters, numbers, and dashes (3-64 chars).');
        process.exit(1);
    }

    const displayName = await ask(`Display name [${pluginName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}]: `) ||
        pluginName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    const category = await ask(`Category (${CATEGORIES.join(', ')}) [Other]: `) || 'Other';
    const author = await ask('Author: ') || '';
    const description = await ask('Description: ') || `A QuoxCORE plugin: ${displayName}`;

    rl.close();

    const outDir = path.resolve(pluginName);
    if (fs.existsSync(outDir)) {
        console.error(`Directory ${pluginName} already exists.`);
        process.exit(1);
    }

    console.log(`\nScaffolding ${displayName} (${template} template)...\n`);

    // Create project structure
    fs.mkdirSync(path.join(outDir, 'src', 'views'), { recursive: true });

    // manifest.json
    const manifest = {
        id: pluginName,
        name: displayName,
        version: '0.1.0',
        author,
        description,
        category,
        license: 'free',
        permissions: ['sidebar', 'storage', 'notifications'],
        sidebar: [
            {
                path: `/plugins/${pluginName}`,
                label: displayName,
                icon: 'puzzle',
            }
        ],
        routes: {
            [`/plugins/${pluginName}`]: 'MainView',
        },
        minQuoxVersion: '1.0.0',
    };

    if (template === 'with-backend') {
        manifest.permissions.push('network');
        manifest.backend = {
            image: `${pluginName}-backend:latest`,
            healthPath: '/health',
            port: 8080,
        };
    }

    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    // src/index.jsx — plugin entry point
    fs.writeFileSync(path.join(outDir, 'src', 'index.jsx'), `/**
 * ${displayName} — QuoxCORE Plugin Entry Point
 */

const { React } = window.__quoxSharedDeps;
import MainView from './views/MainView';

window.__quoxPluginRegister('${pluginName}', {
    routes: {
        '/plugins/${pluginName}': MainView,
    },
    sidebar: [
        { path: '/plugins/${pluginName}', label: '${displayName}', icon: 'puzzle' },
    ],
    hooks: {
        onActivate() {
            console.log('[${displayName}] Activated');
        },
        onDeactivate() {
            console.log('[${displayName}] Deactivated');
        },
    },
});
`);

    // src/views/MainView.jsx
    fs.writeFileSync(path.join(outDir, 'src', 'views', 'MainView.jsx'), `/**
 * ${displayName} — Main View
 */

const { React } = window.__quoxSharedDeps;

export default function MainView() {
    return (
        <div style={{
            padding: '2rem',
            maxWidth: '800px',
        }}>
            <h2 style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1rem' }}>
                ${displayName}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>
                ${description}
            </p>
        </div>
    );
}
`);

    // vite.config.js
    fs.writeFileSync(path.join(outDir, 'vite.config.js'), `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import quoxPlugin from 'quox-plugin-vite';

export default defineConfig({
    plugins: [
        react(),
        quoxPlugin({ pluginId: '${pluginName}' }),
    ],
});
`);

    // package.json
    const pkg = {
        name: pluginName,
        version: '0.1.0',
        private: true,
        scripts: {
            dev: 'vite',
            build: 'vite build',
            validate: 'node -e "const m = require(\'./manifest.json\'); console.log(\'Manifest OK:\', m.id, m.version)"',
        },
        devDependencies: {
            '@vitejs/plugin-react': '^4.0.0',
            'quox-plugin-vite': '^0.1.0',
            'quox-plugin-sdk': '^0.1.0',
            vite: '^7.0.0',
        },
    };
    fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkg, null, 2));

    // .gitignore
    fs.writeFileSync(path.join(outDir, '.gitignore'), `node_modules/
dist/
*.quoxplugin
`);

    console.log(`Created ${pluginName}/`);
    console.log('  manifest.json');
    console.log('  src/index.jsx');
    console.log('  src/views/MainView.jsx');
    console.log('  vite.config.js');
    console.log('  package.json');
    console.log('  .gitignore');
    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${pluginName}`);
    console.log('  npm install');
    console.log('  npm run build    # produces .quoxplugin file');
    console.log('  npm run dev      # start dev server');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
