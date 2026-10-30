import { formatDate, resourceHref } from './model.js';
import { getLanguage, localText, t } from './i18n.js';

export function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

export function externalLink(text, href, className = '') {
    const link = el('a', className, text);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
}

const resources = {
    doi: { label: () => 'DOI', icon: 'paper_plane.svg' },
    url: { label: () => 'URL', icon: 'paper_plane.svg' },
    arxiv: { label: () => 'arXiv', icon: 'arxiv-logomark-small.svg' },
    slides: { label: () => t('slides'), icon: 'collection.svg' },
    youtube: { label: () => t('video'), icon: 'youtube.svg' },
    pdf: { label: () => t('pdf'), icon: 'note.svg' },
    'note-jp': { label: () => t('noteJP'), icon: 'note.svg' }
};

export function resourceLinks(buttons = [], paper) {
    const row = el('div', 'resource-links');
    for (const button of buttons) {
        const config = resources[button.type];
        if (!config) continue;
        const href = resourceHref(button, paper);
        const link = href ? externalLink('', href, 'resource-link') : el('span', 'resource-link unavailable');
        if (!href) {
            link.setAttribute('aria-disabled', 'true');
            link.title = t('locked');
        }
        const icon = el('img');
        icon.src = `./icons/${config.icon}`;
        icon.alt = '';
        icon.width = 16;
        icon.height = 16;
        link.append(icon, document.createTextNode(config.label()));
        if (!href) link.append(el('span', 'availability', ` · ${t('locked')}`));
        row.append(link);
    }
    return row;
}

export function tagList(ids, definitions, onSelect) {
    const list = el('div', 'entry-tags');
    for (const id of ids ?? []) {
        const definition = definitions.find(tag => tag.id === id);
        if (!definition) continue;
        const label = localText(definition.label);
        const tag = el(onSelect ? 'button' : 'span', 'tag', label);
        if (onSelect) {
            tag.type = 'button';
            tag.setAttribute('aria-label', `${t('filter')}: ${label}`);
            tag.addEventListener('click', () => onSelect(id));
        }
        list.append(tag);
    }
    return list;
}

export function paperInfo(paper) {
    return paper.publication
        ? `${paper.publication.journal} · ${paper.publication.year}`
        : `${t('preprint')} · ${formatDate(paper.date, getLanguage())}`;
}

export function paperNote(paper, className = 'entry-detail') {
    const paragraph = el('p', className);
    const note = localText(paper.note);
    for (const part of Array.isArray(note) ? note : [note]) {
        if (typeof part === 'string') paragraph.append(document.createTextNode(part));
        else if (part?.text) paragraph.append(part.url
            ? externalLink(localText(part.text), localText(part.url))
            : document.createTextNode(localText(part.text)));
    }
    return paragraph;
}

export function createPaperPreview() {
    const popup = el('div', 'paper-preview');
    popup.id = 'paper-preview';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-labelledby', 'paper-preview-title');
    popup.hidden = true;
    document.body.append(popup);
    let activeLink = null;
    function hide() {
        activeLink?.removeAttribute('aria-describedby');
        activeLink?.setAttribute('aria-expanded', 'false');
        activeLink = null;
        popup.hidden = true;
        if (popup.parentElement !== document.body) document.body.append(popup);
    }
    function show(link, paper, tags) {
        hide();
        activeLink = link;
        const title = el('p', 'preview-title', paper.title);
        title.id = 'paper-preview-title';
        popup.replaceChildren(title, el('p', 'entry-meta', paperInfo(paper)));
        if (paper.publication) popup.append(el('p', 'entry-meta', `${t('firstPosted')} · ${formatDate(paper.date, getLanguage())}`));
        const note = paperNote(paper, 'entry-meta');
        if (note.textContent) popup.append(note);
        popup.append(tagList(paper.tags, tags));
        // Place links in the preview immediately after its trigger in the tab order.
        link.after(popup);
        popup.hidden = false;
        link.setAttribute('aria-describedby', popup.id);
        link.setAttribute('aria-expanded', 'true');
        const rect = link.getBoundingClientRect();
        const width = popup.offsetWidth;
        const height = popup.offsetHeight;
        const left = Math.max(12, Math.min(rect.left, innerWidth - width - 12));
        // Touch the link's edge so moving into the popup does not cross a dead zone.
        const top = rect.bottom + height <= innerHeight - 12 ? rect.bottom : Math.max(12, rect.top - height);
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
    }
    popup.addEventListener('pointerleave', event => { if (!activeLink?.contains(event.relatedTarget)) hide(); });
    popup.addEventListener('focusout', event => {
        if (event.relatedTarget !== activeLink && !popup.contains(event.relatedTarget)) hide();
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (popup.contains(document.activeElement)) activeLink?.focus({ preventScroll: true });
        hide();
    });
    document.addEventListener('languagechange', hide);
    addEventListener('resize', hide);
    addEventListener('scroll', event => { if (event.target !== popup) hide(); }, true);
    return {
        hide,
        attach(link, paper, tags) {
            link.setAttribute('aria-haspopup', 'dialog');
            link.setAttribute('aria-controls', popup.id);
            link.setAttribute('aria-expanded', 'false');
            link.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(link, paper, tags); });
            link.addEventListener('pointerleave', event => { if (!popup.contains(event.relatedTarget)) hide(); });
            link.addEventListener('focus', () => { if (link.matches(':focus-visible')) show(link, paper, tags); });
            link.addEventListener('blur', event => { if (!popup.contains(event.relatedTarget)) hide(); });
            link.addEventListener('click', hide);
        }
    };
}
