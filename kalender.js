// Kalenderen: årshjul og liste over sæsonens arrangementer (data hentes via events.js)
(() => {
    const DAY = 864e5, TAU = Math.PI * 2, SEASON_START = 10;   // sæsonen starter i november (0 = januar)
    const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
    const BREAKS = [['Juleferie', 11, 20, 0, 4], ['Sommerferie', 6, 1, 7, 31]];   // universitetets ferier: [navn, fra måned, dag, til måned, dag]
    const R = {out: 384, moIn: 344, catOut: 334, catIn: 112, center: 100, gap: 5};   // radier i hjulet
    const $ = id => document.getElementById(id);
    const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
    const now = new Date(), TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const seasonOf = t => { const d = new Date(t); return d.getUTCMonth() >= SEASON_START ? d.getUTCFullYear() : d.getUTCFullYear() - 1; };

    let acts = [], rings = [], seasons = [], sel = null;
    const hidden = new Set(), breaks = [];
    let view = matchMedia('(max-width: 680px)').matches ? 'list' : 'wheel';
    let season = seasonOf(TODAY);

    for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) {
        for (const [title, m0, d0, m1, d1] of BREAKS) {
            breaks.push({id: `f${y}-${m0}`, title, ring: 'Ferie', kind: 'ferie', start: Date.UTC(y, m0, d0), end: Date.UTC(m1 < m0 ? y + 1 : y, m1, d1)});
        }
    }

    /* Data fra Google Sheets (se events.js) */
    async function load() {
        try {
            acts = await loadEvents();
            rings = [...new Set(acts.map(a => a.ring))];
            // Året vælges ud fra arkets datoer: det med den næste aktivitet, ellers det seneste. Senere år kan ikke vælges.
            const all = [...new Set(acts.map(a => seasonOf(a.start)))].sort((a, b) => a - b);
            const next = acts.filter(a => a.end >= TODAY).sort((a, b) => a.start - b.start)[0];
            season = next ? seasonOf(Math.max(next.start, TODAY)) : all.at(-1) ?? season;
            seasons = all.filter(y => y < season).concat(season);
            $('status').hidden = true;
        } catch (e) {
            $('status').textContent = 'Kunne ikke hente datoerne. Prøv at genindlæse siden.';
        }
        render();
        const hjul = document.querySelector('.hjul');   // hjulet toner ind, første gang det vises
        hjul.classList.replace('loading', 'intro');
        setTimeout(() => hjul.classList.remove('intro'), 1500);
    }

    /* Hjælpere */
    const color = ring => ring === 'Ferie' ? 'var(--c-ferie)' : `var(--c${rings.indexOf(ring) % 6 + 1})`;
    const within = (a, S, E) => a.end >= S && a.start < E;
    const monthOnly = a => {   // foreløbig og hele én måned: vises som "i oktober"
        const s = new Date(a.start), e = new Date(a.end);
        return a.tbc && s.getUTCDate() === 1 && new Date(a.end + DAY).getUTCDate() === 1 && s.getUTCMonth() === e.getUTCMonth();
    };
    const fmtDay = t => `${new Date(t).getUTCDate()}. ${MONTHS[new Date(t).getUTCMonth()].slice(0, 3)}`;
    function fmtWhen(a) {
        const s = new Date(a.start), e = new Date(a.end);
        if (monthOnly(a)) return 'i ' + MONTHS[s.getUTCMonth()];
        if (a.start === a.end) return fmtDay(a.start);
        return s.getUTCMonth() === e.getUTCMonth() ? `${s.getUTCDate()}.–${fmtDay(a.end)}` : `${fmtDay(a.start)} – ${fmtDay(a.end)}`;
    }
    const metaOf = a => [fmtWhen(a), a.time && 'kl. ' + a.time, a.place].filter(Boolean).join(' · ');
    const seasonLabel = () => `${season}/${String(season + 1).slice(2)}`;
    function countdown(show) {
        const n = Math.round((show.start - TODAY) / DAY);
        return n > 1 ? `Premiere om ${n} dage` : n === 1 ? 'Premiere i morgen!' : TODAY <= show.end ? 'Forestilling i dag!' : `Forestilling ${fmtWhen(show)}`;
    }

    /* Hjulet */
    const P = (r, a) => [(r * Math.sin(a)).toFixed(1), (-r * Math.cos(a)).toFixed(1)];   // 0 = kl. 12, med uret
    const A = t => {   // vinkel for en dato, som på et ur: januar går fra kl. 12 til kl. 1, december fra kl. 11 til kl. 12
        const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth(), m0 = Date.UTC(y, m, 1);
        return ((y - season) * 12 + m + (t - m0) / (Date.UTC(y, m + 1, 1) - m0)) * TAU / 12;
    };
    function sector(r0, r1, a0, a1) {   // ringstykke mellem to radier og to vinkler
        a1 = Math.min(a1, a0 + TAU - 1e-3);
        const L = a1 - a0 > Math.PI ? 1 : 0, [x0, y0] = P(r1, a0), [x1, y1] = P(r1, a1), [x2, y2] = P(r0, a1), [x3, y3] = P(r0, a0);
        return `M${x0} ${y0}A${r1} ${r1} 0 ${L} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${L} 0 ${x3} ${y3}Z`;
    }

    function wheel(S, E, items) {
        let bg = '', under = '', lines = '', marks = '';
        for (let m = 0; m < 12; m++) {
            const t0 = Date.UTC(season, SEASON_START + m, 1), t1 = Date.UTC(season, SEASON_START + m + 1, 1), cur = TODAY >= t0 && TODAY < t1;
            const [x, y] = P((R.out + R.moIn) / 2, (A(t0) + A(t1)) / 2), [lx, ly] = P(R.out, A(t0));
            bg += `<path class="mo${cur ? ' cur' : m % 2 ? ' alt' : ''}" d="${sector(R.moIn, R.out, A(t0), A(t1))}"/>
                <text class="ml${cur ? ' cur' : ''}" x="${x}" y="${y}">${MONTHS[new Date(t0).getUTCMonth()].slice(0, 3).toUpperCase()}</text>`;
            lines += `<line class="div${m ? '' : ' seam'}" x2="${lx}" y2="${ly}"/>`;
        }

        for (const b of items.filter(a => a.kind === 'ferie' && within(a, S, E))) {   // ferier skraveres hen over ringene
            under += `<path class="brk" data-id="${b.id}" aria-label="${b.title}" d="${sector(R.catIn, R.catOut, A(Math.max(b.start, S)), A(Math.min(b.end + DAY, E)))}"/>`;
        }

        const shown = rings.filter(r => !hidden.has(r)), band = (R.catOut - R.catIn - R.gap * (shown.length - 1)) / shown.length;
        shown.forEach((ring, i) => {
            const r1 = R.catOut - i * (band + R.gap), lanes = [];
            bg += `<circle class="ring" r="${r1 - band / 2}" stroke-width="${band}"/>`;
            const placed = items.filter(a => a.ring === ring && within(a, S, E)).map(a => {   // overlappende aktiviteter fordeles i baner
                const s = Math.max(a.start, S), e = Math.min(a.end + DAY, E);
                let lane = lanes.findIndex(end => end <= s);
                if (lane < 0) lane = lanes.push(0) - 1;
                lanes[lane] = e + (a.start === a.end ? 2 * DAY : 0);   // prikker får lidt luft
                return {a, s, e, lane};
            });
            const lt = band / Math.max(1, lanes.length);
            for (const {a, s, e, lane} of placed) {
                const lr1 = r1 - lane * lt, lr0 = lr1 - lt;
                const attrs = `class="act${a.tbc ? ' tbc' : ''}${sel === a.id ? ' sel' : ''}" data-id="${a.id}" aria-label="${esc(a.title + ', ' + fmtWhen(a))}" style="--c:${color(ring)}"`;
                if (a.start === a.end) {
                    const [cx, cy] = P((lr0 + lr1) / 2, A(s + DAY / 2));
                    marks += `<circle ${attrs} cx="${cx}" cy="${cy}" r="${Math.min(7, Math.max(3.5, lt * .3))}"/>`;
                } else marks += `<path ${attrs} d="${sector(lr0 + 1, lr1 - 1, A(s), A(e))}"/>`;
                if (a.kind === 'forestilling') {   // forestillinger fremhæves med en kile og en stjerne
                    const [x, y] = P((R.out + R.moIn) / 2, (A(s) + A(e)) / 2);
                    under += `<path class="wedge" d="${sector(R.center, R.out, A(s), A(e))}"/>`;
                    marks += `<text class="star" x="${x}" y="${y}">★</text>`;
                }
            }
        });

        if (TODAY >= S && TODAY < E) {
            const [x, y] = P(R.out + 4, A(TODAY + DAY / 2));
            marks += `<line class="today" x2="${x}" y2="${y}"/><circle class="today-dot" cx="${x}" cy="${y}" r="5"/>`;
        }
        const show = acts.find(a => a.kind === 'forestilling' && within(a, S, E));
        return `<svg viewBox="-394 -394 788 788" role="img" aria-label="Årshjul for sæson ${seasonLabel()}"${sel !== null ? ' class="has-sel"' : ''}>
            <defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="7" fill="rgba(255,255,255,.13)"/></pattern></defs>
            ${bg}${under}${lines}${marks}<circle class="center" r="${R.center}"/>
            <text class="cy" y="-4">${seasonLabel()}</text><text class="cs" y="28">${show ? countdown(show) : ''}</text></svg>`;
    }

    /* Listerne */
    function item(a) {
        const d = new Date(a.start), kind = ['forestilling', 'deadline', 'ferie'].includes(a.kind) ? ' is-' + a.kind : '';
        const tags = [a.kind === 'forestilling' && 'Forestilling', a.kind === 'deadline' && 'Deadline', a.tbc && 'Foreløbig'].filter(Boolean).join(' · ');
        return `<li><button type="button" class="ev${kind}${a.end < TODAY ? ' past' : ''}${sel === a.id ? ' sel' : ''}" data-id="${a.id}" style="--c:${color(a.ring)}">
            <time><b>${monthOnly(a) ? '?' : d.getUTCDate()}</b>${MONTHS[d.getUTCMonth()].slice(0, 3)}</time>
            <span><strong>${esc(a.title)}</strong><small>${esc(metaOf(a))}</small>${a.note ? `<small>${esc(a.note)}</small>` : ''}${tags ? `<em>${tags}</em>` : ''}</span>
        </button></li>`;
    }

    function list(items) {
        if (!items.length) return acts.length ? '<p class="hjul-status">Ingen aktiviteter</p>' : '';
        let o = '', last = '';
        for (const a of items) {
            const d = new Date(a.start), mh = `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
            if (mh !== last) { o += `<li class="hl-month">${mh}</li>`; last = mh; }
            o += item(a);
        }
        return `<ul class="hjul-list">${o}</ul>`;
    }

    function banner() {   // den næste forestilling øverst på siden
        const show = acts.filter(a => a.kind === 'forestilling' && a.end >= TODAY).sort((a, b) => a.start - b.start)[0];
        return show ? `<div><span>Næste forestilling</span><strong>${fmtWhen(show)} ${new Date(show.start).getUTCFullYear()}</strong>
            <small>${esc([show.time && 'kl. ' + show.time, show.place, show.note].filter(Boolean).join(' · '))}</small></div><b>${countdown(show)}</b>` : '';
    }

    function render() {
        const S = Date.UTC(season, SEASON_START, 1), E = Date.UTC(season + 1, SEASON_START, 1);
        const items = [...acts, ...breaks].filter(a => !hidden.has(a.ring)).sort((a, b) => a.start - b.start || a.end - b.end);
        const last = Date.UTC(seasons.at(-1) + 1, SEASON_START, 1), i = seasons.indexOf(season);   // kalenderen stopper med det sidste år, der kan vælges
        document.querySelector('.hjul').dataset.view = view;
        $('label').textContent = seasonLabel();
        $('prev').disabled = i <= 0;
        $('next').disabled = i < 0 || i === seasons.length - 1;
        $('prev').hidden = $('next').hidden = seasons.length < 2;
        $('view').innerHTML = view === 'wheel' ? wheel(S, E, items) : list(items.filter(a => a.end >= TODAY && a.start < last));
        $('list').innerHTML = view === 'wheel' ? list(items.filter(a => within(a, S, E))) : '';
        $('show').innerHTML = banner();
        $('show').hidden = !$('show').innerHTML;
        $('filters').innerHTML = [...rings, 'Ferie'].map(r =>
            `<button type="button" class="chip" data-ring="${esc(r)}" aria-pressed="${!hidden.has(r)}"><i style="background:${color(r)}"></i>${esc(r)}</button>`).join('');
        document.querySelectorAll('.hjul-tabs [data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === view));
    }

    /* Hændelser */
    const step = dir => { season = seasons[seasons.indexOf(season) + dir]; sel = null; render(); };
    $('prev').onclick = () => step(-1);
    $('next').onclick = () => step(1);
    document.querySelectorAll('.hjul-tabs [data-view]').forEach(b => b.onclick = () => { view = b.dataset.view; render(); });
    $('filters').addEventListener('click', e => {   // vis/skjul en ring
        const b = e.target.closest('[data-ring]');
        if (!b) return;
        if (hidden.has(b.dataset.ring)) hidden.delete(b.dataset.ring);
        else hidden.add(b.dataset.ring);
        render();
    });

    const layout = document.querySelector('.hjul-layout'), tip = $('tip');
    layout.addEventListener('click', e => {   // vælg en aktivitet i hjulet eller listen
        const el = e.target.closest('[data-id]');
        if (!el) return;
        sel = sel === el.dataset.id ? null : el.dataset.id;
        render();
        if (sel !== null && el.closest('svg')) document.querySelector(`#list [data-id="${sel}"]`)?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
    });
    layout.addEventListener('pointerover', e => {   // fremhæv samme aktivitet i hjul og liste, og vis detaljer i hjulet
        const el = e.target.closest('[data-id]');
        layout.querySelectorAll('.hov').forEach(x => x.classList.remove('hov'));
        tip.hidden = true;
        if (!el) return;
        layout.querySelectorAll(`[data-id="${el.dataset.id}"]`).forEach(x => x.classList.add('hov'));
        if (!el.closest('svg') || e.pointerType === 'touch') return;
        const a = [...acts, ...breaks].find(x => x.id === el.dataset.id);
        tip.innerHTML = `<b>${esc(a.title)}</b><span>${esc(metaOf(a))}</span>`;
        tip.hidden = false;
        moveTip(e);
    });
    const moveTip = e => { tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = e.clientY + 14 + 'px'; };
    layout.addEventListener('pointermove', e => tip.hidden || moveTip(e));
    layout.addEventListener('pointerleave', () => { tip.hidden = true; layout.querySelectorAll('.hov').forEach(x => x.classList.remove('hov')); });

    render();
    load();
})();
