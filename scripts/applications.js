import { localText, t } from './i18n.js';
import { validateApplications } from './model.js';
import { el, externalLink } from './ui.js';

const root = document.getElementById('applications');
const status = document.getElementById('applications-status');
let applications = [];
let state = 'loading';

function render() {
    root.replaceChildren();
    status.replaceChildren();
    root.setAttribute('aria-busy', String(state === 'loading'));
    if (state !== 'ready') {
        status.append(el('p', '', t(state === 'loading' ? 'loading' : 'loadError')));
        if (state === 'error') {
            const retry = el('button', 'resource-link', t('retry'));
            retry.type = 'button';
            retry.addEventListener('click', load);
            status.append(retry);
        }
        return;
    }
    if (!applications.length) status.append(el('p', '', t('applicationsEmpty')));
    for (const application of applications) {
        const entry = el('article', 'application-entry');
        const summary = el('div', 'application-summary');
        const title = localText(application.title);
        const href = localText(application.url);
        const heading = el('h3', 'application-title');
        heading.append(externalLink(title, href));
        summary.append(heading);
        const description = localText(application.description);
        if (description) summary.append(el('p', 'application-description', description));
        const link = externalLink('', href, 'resource-link');
        link.setAttribute('aria-label', `${t('pdf')}: ${title}`);
        const icon = el('img');
        icon.src = './icons/note.svg';
        icon.alt = '';
        icon.width = 16;
        icon.height = 16;
        link.append(icon, document.createTextNode(t('pdf')));
        entry.append(summary, link);
        root.append(entry);
    }
}

async function load() {
    state = 'loading';
    render();
    try {
        const response = await fetch('./databases/applications.json');
        if (!response.ok) throw new Error(`applications: HTTP ${response.status}`);
        const data = await response.json();
        const errors = validateApplications(data.applications);
        if (errors.length) throw new Error(errors.join('\n'));
        applications = data.applications;
        state = 'ready';
    } catch (error) {
        console.error('Application documents loading failed:', error);
        state = 'error';
    }
    render();
}

document.addEventListener('languagechange', render);
load();
