export function chooseLanguage(search, saved) {
    const requested = new URLSearchParams(search).get('lang');
    return [requested, saved, 'en'].find(value => value === 'en' || value === 'ja');
}

export function localized(value, language) {
    return typeof value === 'string' ? value : value?.[language] ?? value?.en ?? '';
}

export function formatDate(value, language) {
    if (!value) return '';
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
    return new Intl.DateTimeFormat(language === 'ja' ? 'ja-JP' : 'en', {
        year: 'numeric', month: 'long', timeZone: 'UTC'
    }).format(new Date(`${value}-01T00:00:00Z`));
}

export function sortEntries(entries, publications = false) {
    // Stable sorting preserves the editorial order within the same month/year.
    return [...entries].sort((a, b) => publications
        ? b.publication.year - a.publication.year
        : b.date.localeCompare(a.date));
}

export function filterByTag(entries, tag) {
    return tag ? entries.filter(entry => (entry.tags ?? []).includes(tag)) : entries;
}

export function filterByRelatedPaper(talks, key) {
    return key ? talks.filter(talk => (talk['related-papers'] ?? []).includes(key)) : talks;
}

export function paperUrl(key, language) {
    return `/paper?lang=${language}#paper-${encodeURIComponent(key)}`;
}

export function catalogEntryUrl(category, id, language) {
    const page = { paper: 'paper', talk: 'talk', note: 'notes' }[category];
    return `/${page}?lang=${language}#${category}-${encodeURIComponent(id)}`;
}

export function talkUrl(key, language) {
    return `/talk?${new URLSearchParams({ lang: language, paper: key })}`;
}

export function paperKeyFromHash(hash, papers, legacyAnchors = {}) {
    let anchor;
    try { anchor = decodeURIComponent(hash.replace(/^#/, '')); } catch { return null; }
    const key = legacyAnchors[anchor] ?? (anchor.startsWith('paper-') ? anchor.slice(6) : null);
    return papers.some(paper => paper.key === key) ? key : null;
}

export function relatedPapers(talk, papers) {
    const byKey = new Map(papers.map(paper => [paper.key, paper]));
    return (talk['related-papers'] ?? []).map((key, index, all) => ({
        key, paper: byKey.get(key), number: all.length > 1 ? index + 1 : null
    }));
}

export function talkMetadata(talk, language) {
    return [formatDate(talk.date, language), talk.isOnline === true ? (language === 'ja' ? 'オンライン' : 'online') : null,
        localized(talk.city, language), localized(talk.country, language)].filter(Boolean).join(language === 'ja' ? ' · ' : ', ');
}

export function resourceHref(button, paper) {
    if (button.isLocked) return null;
    if (button.type === 'doi') return paper?.publication?.doi ? `https://doi.org/${paper.publication.doi}` : null;
    return button.link || null;
}

export function validateApplications(applications) {
    if (!Array.isArray(applications)) return ['Applications must be an array'];
    const errors = [];
    for (const [index, application] of applications.entries()) {
        for (const language of ['en', 'ja']) {
            for (const field of ['title', 'url']) {
                const value = localized(application?.[field], language);
                if (typeof value !== 'string' || !value.trim()) errors.push(`Invalid application ${field} (${language}): ${index + 1}`);
            }
            const description = localized(application?.description, language);
            if (typeof description !== 'string') errors.push(`Invalid application description (${language}): ${index + 1}`);
        }
    }
    return errors;
}

export function validateCatalog({ papers, talks, notes, tags, legacyAnchors = {} }) {
    const errors = [];
    const keys = new Set();
    const tagIds = new Set();
    for (const tag of tags) {
        const validLabel = ['en', 'ja'].every(language => {
            const label = localized(tag.label, language);
            return typeof label === 'string' && label.trim().length > 0;
        });
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag.id) || tagIds.has(tag.id) || !validLabel) errors.push(`Invalid or duplicate tag: ${tag.id}`);
        tagIds.add(tag.id);
    }
    for (const paper of papers) {
        if (!/^[A-Z][A-Za-z]+\d{4}[a-z][A-Za-z0-9]*$/.test(paper.key) || keys.has(paper.key)) errors.push(`Invalid or duplicate paper key: ${paper.key}`);
        keys.add(paper.key);
        if (paper.publication && (!paper.publication.journal || !Number.isInteger(paper.publication.year))) errors.push(`Invalid publication: ${paper.key}`);
    }
    for (const [name, entries] of [['talk', talks], ['note', notes]]) {
        const ids = new Set();
        for (const entry of entries) {
            if (typeof entry.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || ids.has(entry.id)) errors.push(`Invalid or duplicate ${name} id: ${entry.id}`);
            ids.add(entry.id);
        }
    }
    for (const entry of [...papers, ...talks, ...notes]) {
        if (!entry.title || !/^\d{4}-(0[1-9]|1[0-2])$/.test(entry.date)) errors.push(`Invalid title/date: ${entry.title}`);
        if (!Array.isArray(entry.tags) || new Set(entry.tags).size !== entry.tags.length) errors.push(`Invalid tags: ${entry.title}`);
        for (const tag of entry.tags ?? []) if (!tagIds.has(tag)) errors.push(`Unknown tag ${tag}: ${entry.title}`);
    }
    for (const talk of talks) {
        if ('preprints' in talk || !Array.isArray(talk['related-papers'])) errors.push(`Invalid related-papers: ${talk.title}`);
        for (const key of talk['related-papers'] ?? []) if (!keys.has(key)) errors.push(`Unknown paper ${key}: ${talk.title}`);
    }
    for (const note of notes) {
        if (!note.url || !['en', 'ja'].includes(note.language)) errors.push(`Invalid note: ${note.title}`);
    }
    for (const [anchor, key] of Object.entries(legacyAnchors)) if (!keys.has(key)) errors.push(`Unknown legacy anchor ${anchor}: ${key}`);
    return errors;
}
