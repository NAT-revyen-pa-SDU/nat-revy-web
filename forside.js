// Forsiden: banner med næste arrangement og en liste over månedens arrangementer (data hentes via events.js)
(async () => {
    const DAY = 864e5;
    const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
    const DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
    const now = new Date(), TODAY = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const monthOnly = a => a.tbc && new Date(a.start).getUTCDate() === 1 && new Date(a.end + DAY).getUTCDate() === 1;   // "i oktober" uden fast dato
    const $ = id => document.getElementById(id);

    let events;
    try {
        events = (await loadEvents()).filter(a => a.end >= TODAY && !monthOnly(a)).sort((a, b) => a.start - b.start);
    } catch (e) {
        return;   // uden data vises banner og månedsliste bare ikke
    }

    // Dag og dato, fx "torsdag 12. november", "i morgen" eller "1.–3. oktober"
    function when(a) {
        const s = new Date(a.start), e = new Date(a.end);
        if (a.end > a.start) {
            return s.getUTCMonth() === e.getUTCMonth()
                ? `${s.getUTCDate()}.–${e.getUTCDate()}. ${MONTHS[e.getUTCMonth()]}`
                : `${s.getUTCDate()}. ${MONTHS[s.getUTCMonth()]} – ${e.getUTCDate()}. ${MONTHS[e.getUTCMonth()]}`;
        }
        return a.start === TODAY ? 'i dag' : a.start === TODAY + DAY ? 'i morgen' : `${DAYS[s.getUTCDay()]} ${s.getUTCDate()}. ${MONTHS[s.getUTCMonth()]}`;
    }
    const place = a => a.place && !a.place.includes('?') ? a.place : '';

    // Banneret i toppen: "Intromøde, torsdag 12. november kl. 16.15 på SDU"
    const next = events[0];
    if (next) {
        let text = `${next.title}, ${when(next)}`;
        if (next.time) text += ' kl. ' + next.time;
        if (place(next)) text += ' på ' + place(next);
        if (next.tbc) text += ' (foreløbig dato)';
        $('nextEvent').querySelector('.next-event-text').textContent = text;
        $('nextEvent').hidden = false;
    }

    // Månedens arrangementer: resten af denne måned, eller næste måned, når der er under en uge tilbage, eller der ikke sker mere i denne måned
    const y = now.getFullYear(), m = now.getMonth();
    const within = (a, month) => a.start < Date.UTC(y, month + 1, 1) && a.end >= Date.UTC(y, month, 1);
    const month = (Date.UTC(y, m + 1, 1) - TODAY) / DAY <= 7 || !events.some(a => within(a, m)) ? m + 1 : m;
    const list = events.filter(a => within(a, month)).slice(0, 6);
    if (!list.length) return;

    $('monthKicker').textContent = month === m ? 'Denne måned' : 'Næste måned';
    $('monthTitle').textContent = 'Sker i ' + MONTHS[new Date(Date.UTC(y, month, 1)).getUTCMonth()];
    $('monthList').replaceChildren(...list.map(a => {
        const s = new Date(a.start), li = document.createElement('li');
        li.className = 'month-item';
        li.innerHTML = '<time><b></b><span></span></time><div><strong></strong><small></small></div>';
        li.querySelector('time').dateTime = s.toISOString().slice(0, 10);
        li.querySelector('b').textContent = s.getUTCDate();
        li.querySelector('time span').textContent = MONTHS[s.getUTCMonth()].slice(0, 3);
        li.querySelector('strong').textContent = a.title;
        const day = a.end > a.start ? when(a) : DAYS[s.getUTCDay()];   // datoen står allerede i boksen
        li.querySelector('small').textContent = [day, a.time && 'kl. ' + a.time, place(a)].filter(Boolean).join(' · ');
        return li;
    }));
    $('month').hidden = false;
})();
