import { initI18n } from './i18n.js';
import { initFooter } from './footer.js';

initI18n();
initAnalytics();
initFooter();

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

nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        menu.focus();
    }
});

document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
});

function initAnalytics() {
    const { protocol, hostname, pathname } = window.location;

    // ローカルでのプレビューや旧 URL の転送途中は計測しない。
    if (
        protocol !== 'https:' ||
        hostname !== 'ykawase5048.github.io' ||
        pathname === '/yutokawase' ||
        pathname.startsWith('/yutokawase/')
    ) {
        return;
    }

    // 同じページ内での重複初期化を防ぐ。
    if (document.getElementById('site-google-tag')) return;

    const measurementId = 'G-TMJBG4BLX5';

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());

    // config が初回の page_view を送信する。
    // 言語・フィルター変更によるページビューは GA4 の管理画面で無効にする。
    window.gtag('config', measurementId);

    const tag = document.createElement('script');
    tag.id = 'site-google-tag';
    tag.async = true;
    tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(tag);
}
