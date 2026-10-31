import { filterByRelatedPaper, filterByTag, formatDate, paperKeyFromHash, paperUrl, relatedPapers, sortEntries, talkMetadata, talkUrl } from './model.js';
import { getLanguage, localText, t } from './i18n.js';
import { createPaperPreview, el, externalLink, paperInfo, paperNote, resourceLinks, tagList } from './ui.js';

async function loadJson(name) {
    const response = await fetch(`./databases/${name}.json`);
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data[name])) throw new Error(`${name}: expected an array`);
    return data;
}

export function startCatalog(type) {
    const root = document.getElementById('catalog');
    const filters = document.getElementById('catalog-filters');
    const status = document.getElementById('catalog-status');
    const count = document.getElementById('catalog-count');
    const paperControls = document.getElementById('related-paper-controls');
    const paperFilter = document.getElementById('related-paper-filter');
    const clearTalkFilters = document.getElementById('clear-talk-filters');
    const preview = type === 'talks' ? createPaperPreview() : null;
    let selectedTag = '';
    let selectedPaper = '';
    let data = null;
    let state = 'loading';

    function writeTalkFilters(replace = false) {
        if (type !== 'talks') return;
        const url = new URL(location.href);
        url.searchParams.set('lang', getLanguage());
        for (const [name, value] of [['paper', selectedPaper], ['tag', selectedTag]]) {
            if (value) url.searchParams.set(name, value);
            else url.searchParams.delete(name);
        }
        if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](history.state, '', url);
    }
    function readTalkFilters() {
        if (type !== 'talks' || !data) return;
        const params = new URLSearchParams(location.search);
        const paper = params.get('paper') ?? '';
        const tag = params.get('tag') ?? '';
        selectedPaper = data.papers.some(entry => entry.key === paper) ? paper : '';
        selectedTag = data.tags.some(entry => entry.id === tag) ? tag : '';
        if (selectedPaper !== paper || selectedTag !== tag) writeTalkFilters(true);
    }
    function selectTag(tag, focusFilter = false) {
        selectedTag = tag;
        writeTalkFilters();
        render();
        if (focusFilter) filters.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
    }
    function resetFilters() {
        selectedTag = '';
        selectedPaper = '';
        writeTalkFilters();
        render();
        (paperFilter ?? filters.querySelector('[aria-pressed="true"]'))?.focus({ preventScroll: true });
    }
    function renderFilters(tags) {
        filters.replaceChildren();
        filters.setAttribute('aria-label', t('filter'));
        for (const tag of [{ id: '', label: t('all') }, ...tags]) {
            const button = el('button', 'filter-chip', localText(tag.label));
            button.type = 'button';
            button.setAttribute('aria-pressed', String(selectedTag === tag.id));
            button.addEventListener('click', () => selectTag(tag.id, true));
            filters.append(button);
        }
        if (paperFilter) {
            paperFilter.replaceChildren();
            for (const paper of [{ key: '', title: t('allPapers') }, ...sortEntries(data.papers)]) {
                const option = el('option', '', paper.title);
                option.value = paper.key;
                paperFilter.append(option);
            }
            paperFilter.value = selectedPaper;
            paperFilter.disabled = false;
            clearTalkFilters.hidden = !selectedPaper && !selectedTag;
        }
    }
    function entryShell(date, title, id) {
        const article = el('article', 'entry');
        if (id) { article.id = id; article.tabIndex = -1; }
        const stamp = el('div', 'entry-date', date);
        const content = el('div', 'entry-content');
        const summary = el('div', 'entry-summary');
        const metadata = el('div', 'entry-metadata');
        const actions = el('div', 'entry-actions');
        const links = el('div', 'entry-links');
        actions.append(links);
        const heading = el(type === 'papers' ? 'h3' : 'h2', 'entry-title', title);
        summary.append(heading, metadata);
        content.append(summary, actions);
        article.append(stamp, content);
        return { article, metadata, actions, links, heading };
    }
    function paperEntry(paper) {
        const { article, metadata, actions, links } = entryShell(paper.publication?.year ?? paper.date.slice(0, 4), paper.title, `paper-${paper.key}`);
        for (const [alias, key] of Object.entries(data.legacyAnchors ?? {})) {
            if (key === paper.key) {
                const anchor = el('span', 'legacy-anchor');
                anchor.id = alias;
                article.prepend(anchor);
            }
        }
        metadata.append(el('p', 'entry-meta', paperInfo(paper)));
        if (paper.publication) metadata.append(el('p', 'entry-detail', `${t('firstPosted')} · ${formatDate(paper.date, getLanguage())}`));
        const note = paperNote(paper);
        if (note.textContent) metadata.append(note);
        links.append(resourceLinks(paper.buttons, paper));
        const talks = el('a', 'related-link related-talks-link', t('relatedTalks'));
        talks.href = talkUrl(paper.key, getLanguage());
        talks.dataset.siteLink = '';
        talks.setAttribute('aria-label', `${t('relatedTalks')}: ${paper.title}`);
        links.append(talks);
        actions.append(tagList(paper.tags, data.tags, tag => selectTag(tag, true)));
        return article;
    }
    function talkEntry(talk) {
        const { article, metadata, actions, links } = entryShell(talk.date.slice(0, 4), talk.title, `talk-${talk.id}`);
        metadata.append(el('p', 'entry-meta', talkMetadata(talk, getLanguage())));
        const eventName = localText(talk.event);
        const eventUrl = localText(talk['event-url']);
        if (eventName) {
            const event = el('p', 'event-name');
            if (eventUrl) event.append(externalLink(eventName, eventUrl));
            else event.textContent = eventName;
            metadata.append(event);
        }
        links.append(resourceLinks(talk.buttons));
        const related = el('div', 'related-papers');
        for (const reference of relatedPapers(talk, data.papers)) {
            const label = t('related') + (reference.number ? ` ${reference.number}` : '');
            if (!reference.paper) {
                related.append(el('span', 'unavailable', `${label} · ${t('unavailable')}`));
                continue;
            }
            const link = el('a', 'related-link', label);
            link.href = paperUrl(reference.key, getLanguage());
            link.setAttribute('aria-label', `${label}: ${reference.paper.title}`);
            preview.attach(link, reference.paper, data.tags);
            related.append(link);
        }
        links.append(related);
        actions.append(tagList(talk.tags, data.tags, tag => selectTag(tag, true)));
        return article;
    }
    function noteEntry(note) {
        const { article, metadata, actions, links, heading } = entryShell(note.date.slice(0, 4), '', `note-${note.id}`);
        heading.append(externalLink(note.title, note.url));
        metadata.append(el('p', 'entry-meta', `${formatDate(note.date, getLanguage())} · ${t(note.language === 'ja' ? 'inJapanese' : 'inEnglish')}`));
        links.append(resourceLinks([{ type: 'pdf', link: note.url }]));
        actions.append(tagList(note.tags, data.tags, tag => selectTag(tag, true)));
        return article;
    }
    function render() {
        preview?.hide();
        root.replaceChildren();
        filters.replaceChildren();
        status.replaceChildren();
        count.textContent = '';
        if (paperControls) paperControls.hidden = state !== 'ready';
        if (state !== 'ready') {
            root.setAttribute('aria-busy', String(state === 'loading'));
            status.append(el('p', '', t(state === 'loading' ? 'loading' : 'loadError')));
            if (state === 'error') {
                const retry = el('button', 'resource-link', t('retry'));
                retry.type = 'button';
                retry.addEventListener('click', load);
                status.append(retry);
            }
            return;
        }
        root.setAttribute('aria-busy', 'false');
        renderFilters(data.tags);
        const matchingPapers = type === 'talks' ? filterByRelatedPaper(data.talks, selectedPaper) : data[type];
        const entries = filterByTag(matchingPapers, selectedTag);
        count.textContent = t('count', { count: entries.length });
        if (!entries.length) {
            status.append(el('p', 'empty-state', t(type === 'talks' ? 'emptyTalks' : 'empty')));
            if (selectedTag || selectedPaper) {
                const clear = el('button', 'resource-link', t(type === 'talks' ? 'clearFilters' : 'clear'));
                clear.type = 'button';
                clear.addEventListener('click', resetFilters);
                status.append(clear);
            }
        }
        if (type === 'papers') {
            for (const published of [true, false]) {
                const group = sortEntries(entries.filter(entry => Boolean(entry.publication) === published), published);
                const section = el('section', 'catalog-section');
                const heading = el('h2', 'section-heading', t(published ? 'publications' : 'preprints'));
                heading.append(el('span', 'section-count', String(group.length)));
                section.append(heading, ...group.map(paperEntry));
                root.append(section);
            }
        } else root.append(...sortEntries(entries).map(type === 'talks' ? talkEntry : noteEntry));
        markHashTarget(false);
    }
    function markHashTarget(scroll) {
        if (!data) return;
        let id;
        if (type === 'papers') {
            const key = paperKeyFromHash(location.hash, data.papers, data.legacyAnchors);
            if (key) id = `paper-${key}`;
        } else {
            let hash;
            try { hash = decodeURIComponent(location.hash.slice(1)); } catch { return; }
            const prefix = type === 'talks' ? 'talk-' : 'note-';
            if (data[type].some(entry => `${prefix}${entry.id}` === hash)) id = hash;
        }
        root.querySelectorAll('.anchor-target').forEach(element => element.classList.remove('anchor-target'));
        if (!id) return;
        let target = document.getElementById(id);
        if (!target && scroll) {
            selectedTag = '';
            selectedPaper = '';
            writeTalkFilters(true);
            render();
            target = document.getElementById(id);
        }
        target?.classList.add('anchor-target');
        if (scroll && target) requestAnimationFrame(() => {
            target.scrollIntoView({ block: 'start' });
            target.focus({ preventScroll: true });
        });
    }
    async function load() {
        state = 'loading';
        render();
        try {
            const names = [...new Set([type, 'tags', ...(type === 'talks' ? ['papers'] : [])])];
            data = Object.assign({}, ...await Promise.all(names.map(loadJson)));
            state = 'ready';
            readTalkFilters();
            render();
            markHashTarget(true);
        } catch (error) {
            console.error('Catalog loading failed:', error);
            state = 'error';
            render();
        }
    }
    document.addEventListener('languagechange', render);
    paperFilter?.addEventListener('change', () => {
        selectedPaper = paperFilter.value;
        writeTalkFilters();
        render();
    });
    clearTalkFilters?.addEventListener('click', resetFilters);
    if (type === 'talks') addEventListener('popstate', () => {
        readTalkFilters();
        render();
    });
    addEventListener('hashchange', () => markHashTarget(true));
    load();
}
