// Forsiden: "Sæsonen" får fasernes navne og perioder fra Season i events.js, så de passer med årshjulet,
// og den fase, vi er i nu, markeres. (Boksen med næste arrangement udfyldes af events.js.)
(() => {
    const {PHASES, seasonOf, phaseOf, phaseSpan} = window.Season;
    const d = new Date(), today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), year = seasonOf(today);

    document.querySelectorAll('.program-list li[data-phase]').forEach(li => {
        const i = +li.dataset.phase;
        li.querySelector('strong').textContent = PHASES[i][0];
        const span = phaseSpan(i, year);
        li.querySelector('.program-when').textContent = span[0].toUpperCase() + span.slice(1);
        if (i === phaseOf(today)) {
            li.classList.add('is-current');
            li.querySelector('strong').insertAdjacentHTML('afterend', ' <span class="skew-tag">Nu</span>');
        }
    });
})();
