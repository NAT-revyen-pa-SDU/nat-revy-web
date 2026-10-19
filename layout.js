// Fælles for alle sider: indsætter navbar, footer og logoet, markerer den aktuelle side og styrer mobilmenuen

// Logoet består af tre lag (ringe, ikoner og masker), så ikonerne kan kredse og maskerne hoppe.
// Siderne skriver bare <span class="logo-mark"></span>, og lagene sættes ind her.
const LOGO_LAYERS =
    '<img src="images/logo/ringe.svg" alt="" width="536" height="613">' +
    '<img class="logo-icons" src="images/logo/ikoner.svg" alt="" width="536" height="613">' +
    '<img class="logo-masks" src="images/logo/masker.svg" alt="" width="536" height="613">';
const fillLogos = () => document.querySelectorAll('.logo-mark:empty').forEach(mark => mark.innerHTML = LOGO_LAYERS);
fillLogos();

// Runde logo-mærker popper frem, når de kommer i syne, og animeres ved tryk
document.querySelectorAll('.logo-badge').forEach(badge => {
    badge.classList.add('pop');
    new IntersectionObserver(([entry], observer) => {
        if (!entry.isIntersecting) return;
        badge.classList.add('in');
        observer.disconnect();
    }, {threshold: 0.6}).observe(badge);
    badge.addEventListener('click', () => {
        badge.classList.remove('spin');
        void badge.offsetWidth;   // genstart animationen
        badge.classList.add('spin');
    });
    badge.addEventListener('animationend', () => badge.classList.remove('spin'));
});

(async () => {
    const [navbar, footer] = await Promise.all(['navbar.html', 'footer.html'].map(f => fetch(f).then(r => r.text())));
    document.getElementById('navbar').innerHTML = navbar;
    document.getElementById('footer').innerHTML = footer;
    fillLogos();

    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll(`#navbar a[href="${page}"]`).forEach(a => {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
    });

    const button = document.getElementById('hamburger'), menu = document.getElementById('mobileMenu');
    const toggle = open => {
        menu.classList.toggle('active', open);
        button.setAttribute('aria-expanded', open);
        button.textContent = open ? '✕' : '☰';
    };
    button.addEventListener('click', () => toggle(!menu.classList.contains('active')));
    document.addEventListener('keydown', e => e.key === 'Escape' && toggle(false));
})();
