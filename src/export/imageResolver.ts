import * as fs from 'fs';
import * as path from 'path';

const MIME_MAP: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
};

/**
 * Build a resolver that converts relative/absolute image paths into
 * `data:` URIs. Used by PDF/Word/Print exports — Puppeteer's
 * `setContent` runs at about:blank which cannot reach file:// resources,
 * and html-to-docx similarly cannot read arbitrary local paths. Embedding
 * the bytes inline sidesteps both problems.
 *
 * Returns the original src untouched for http(s), data:, or unreadable
 * files so the export still produces something sensible.
 */
export function createImageResolver(docDir: string): (src: string) => string {
    return (src: string): string => {
        if (!src) return src;
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
            return src;
        }
        // strip any file:// prefix the author put in source
        const cleaned = src.startsWith('file://') ? src.slice(7) : src;
        const absPath = path.isAbsolute(cleaned) ? cleaned : path.join(docDir, cleaned);
        try {
            const ext = path.extname(absPath).toLowerCase();
            const mime = MIME_MAP[ext];
            if (!mime) return src;
            const data = fs.readFileSync(absPath);
            return `data:${mime};base64,${data.toString('base64')}`;
        } catch {
            return src;
        }
    };
}
