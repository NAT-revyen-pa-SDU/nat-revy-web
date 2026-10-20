// Forsiden: sæsonens program (banneret med næste arrangement udfyldes af events.js)

// Sæsonens program bruger de samme faser som årshjulet (Season i events.js): navn og periode skrives ud herfra,
// og den fase, vi er i nu, markeres
(() => {
    const {PHASES, seasonOf, phaseStart, phaseEnd, phaseOf} = window.Season;
    const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
    const d = new Date(), today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), year = seasonOf(today);

    function span(i) {   // fx "Februar til april" eller "April og maj"
        const a = new Date(phaseStart(i, year)).getUTCMonth(), b = new Date(phaseEnd(i, year) - 864e5).getUTCMonth();
        const text = a === b ? MONTHS[a] : (b - a + 12) % 12 === 1 ? `${MONTHS[a]} og ${MONTHS[b]}` : `${MONTHS[a]} til ${MONTHS[b]}`;
        return text[0].toUpperCase() + text.slice(1);
    }

    document.querySelectorAll('.program-list li[data-phase]').forEach(li => {
        const i = +li.dataset.phase;
        li.querySelector('strong').textContent = PHASES[i][0];
        li.querySelector('.program-when').textContent = span(i);
        if (i === phaseOf(today)) {
            li.classList.add('is-current');
            li.querySelector('strong').insertAdjacentHTML('afterend', ' <span class="skew-tag">Nu</span>');
        }
    });
})();
