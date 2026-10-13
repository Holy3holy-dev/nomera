(function (root) {
    'use strict';
    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
    }
    function jsArg(value) {
        return escapeHtml(JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026'));
    }
    function safeImageUrl(value, fallback, trusted = []) {
        if (typeof value !== 'string') return fallback;
        if (trusted.includes(value)) return value;
        const clean = value.trim();
        if (/^\.?\/[a-zA-Z0-9_\-\.\/]+\.(png|jpe?g|svg|webp|gif)$/i.test(clean)) return clean;
        if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml|pjpeg);base64,[A-Za-z0-9+/=\s]+$/i.test(clean)) {
            return clean.replace(/\s+/g, '');
        }
        if (/^data:image\/svg\+xml;(?:utf8|charset=utf-8),[A-Za-z0-9%_\-.<>/='\"#;:& ]+$/i.test(clean) && !/[<"'](?:script|object|embed)/i.test(clean)) return clean;
        try {
            const url = new URL(clean);
            if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
        } catch (_) { /* Untrusted and invalid URLs are rejected. */ }
        return fallback;
    }
    const api = { escapeHtml, jsArg, safeImageUrl };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.NomeraSecurity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
