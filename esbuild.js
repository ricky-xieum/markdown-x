const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');

// Copy third-party vendor assets (Mermaid, KaTeX) into media/vendor/ so the
// webview can load them locally instead of from jsDelivr. Eliminates the
// per-render network round-trip and makes the preview work offline.
function copyVendorAssets() {
    const vendorDir = path.join(__dirname, 'media', 'vendor');
    fs.mkdirSync(vendorDir, { recursive: true });

    const files = [
        ['node_modules/mermaid/dist/mermaid.min.js', 'mermaid.min.js'],
        ['node_modules/katex/dist/katex.min.js', 'katex.min.js'],
        ['node_modules/katex/dist/contrib/auto-render.min.js', 'auto-render.min.js'],
        ['node_modules/katex/dist/katex.min.css', 'katex.min.css'],
    ];
    for (const [src, dest] of files) {
        const srcPath = path.join(__dirname, src);
        if (!fs.existsSync(srcPath)) {
            console.error(`Vendor asset missing: ${src}`);
            process.exit(1);
        }
        fs.copyFileSync(srcPath, path.join(vendorDir, dest));
    }

    // KaTeX fonts (woff2 referenced by katex.min.css)
    const fontsSrc = path.join(__dirname, 'node_modules/katex/dist/fonts');
    const fontsDest = path.join(vendorDir, 'fonts');
    fs.mkdirSync(fontsDest, { recursive: true });
    for (const f of fs.readdirSync(fontsSrc)) {
        // Skip non-woff2 (legacy .woff, .ttf) — modern browsers use woff2 only
        if (!f.endsWith('.woff2')) continue;
        fs.copyFileSync(path.join(fontsSrc, f), path.join(fontsDest, f));
    }
}

copyVendorAssets();

esbuild.build({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'out/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    sourcemap: !production,
    minify: production,
    treeShaking: true,
}).catch(() => process.exit(1));
