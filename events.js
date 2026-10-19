// Fælles for kalenderen og forsiden: henter arrangementerne fra det offentliggjorte Google Sheets-ark
(() => {
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5SpdilTv7s2GWvvAiClUPuui3sTkt4UuG9THOIh6U6T8EyE6bovqo4iAzr5fhmpIgVnrp-6MZ36y-/pub?output=csv';

    function parseCSV(text) {
        const rows = [];
        let row = [], field = '', q = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c; }
            else if (c === '"') q = true;
            else if (c === ',') { row.push(field); field = ''; }
            else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
            else if (c !== '\r') field += c;
        }
        if (field || row.length) { row.push(field); rows.push(row); }
        return rows;
    }

    function toDate(s) {   // 2026-10-01 eller 1.10.2026
        let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) return Date.UTC(m[1], m[2] - 1, m[3]);
        m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
        return m ? Date.UTC(m[3], m[2] - 1, m[1]) : null;
    }

    // Giver arrangementerne i arkets rækkefølge som {id, start, end, title, ring, time, place, note, kind, tbc}.
    // start og end er tidsstempler i UTC ved midnat.
    window.loadEvents = async () => {
        const res = await fetch(SHEET_URL, {cache: 'no-store'});
        if (!res.ok) throw new Error(res.status);
        const [head, ...rows] = parseCSV(await res.text());
        const col = name => head.findIndex(h => h.trim().toLowerCase() === name);
        const cols = Object.fromEntries(['dato', 'til', 'tid', 'begivenhed', 'sted', 'ring', 'type', 'foreløbig', 'note'].map(k => [k, col(k)]));
        return rows.map((r, i) => {
            const get = k => (r[cols[k]] || '').trim(), start = toDate(get('dato'));
            return start !== null && {
                id: 'a' + i, start, end: Math.max(start, toDate(get('til')) ?? start),
                title: get('begivenhed'), ring: get('ring') || 'Andet', time: get('tid'), place: get('sted'), note: get('note'),
                kind: get('type').toLowerCase(), tbc: get('foreløbig').toLowerCase() === 'ja'
            };
        }).filter(Boolean);
    };
})();
