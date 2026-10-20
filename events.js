// Fælles for forsiden, Tilmeld og kalenderen: sæsonens faser og arrangementerne fra Google Sheets-arket

// Sæsonens faser står her og ikke i arket, fordi de ikke er arrangementer. Hver fase varer, til den næste begynder.
// [navn, startmåned (0 = januar), startdag, kort navn til hjulet, hvis der ikke er plads]
// De bruges i årshjulet (kalender.js) og i "Sæsonen" på forsiden (forside.js), hvis beskrivelser står i index.html.
window.Season = (() => {
    const START = 10;   // sæsonen starter i november (0 = januar)
    const PHASES = [
        ['Opstart', 10, 1],
        ['Skrivning', 1, 1],
        ['Valgaften og roller', 3, 22, 'Valgaften'],
        ['Øvelse', 4, 8],
        ['Intensuge og forestilling', 8, 24, 'Intensuge'],
    ];
    const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
    const seasonOf = t => { const d = new Date(t); return d.getUTCMonth() >= START ? d.getUTCFullYear() : d.getUTCFullYear() - 1; };
    const phaseStart = (i, y) => { const [, m, d] = PHASES[i]; return Date.UTC(m >= START ? y : y + 1, m, d); };
    const phaseEnd = (i, y) => i + 1 < PHASES.length ? phaseStart(i + 1, y) : Date.UTC(y + 1, START, 1);
    const phaseOf = t => { const y = seasonOf(t); return PHASES.findLastIndex((p, i) => phaseStart(i, y) <= t); };
    const phaseSpan = (i, y) => {   // fx "februar til april" eller "april og maj"
        const a = new Date(phaseStart(i, y)).getUTCMonth(), b = new Date(phaseEnd(i, y) - 864e5).getUTCMonth();
        return a === b ? MONTHS[a] : (b - a + 12) % 12 === 1 ? `${MONTHS[a]} og ${MONTHS[b]}` : `${MONTHS[a]} til ${MONTHS[b]}`;
    };
    return {START, PHASES, MONTHS, seasonOf, phaseStart, phaseEnd, phaseOf, phaseSpan};
})();

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
    let cached;   // arket hentes kun én gang pr. side, selvom flere dele af siden beder om det
    window.loadEvents = () => cached ||= fetchEvents();
    async function fetchEvents() {
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
    }

    // Felter med data-next-event viser det næste arrangement, fx "Intromøde, torsdag 12. november kl. 16.15 på SDU".
    // data-rings begrænser til bestemte ringe fra arket (adskilt med komma). Feltet er skjult, indtil der er noget at vise.
    const fields = document.querySelectorAll('[data-next-event]'), monthBox = document.querySelector('[data-month-list]');
    if (!fields.length && !monthBox) return;
    const DAY = 864e5, {MONTHS} = window.Season;
    const DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
    const now = new Date(), TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    function describe(a) {
        const s = new Date(a.start), e = new Date(a.end);
        let text = a.title + ', ';
        if (a.end > a.start) {
            text += s.getUTCMonth() === e.getUTCMonth()
                ? `${s.getUTCDate()}.–${e.getUTCDate()}. ${MONTHS[e.getUTCMonth()]}`
                : `${s.getUTCDate()}. ${MONTHS[s.getUTCMonth()]} – ${e.getUTCDate()}. ${MONTHS[e.getUTCMonth()]}`;
        } else {
            text += a.start === TODAY ? 'i dag' : a.start === TODAY + DAY ? 'i morgen' : `${DAYS[s.getUTCDay()]} ${s.getUTCDate()}. ${MONTHS[s.getUTCMonth()]}`;
        }
        if (a.time) text += ' kl. ' + a.time;
        if (a.place && !a.place.includes('?')) text += ' på ' + a.place;
        return text;
    }

    window.loadEvents().then(events => {
        const coming = events.filter(a => a.end >= TODAY && !a.tbc).sort((a, b) => a.start - b.start);
        fields.forEach(field => {
            const rings = field.dataset.rings ? field.dataset.rings.split(',').map(r => r.trim().toLowerCase()) : null;
            const next = coming.find(a => !rings || rings.includes(a.ring.toLowerCase()));
            if (!next) return;
            field.querySelector('.next-event-text').textContent = describe(next);
            const day = field.querySelector('.next-event-day');   // kun i den lille boks på forsiden
            if (day) {
                const d = new Date(next.start);
                day.textContent = `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
                field.setAttribute('aria-label', 'Næste arrangement: ' + describe(next));
            }
            field.hidden = false;
        });
        if (monthBox) monthList(monthBox, events.filter(a => a.end >= TODAY).sort((a, b) => a.start - b.start));
    }, () => {});   // uden data vises felterne bare ikke

    // "Sker i november": resten af denne måned, eller næste måned, når der er under en uge tilbage, eller der ikke sker mere i denne måned
    function monthList(box, coming) {
        const y = now.getFullYear(), m = now.getMonth();
        coming = coming.filter(a => !(a.tbc && new Date(a.start).getUTCDate() === 1 && new Date(a.end + DAY).getUTCDate() === 1));   // ikke "i oktober" uden fast dato
        const within = (a, month) => a.start < Date.UTC(y, month + 1, 1) && a.end >= Date.UTC(y, month, 1);
        const month = (Date.UTC(y, m + 1, 1) - TODAY) / DAY <= 7 || !coming.some(a => within(a, m)) ? m + 1 : m;
        const items = coming.filter(a => within(a, month)).slice(0, 6);
        if (!items.length) return;
        box.querySelector('.month-kicker').textContent = month === m ? 'Denne måned' : 'Næste måned';
        box.querySelector('.month-title').textContent = 'Sker i ' + MONTHS[new Date(Date.UTC(y, month, 1)).getUTCMonth()];
        box.querySelector('.month-list').replaceChildren(...items.map(a => {
            const s = new Date(a.start), e = new Date(a.end), li = document.createElement('li');
            const day = a.end > a.start ? `${s.getUTCDate()}.–${e.getUTCDate()}. ${MONTHS[e.getUTCMonth()]}` : DAYS[s.getUTCDay()];   // datoen står allerede i boksen
            li.className = 'month-item';
            li.innerHTML = '<time><b></b><span></span></time><div><strong></strong><small></small></div>';
            li.querySelector('time').dateTime = s.toISOString().slice(0, 10);
            li.querySelector('b').textContent = s.getUTCDate();
            li.querySelector('time span').textContent = MONTHS[s.getUTCMonth()].slice(0, 3);
            li.querySelector('strong').textContent = a.title;
            li.querySelector('small').textContent = day + (a.time ? ' kl. ' + a.time : '') + (a.place && !a.place.includes('?') ? ' på ' + a.place : '');
            return li;
        }));
        box.hidden = false;
    }
})();
