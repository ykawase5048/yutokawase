import { getLanguage, t } from './i18n.js';

export async function initFooter() {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.hidden = true;
    const content = document.createElement('p');
    content.className = 'container';
    const label = document.createElement('span');
    label.dataset.i18n = 'lastUpdated';
    label.textContent = t('lastUpdated');
    const time = document.createElement('time');
    content.append(label, ' ', time);
    footer.append(content);
    document.body.append(footer);

    try {
        // Use the published home page for one site-wide date, including JSON-only updates.
        const response = await fetch('/', { method: 'HEAD', cache: 'no-cache' });
        const modified = response.headers.get('Last-Modified');
        if (!response.ok || !modified) return;
        const publishedAt = new Date(modified);
        if (Number.isNaN(publishedAt.getTime())) return;
        time.dateTime = publishedAt.toISOString();
        function renderDate() {
            const japanese = getLanguage() === 'ja';
            time.textContent = new Intl.DateTimeFormat(japanese ? 'ja-JP' : 'en-US', {
                year: 'numeric', month: 'long', day: 'numeric',
                timeZone: japanese ? 'Asia/Tokyo' : 'UTC'
            }).format(publishedAt);
        }
        renderDate();
        document.addEventListener('languagechange', renderDate);
        footer.hidden = false;
    } catch {
        // Leave the date hidden if publication metadata is unavailable.
    }
}
