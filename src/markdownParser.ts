import { marked, Renderer } from 'marked';
import hljs from 'highlight.js/lib/core';
import * as zlib from 'zlib';
import type { LanguageFn } from 'highlight.js';

// Register only commonly-used languages instead of the full ~190-language
// bundle. This trims ~3 MB from out/extension.js. Users who need a missing
// language can ask us to add it; auto-detection is disabled regardless.
const languages: Array<[string, () => LanguageFn]> = [
    ['bash', () => require('highlight.js/lib/languages/bash')],
    ['shell', () => require('highlight.js/lib/languages/shell')],
    ['c', () => require('highlight.js/lib/languages/c')],
    ['cpp', () => require('highlight.js/lib/languages/cpp')],
    ['csharp', () => require('highlight.js/lib/languages/csharp')],
    ['css', () => require('highlight.js/lib/languages/css')],
    ['scss', () => require('highlight.js/lib/languages/scss')],
    ['less', () => require('highlight.js/lib/languages/less')],
    ['diff', () => require('highlight.js/lib/languages/diff')],
    ['dockerfile', () => require('highlight.js/lib/languages/dockerfile')],
    ['go', () => require('highlight.js/lib/languages/go')],
    ['html', () => require('highlight.js/lib/languages/xml')],
    ['xml', () => require('highlight.js/lib/languages/xml')],
    ['ini', () => require('highlight.js/lib/languages/ini')],
    ['java', () => require('highlight.js/lib/languages/java')],
    ['javascript', () => require('highlight.js/lib/languages/javascript')],
    ['json', () => require('highlight.js/lib/languages/json')],
    ['kotlin', () => require('highlight.js/lib/languages/kotlin')],
    ['makefile', () => require('highlight.js/lib/languages/makefile')],
    ['markdown', () => require('highlight.js/lib/languages/markdown')],
    ['nginx', () => require('highlight.js/lib/languages/nginx')],
    ['perl', () => require('highlight.js/lib/languages/perl')],
    ['php', () => require('highlight.js/lib/languages/php')],
    ['plaintext', () => require('highlight.js/lib/languages/plaintext')],
    ['powershell', () => require('highlight.js/lib/languages/powershell')],
    ['python', () => require('highlight.js/lib/languages/python')],
    ['ruby', () => require('highlight.js/lib/languages/ruby')],
    ['rust', () => require('highlight.js/lib/languages/rust')],
    ['scala', () => require('highlight.js/lib/languages/scala')],
    ['sql', () => require('highlight.js/lib/languages/sql')],
    ['swift', () => require('highlight.js/lib/languages/swift')],
    ['typescript', () => require('highlight.js/lib/languages/typescript')],
    ['yaml', () => require('highlight.js/lib/languages/yaml')],
];
for (const [name, load] of languages) {
    hljs.registerLanguage(name, load());
}
// Common aliases — hljs.getLanguage accepts these so users can use `sh`, `js`, etc.
hljs.registerAliases(['sh', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['js', 'mjs'], { languageName: 'javascript' });
hljs.registerAliases(['ts'], { languageName: 'typescript' });
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['rb'], { languageName: 'ruby' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['cs'], { languageName: 'csharp' });
hljs.registerAliases(['cxx', 'c++', 'h', 'hpp'], { languageName: 'cpp' });
hljs.registerAliases(['svg'], { languageName: 'xml' });
hljs.registerAliases(['md'], { languageName: 'markdown' });
hljs.registerAliases(['docker'], { languageName: 'dockerfile' });
hljs.registerAliases(['make'], { languageName: 'makefile' });
hljs.registerAliases(['ps1'], { languageName: 'powershell' });
hljs.registerAliases(['text', 'txt'], { languageName: 'plaintext' });

export interface ParseOptions {
    /** Resolve a relative image path to a displayable URI */
    resolveImageUri?: (relativePath: string) => string;
    /** Kroki server URL (e.g. https://kroki.io) — empty/undefined disables Kroki rendering */
    krokiServerUrl?: string;
}

/**
 * Code-block languages routed through Kroki (https://docs.kroki.io/kroki/).
 * Maps the markdown info string the user types to Kroki's diagram type
 * segment in the URL.
 */
const KROKI_LANG_MAP: Record<string, string> = {
    plantuml: 'plantuml',
    puml: 'plantuml',
    'c4-plantuml': 'c4plantuml',
    c4plantuml: 'c4plantuml',
    d2: 'd2',
    graphviz: 'graphviz',
    dot: 'graphviz',
    blockdiag: 'blockdiag',
    seqdiag: 'seqdiag',
    actdiag: 'actdiag',
    nwdiag: 'nwdiag',
    rackdiag: 'rackdiag',
    packetdiag: 'packetdiag',
    bpmn: 'bpmn',
    bytefield: 'bytefield',
    erd: 'erd',
    excalidraw: 'excalidraw',
    nomnoml: 'nomnoml',
    pikchr: 'pikchr',
    structurizr: 'structurizr',
    svgbob: 'svgbob',
    tikz: 'tikz',
    umlet: 'umlet',
    vega: 'vega',
    vegalite: 'vegalite',
    'vega-lite': 'vegalite',
    wavedrom: 'wavedrom',
    wireviz: 'wireviz',
    diagramsnet: 'diagramsnet',
    ditaa: 'ditaa',
    mscgen: 'mscgen',
    symbolator: 'symbolator',
};

/**
 * Encode diagram source for Kroki's GET endpoint: zlib deflate + base64url.
 * Kroki requires zlib-wrapped deflate (with the 2-byte header), not raw
 * deflate — deflateRawSync produces output Kroki rejects as "Unable to
 * decode the source." https://docs.kroki.io/kroki/setup/encode-diagram/
 */
function encodeKrokiSource(source: string): string {
    const compressed = zlib.deflateSync(Buffer.from(source, 'utf8'), { level: 9 });
    return compressed
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Preprocess Material for MkDocs admonition syntax to HTML <details>.
 *
 *   ???  type "Title"   collapsed
 *   ???+ type "Title"   open
 *       <4-space indented body>
 *
 * Body is dedented and re-fed to marked so inner markdown still renders.
 * Skipped inside fenced code blocks.
 */
function preprocessAdmonitions(content: string): string {
    const lines = content.split('\n');
    const out: string[] = [];
    let inFence = false;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Track fenced code blocks (``` or ~~~) so we don't touch their content
        if (line.match(/^(`{3,}|~{3,})/)) {
            inFence = !inFence;
            out.push(line);
            i++;
            continue;
        }
        if (inFence) {
            out.push(line);
            i++;
            continue;
        }

        // Match: ???  [type]  ["title"]   or   ???+ [type] ["title"]
        const m = line.match(/^(\?\?\?\+?)\s*(?:(\w+))?\s*(?:"([^"]*)")?\s*$/);
        if (m) {
            const marker = m[1];
            const type = m[2] || '';
            const rawTitle = m[3];
            const isOpen = marker === '???+';

            // Default the summary to the type word (capitalised) if no title given
            const summary = rawTitle !== undefined
                ? rawTitle
                : (type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Details');

            // Collect indented body (4-space indent)
            const body: string[] = [];
            i++;
            while (i < lines.length) {
                const next = lines[i];
                if (next.trim() === '') {
                    body.push('');
                    i++;
                    continue;
                }
                if (next.startsWith('    ')) {
                    body.push(next.slice(4));
                    i++;
                    continue;
                }
                break;
            }

            // Strip trailing blank lines from body
            while (body.length > 0 && body[body.length - 1] === '') body.pop();

            const typeClass = type ? ` class="admonition admonition-${type}"` : ' class="admonition"';
            out.push(`<details${isOpen ? ' open' : ''}${typeClass}>`);
            out.push(`<summary>${escapeHtml(summary)}</summary>`);
            out.push('');
            out.push(...body);
            out.push('');
            out.push('</details>');
            out.push('');
            continue;
        }

        out.push(line);
        i++;
    }

    return out.join('\n');
}

/** Strip all <details>/<summary> tags. If nothing else tag-like remains, the HTML is safe to pass through. */
function isDetailsHtmlBlock(html: string): boolean {
    const stripped = html.replace(
        /<\/?(?:details|summary)(?:\s+open(?:="[^"]*")?)?(?:\s+class="[^"]*")?(?:\s+open(?:="[^"]*")?)?\s*>/gi,
        ''
    );
    return !/[<>]/.test(stripped);
}

export function parseMarkdown(content: string, opts: ParseOptions = {}): string {
    // Convert ???/???+ admonition syntax to <details> before any other processing
    content = preprocessAdmonitions(content);

    const renderer = new Renderer();

    // Build heading line map for data-line attributes
    const headingLines: Map<string, number> = new Map();
    const lines = content.split('\n');
    let inFenced = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.match(/^(`{3,}|~{3,})/)) { inFenced = !inFenced; continue; }
        if (inFenced) continue;
        const m = line.match(/^(#{1,6})\s+(.+)$/);
        if (m) {
            const key = m[1].length + ':' + m[2].trim();
            if (!headingLines.has(key)) {
                headingLines.set(key, i);
            }
        }
    }
    const headingUsed: Map<string, number> = new Map();

    renderer.heading = (text: string, level: number, _raw: string): string => {
        const key = level + ':' + text;
        const count = headingUsed.get(key) || 0;
        headingUsed.set(key, count + 1);
        // Find the Nth occurrence
        let found = 0;
        let lineNum = 0;
        for (const [k, v] of headingLines) {
            if (k === key) {
                if (found === count) { lineNum = v; break; }
                found++;
            }
        }
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        return `<h${level} id="${id}" data-line="${lineNum}">${text}</h${level}>\n`;
    };

    // Track mermaid-scale comments — next mermaid block uses this scale
    let pendingMermaidScale = '';

    // Handle pagebreak and mermaid-scale comments, allow <details>/<summary>,
    // sanitize everything else
    renderer.html = (html: string): string => {
        const trimmed = html.trim();
        if (trimmed === '<!-- pagebreak -->') {
            return '<div style="break-before: page; page-break-before: always;"></div>';
        }
        const scaleMatch = trimmed.match(/^<!--\s*mermaid-scale:\s*(\d+)%?\s*-->$/);
        if (scaleMatch) {
            pendingMermaidScale = scaleMatch[1];
            return ''; // consumed, don't render
        }
        // Allow <details>/<summary> blocks through (either authored directly
        // or generated by the ??? admonition preprocessor)
        if (isDetailsHtmlBlock(trimmed)) {
            return html;
        }
        return escapeHtml(html);
    };

    renderer.code = (code: string, infostring: string | undefined, _escaped: boolean): string => {
        const lang = (infostring || '').trim().toLowerCase();
        if (lang === 'mermaid') {
            const scale = pendingMermaidScale || '100';
            pendingMermaidScale = '';
            // Encode source as data attribute so updateContent can match by content
            // (instead of fragile index-based matching, which breaks when blocks
            // are added/removed/reordered or their content edited)
            const encodedSource = encodeURIComponent(code);
            return `<div class="mermaid" data-scale="${scale}" data-source="${encodedSource}">${code}</div>`;
        }
        // Kroki — route PlantUML / D2 / Graphviz / etc. through the Kroki
        // rendering server. Encoded as zlib-deflate + base64url per Kroki spec.
        const krokiType = KROKI_LANG_MAP[lang];
        if (krokiType && opts.krokiServerUrl) {
            const server = opts.krokiServerUrl.replace(/\/$/, '');
            const encoded = encodeKrokiSource(code);
            const url = `${server}/${krokiType}/svg/${encoded}`;
            return `<div class="kroki-diagram" data-kroki-type="${krokiType}"><img src="${url}" alt="${krokiType} diagram" loading="lazy"></div>`;
        }
        let highlighted: string;
        if (lang && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(code, { language: lang }).value;
        } else {
            // Skip expensive auto-detection, use plain text
            highlighted = escapeHtml(code);
        }
        return `<pre><code class="hljs language-${lang || 'plaintext'}">${highlighted}</code></pre>\n`;
    };

    renderer.image = (href: string | null, title: string | null, text: string): string => {
        let src = href || '';
        if (src && !src.match(/^(https?:\/\/|data:)/) && opts.resolveImageUri) {
            src = opts.resolveImageUri(src);
        }
        const titleAttr = title ? ` title="${title}"` : '';
        return `<img src="${src}" alt="${text || ''}"${titleAttr}>`;
    };

    renderer.link = (href: string | null, title: string | null, text: string): string => {
        const safeHref = href || '#';
        const titleAttr = title ? ` title="${title}"` : '';
        return `<a href="${safeHref}"${titleAttr}>${text}</a>`;
    };

    marked.setOptions({
        renderer,
        gfm: true,
        breaks: false,
    });

    return marked.parse(content) as string;
}

export interface TocItem {
    level: number;
    text: string;
    line: number;
}

export function parseToc(content: string, maxLevel: number = 6): TocItem[] {
    const lines = content.split('\n');
    const items: TocItem[] = [];
    let inFencedBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const text = lines[i].trimEnd();

        // Track fenced code blocks (``` or ~~~) and $$ math blocks
        if (text.match(/^(`{3,}|~{3,})/)) {
            inFencedBlock = !inFencedBlock;
            continue;
        }
        if (text.match(/^\$\$\s*$/)) {
            inFencedBlock = !inFencedBlock;
            continue;
        }
        if (inFencedBlock) continue;

        // ATX headings (# Heading)
        const atxMatch = text.match(/^(#{1,6})\s+(.+)$/);
        if (atxMatch) {
            const level = atxMatch[1].length;
            if (level <= maxLevel) {
                items.push({ level, text: atxMatch[2].trim(), line: i });
            }
            continue;
        }

        // Setext headings (Heading\n=== or Heading\n---)
        if (i > 0) {
            const prevText = lines[i - 1].trim();
            if (prevText && !prevText.match(/^(#{1,6})\s/)) {
                if (text.match(/^=+$/)) {
                    items.push({ level: 1, text: prevText, line: i - 1 });
                } else if (text.match(/^-+$/) && text.length >= 2) {
                    items.push({ level: 2, text: prevText, line: i - 1 });
                }
            }
        }
    }

    return items;
}
