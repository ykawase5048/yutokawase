import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chooseLanguage, filterByRelatedPaper, filterByTag, formatDate, paperKeyFromHash, paperUrl, relatedPapers, resourceHref, sortEntries, talkMetadata, talkUrl, validateCatalog } from '../scripts/model.js';

const data = Object.assign({}, ...['papers', 'talks', 'notes', 'tags'].map(name => JSON.parse(fs.readFileSync(new URL(`../databases/${name}.json`, import.meta.url), 'utf8'))));

test('catalogs have unique citation keys, defined tags, ISO dates and valid references', () => {
    assert.deepEqual(validateCatalog(data), []);
    assert.equal(new Set(data.papers.map(paper => paper.title)).size, data.papers.length);
    assert.equal(data.papers.some(paper => paper.key === 'Kawase2025profunctor'), true);
    assert.equal(data.tags.some(tag => ['categorical-algebra', 'limit-and-colimit'].includes(tag.id)), false);
});

test('validation detects duplicate keys, unknown references and unknown tags', () => {
    const invalid = structuredClone(data);
    invalid.papers.push(invalid.papers[0]);
    invalid.talks[0]['related-papers'].push('Missing2026paper');
    invalid.notes[0].tags.push('missing-topic');
    invalid.tags[0].label = {};
    const errors = validateCatalog(invalid).join('\n');
    assert.match(errors, /duplicate paper key/);
    assert.match(errors, /Unknown paper/);
    assert.match(errors, /Unknown tag/);
    assert.match(errors, /Invalid or duplicate tag/);
});

test('related numbering covers zero, one and multiple papers and tolerates unknown keys', () => {
    const keys = data.papers.slice(0, 2).map(paper => paper.key);
    assert.deepEqual(relatedPapers({ 'related-papers': [] }, data.papers), []);
    assert.equal(relatedPapers({ 'related-papers': [keys[0]] }, data.papers)[0].number, null);
    assert.deepEqual(relatedPapers({ 'related-papers': keys }, data.papers).map(ref => ref.number), [1, 2]);
    assert.equal(relatedPapers({ 'related-papers': ['unknown'] }, data.papers)[0].paper, undefined);
});

test('all legacy anchors survive publication changes, filtering and sorting', () => {
    for (const [anchor, key] of Object.entries(data.legacyAnchors)) assert.equal(paperKeyFromHash(`#${anchor}`, data.papers, data.legacyAnchors), key);
    const changed = structuredClone(data.papers);
    const paper = changed.find(entry => !entry.publication);
    const href = paperUrl(paper.key, 'ja');
    paper.publication = { journal: 'Example journal', year: 2027 };
    assert.equal(paperUrl(paper.key, 'ja'), href);
    assert.equal(paperKeyFromHash(`#paper-${paper.key}`, changed), paper.key);
    assert.equal(paperKeyFromHash('#%invalid', changed), null);
});

test('related-paper filtering handles zero, one and multiple references without changing the records', () => {
    const entries = [
        { title: 'None', 'related-papers': [] },
        { title: 'Single', 'related-papers': ['PaperA'] },
        { title: 'Multiple', 'related-papers': ['PaperA', 'PaperB'] },
        { title: 'Different key', 'related-papers': ['PaperAB'] },
        { title: 'Missing field' }
    ];
    const original = structuredClone(entries);
    assert.deepEqual(filterByRelatedPaper(entries, 'PaperA').map(entry => entry.title), ['Single', 'Multiple']);
    assert.deepEqual(filterByRelatedPaper(entries, 'PaperB').map(entry => entry.title), ['Multiple']);
    assert.deepEqual(filterByRelatedPaper(entries, 'Unknown'), []);
    assert.equal(filterByRelatedPaper(entries, '').length, entries.length);
    assert.deepEqual(entries, original);
    const url = new URL(talkUrl('Kawase2025profunctor', 'ja'), 'https://example.com');
    assert.equal(url.pathname, '/talk');
    assert.equal(url.searchParams.get('paper'), 'Kawase2025profunctor');
    assert.equal(url.searchParams.get('lang'), 'ja');
});

test('sorting is descending and stable, and filtering never mutates entries', () => {
    const entries = [{ title: 'first', date: '2024-03' }, { title: 'second', date: '2024-03' }, { title: 'new', date: '2025-01' }];
    assert.deepEqual(sortEntries(entries).map(entry => entry.title), ['new', 'first', 'second']);
    assert.deepEqual(entries.map(entry => entry.title), ['first', 'second', 'new']);
    assert.deepEqual(filterByTag(data.notes, 'not-defined'), []);
    assert.equal(filterByTag(data.notes, '').length, data.notes.length);
});

test('locale precedence and month formatting are deterministic', () => {
    assert.equal(chooseLanguage('?lang=ja', 'en'), 'ja');
    assert.equal(chooseLanguage('', 'ja'), 'ja');
    assert.equal(chooseLanguage('?lang=fr', 'unknown'), 'en');
    assert.equal(formatDate('2026-04', 'en'), 'April 2026');
    assert.equal(formatDate('2026-04', 'ja'), '2026年4月');
});

test('optional locations and strictly boolean online flags retain prior behavior', () => {
    for (const isOnline of [false, undefined, null, 'true']) {
        const value = talkMetadata({ date: '2026-11', isOnline }, 'en');
        assert.equal(value, 'November 2026');
    }
    assert.equal(talkMetadata({ date: '2026-11', isOnline: true, city: '', country: null }, 'en'), 'November 2026, online');
    assert.equal(talkMetadata({ date: '2026-11', isOnline: true }, 'ja'), '2026年11月 · オンライン');
    assert.equal(talkMetadata({ date: '2026-11', city: 'Tokyo', country: 'Japan' }, 'en'), 'November 2026, Tokyo, Japan');
    const localizedPlace = { date: '2026-11', city: { en: 'Tokyo', ja: '東京' }, country: { en: 'Japan', ja: '日本' } };
    assert.equal(talkMetadata(localizedPlace, 'ja'), '2026年11月 · 東京 · 日本');
    assert.equal(talkMetadata(localizedPlace, 'en'), 'November 2026, Tokyo, Japan');
    assert.equal(talkMetadata({ date: '2026-11', city: { en: 'New city' }, country: { en: '', ja: '' } }, 'ja'), '2026年11月 · New city');
    for (const talk of data.talks) for (const field of ['city', 'country']) {
        if (!talk[field]) continue;
        assert.equal(typeof talk[field].en, 'string');
        assert.equal(typeof talk[field].ja, 'string');
        assert.ok(talk[field].ja.length > 0);
    }
});

test('locked resources have no URL and DOI links use the publication record', () => {
    assert.equal(resourceHref({ type: 'slides', link: './slides/missing.pdf', isLocked: true }), null);
    assert.equal(resourceHref({ type: 'doi' }, { publication: { doi: '10.example/test' } }), 'https://doi.org/10.example/test');
});
