import { getLanguage, localText, t } from './i18n.js';
import { catalogEntryUrl } from './model.js';
import { recentUpdates } from './updates-model.js';

const section = document.getElementById('recent-updates');
const list = document.getElementById('recent-updates-list');
let updates = [];

function render() {
    list.replaceChildren();
    for (const update of updates) {
        const row = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'update-card';
        link.href = catalogEntryUrl(update.category, update.targetId, getLanguage());
        link.dataset.siteLink = '';
        const metadata = document.createElement('div');
        metadata.className = 'update-meta';
        const time = document.createElement('time');
        time.dateTime = update.updatedAt;
        time.textContent = new Intl.DateTimeFormat(getLanguage() === 'ja' ? 'ja-JP' : 'en-US', {
            year: 'numeric', month: 'short', day: 'numeric', timeZone: getLanguage() === 'ja' ? 'Asia/Tokyo' : 'UTC'
        }).format(new Date(update.updatedAt));
        const content = document.createElement('div');
        content.className = 'update-content';
        const label = document.createElement('span');
        label.className = 'update-kind';
        label.textContent = update.changes.map(change => t(`update-${change === 'added' ? `${update.category}-added` : change}`)).join(' · ');
        metadata.append(time, label);
        const title = document.createElement('span');
        title.className = 'update-title';
        title.textContent = update.title;
        content.append(title);
        const eventName = localText(update.event);
        if (eventName) {
            const event = document.createElement('span');
            event.className = 'update-event';
            event.textContent = eventName;
            content.append(' ', event);
        }
        link.append(metadata, content);
        row.append(link);
        list.append(row);
    }
    section.hidden = updates.length === 0;
}

async function load() {
    try {
        const response = await fetch('./databases/updates.json');
        if (response.ok) updates = recentUpdates(await response.json());
    } catch { /* The optional news section does not block the home page. */ }
    render();
}

if (section && list) {
    document.addEventListener('languagechange', render);
    load();
}
