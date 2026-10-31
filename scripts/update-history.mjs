import { resourceHref } from './model.js';

export const catalogNames = ['papers', 'talks', 'notes'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const values = value => typeof value === 'string' ? [value] : Object.values(value ?? {});
const overlaps = (left, right) => left.some(value => right.includes(value));

export function normalizeMonth(value) {
    if (/^\d{4}-\d{2}$/.test(value)) return value;
    const [month, year] = String(value).split(' ');
    const index = monthNames.indexOf(month);
    return index < 0 ? value : `${year}-${String(index + 1).padStart(2, '0')}`;
}

function normalizeUrl(value) {
    const url = new URL(value, 'https://ykawase5048.github.io/');
    if (url.hostname === 'ykawase5048.github.io') {
        return url.pathname.replace(/^\/yutokawase\//, '/') + url.search + url.hash;
    }
    return url.href;
}

function arxivIds(entry) {
    return [entry.arxiv, ...(entry.buttons ?? []).filter(button => button.type === 'arxiv').map(button => button.link)]
        .filter(Boolean).map(url => url.match(/(?:abs|pdf)\/([^/?#]+?)(?:v\d+|\.pdf)?(?:[?#]|$)/)?.[1]).filter(Boolean);
}

function identify(name, entry, identities) {
    if (name === 'papers' && entry.key) return entry.key;
    if (name !== 'papers' && entry.id) return entry.id;
    const aliases = identities[name] ?? [];
    let matches;
    if (name === 'papers') {
        matches = aliases.filter(alias => overlaps(arxivIds(entry), alias.arxiv ?? []) || alias.titles.includes(entry.title));
    } else if (name === 'notes') {
        matches = aliases.filter(alias => alias.urls.includes(entry.url));
    } else {
        matches = aliases.filter(alias => alias.date === normalizeMonth(entry.date) && (
            overlaps(values(entry['event-url']), alias.urls) || overlaps(values(entry.event), alias.events)
        ));
        if (matches.length > 1) matches = matches.filter(alias => alias.titles.includes(entry.title));
    }
    if (matches.length > 1) throw new Error(`Ambiguous historical identity: ${name}: ${entry.title}`);
    // Unmapped, removed historical items cannot produce a link on the current site.
    return matches[0]?.id ?? null;
}

function publicResources(entry, publication) {
    const resources = new Map();
    const buttons = [...(entry.buttons ?? [])];
    if (entry.journal && entry.doi && !entry.buttons) buttons.push({ type: 'doi', isLocked: entry.isLocked });
    if (entry.arxiv) buttons.push({ type: 'arxiv', link: entry.arxiv });
    if (entry.url) buttons.push({ type: 'pdf', link: entry.url });
    for (const button of buttons) {
        const href = resourceHref(button, { publication });
        if (!href) continue;
        const type = button.type === 'youtube' ? 'video' : button.type;
        if (!resources.has(type)) resources.set(type, new Set());
        resources.get(type).add(normalizeUrl(href));
    }
    return resources;
}

export function normalizeSnapshot(name, raw, identities) {
    if (!raw) return null;
    const entries = name === 'papers' && !raw.papers
        ? [...(raw.preprints ?? []), ...(raw.publications ?? []).map(entry => ({ ...entry, publication: entry }))]
        : raw[name];
    if (!Array.isArray(entries)) throw new Error(`Invalid historical ${name} catalog`);
    const result = new Map();
    for (const entry of entries) {
        const id = identify(name, entry, identities);
        if (!id) continue;
        const publication = entry.publication ? {
            journal: entry.publication.journal,
            year: Number(entry.publication.year),
            doi: entry.publication.doi ?? ''
        } : null;
        const previous = result.get(id);
        const resources = publicResources(entry, publication);
        // Legacy papers appear in both preprints and publications. They are one item.
        for (const [type, urls] of previous?.resources ?? []) {
            if (!resources.has(type)) resources.set(type, new Set());
            for (const url of urls) resources.get(type).add(url);
        }
        result.set(id, { publication: publication ?? previous?.publication ?? null, resources });
    }
    return result;
}

export function detectChanges(before, after) {
    if (!before) return ['added'];
    const changes = [];
    if (after.publication && JSON.stringify(before.publication) !== JSON.stringify(after.publication)) changes.push('publication');
    for (const [type, urls] of after.resources) {
        const oldUrls = before.resources.get(type) ?? new Set();
        if (![...urls].some(url => !oldUrls.has(url))) continue;
        if ([...oldUrls].some(url => !urls.has(url))) changes.push('links-updated');
        else if (type === 'slides') changes.push('slides-added');
        else if (type === 'video') changes.push('video-added');
        else if (!changes.includes('publication')) changes.push('resources-added');
    }
    return [...new Set(changes)];
}

export function collectUpdates(snapshots, current, identities) {
    const previous = new Map();
    const updates = [];
    for (const { commit, updatedAt, catalogs } of snapshots) {
        for (const name of catalogNames) {
            const next = normalizeSnapshot(name, catalogs[name], identities);
            if (!next) continue;
            const before = previous.get(name);
            // An initial import establishes a baseline, not a batch of new announcements.
            if (before) for (const [id, entry] of next) {
                const changes = detectChanges(before.get(id), entry);
                if (changes.length) updates.push({ commit, updatedAt, category: name === 'papers' ? 'paper' : name === 'talks' ? 'talk' : 'note', targetId: id, changes });
            }
            previous.set(name, next);
        }
    }
    const present = new Map(catalogNames.flatMap(name => current[name].map(entry => [
        `${name === 'papers' ? 'paper' : name === 'talks' ? 'talk' : 'note'}:${entry.key ?? entry.id}`, entry
    ])));
    return updates.filter(update => present.has(`${update.category}:${update.targetId}`))
        .map(update => {
            const entry = present.get(`${update.category}:${update.targetId}`);
            return { ...update, title: entry.title, ...(update.category === 'talk' && entry.event ? { event: entry.event } : {}) };
        })
        .reverse().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
