import { initI18n } from './i18n.js';

initI18n();
const menu = document.getElementById('menu-toggle');
const nav = document.getElementById('site-nav');
function closeMenu() {
    menu.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
}
menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
});
nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menu.focus();
    }
});
document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
