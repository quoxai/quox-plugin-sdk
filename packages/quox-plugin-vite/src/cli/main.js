/** quox-plugin CLI: build | validate | keygen | sign */
const { validate } = require('./validate.js');
const { keygen, sign } = require('./signing.js');
const { build } = require('./build.js');

const USAGE = `Usage:
  quox-plugin build [--dir .]
  quox-plugin validate [--dir .]
  quox-plugin keygen --out <dir> [--force]
  quox-plugin sign --key <private.pem> [--dir .]
`;

function parseArgs(argv) {
    const o = { _: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--force') o.force = true;
        else if (a === '--dir' || a === '--out' || a === '--key') o[a.slice(2)] = argv[++i];
        else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
        else o._.push(a);
    }
    return o;
}

function run(argv, io = { log: console.log, error: console.error }) {
    let args;
    try { args = parseArgs(argv); } catch (e) { io.error(e.message + '\n' + USAGE); return 1; }
    const cmd = args._[0];
    try {
        if (cmd === 'build') {
            const status = build({ dir: args.dir || '.' });
            if (status !== 0) io.error(`build: vite exited ${status}`);
            return status;
        }
        if (cmd === 'validate') {
            const r = validate({ dir: args.dir || '.' });
            for (const w of r.warnings) io.log(`warn   ${w}`);
            for (const e of r.errors) io.error(`error  ${e}`);
            io.log(r.ok ? 'validate: ok' : `validate: ${r.errors.length} error(s)`);
            return r.ok ? 0 : 1;
        }
        if (cmd === 'keygen') {
            const r = keygen({ out: args.out, force: args.force });
            io.log(`private key: ${r.keyPath} (keep secret, do not commit)`);
            io.log(`public key (hex): ${r.publicKeyHex}`);
            io.log('');
            io.log('Ask an org admin to trust it:');
            io.log(`  quox plugin trusted-keys add --label "<name>" --public-key ${r.publicKeyHex}`);
            return 0;
        }
        if (cmd === 'sign') {
            const r = sign({ dir: args.dir || '.', keyPath: args.key });
            io.log(`signed manifest.json + ${Object.keys(r.files).map((f) => 'dist/' + f).join(' + ')} (signature v2, plus v1 for older hosts) -> dist/signature.json`);
            io.log('Install: quox plugin install --manifest manifest.json --bundle dist/plugin.esm.js --css dist/plugin.css --signature dist/signature.json');
            return 0;
        }
    } catch (e) {
        io.error(`error  ${e.message}`);
        return 1;
    }
    io.error(USAGE);
    return cmd ? 1 : 0;
}

module.exports = { run, parseArgs };
