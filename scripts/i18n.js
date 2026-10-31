import { chooseLanguage, localized } from './model.js';

export const translations = {
    en: {
        home: 'Home', paper: 'Papers', talk: 'Talks & Slides', notes: 'Notes', cv: 'CV', misc: 'Miscellaneous',
        menu: 'Menu', language: 'Language', navigation: 'Main navigation', skip: 'Skip to content',
        lastUpdated: 'Last updated:',
        name: 'Yuto Kawase',
        role: 'Ph.D. student, JSPS Research Fellow (<a href="https://www.jsps.go.jp/english/e-pd/" target="_blank" rel="noopener noreferrer">DC1</a>) from April 2024',
        affiliation: 'Research Institute for Mathematical Sciences (<a href="https://www.kurims.kyoto-u.ac.jp/en/" target="_blank" rel="noopener noreferrer">RIMS</a>), Kyoto University, Japan',
        interests: 'Research interests', categoricalAlgebra: 'Categorical algebra', categoryTheory: 'Category theory',
        algebraInterests: 'Equational theory · Birkhoff varieties · universal algebra · categorical Galois theory · homological algebra',
        categoryInterests: 'Accessible and locally presentable categories · monads and their algebras · enriched categories · double categories',
        paperDescription: 'Publications and preprints.', talkDescription: 'Talk list, slides, and recordings.',
        notesDescription: 'Several informal notes.', cvDescription: 'Education.', miscDescription: 'Hobbies and others.',
        answering: 'Me answering a question', adjunctions: 'Me describing adjunctions',
        photoCredit: 'March 1, 2024 · Tokyo · Taken by <a href="https://yuki-imamura.gitlab.io/" target="_blank" rel="noopener noreferrer">Yuki Imamura</a>',
        answeringAlt: 'Yuto Kawase answering a question at the blackboard', adjunctionsAlt: 'Yuto Kawase describing adjunctions at the blackboard',
        colleagues: 'Friends and colleagues', outreach: 'Outreach',
        keisukeHoshino: 'Keisuke Hoshino', hayatoNasu: 'Hayato Nasu', takahiroSanada: 'Takahiro Sanada',
        ryuyaHora: 'Ryuya Hora', kengoHirata: 'Kengo Hirata', yukiMaehara: 'Yuki Maehara', yukiImamura: 'Yuki Imamura',
        dalhousieAffiliation: '(Dalhousie University)', fukuiAffiliation: '(Fukui Prefectural University)',
        zenAffiliation: '(ZEN University)', chibaAffiliation: '(Chiba University)',
        tokyoMetropolitanAffiliation: '(Tokyo Metropolitan University)', osakaMetropolitanAffiliation: '(Osaka Metropolitan University)',
        outreachText: 'Contributed an article to <a href="https://www.nippyo.co.jp/shop/magazine/9611.html" target="_blank" rel="noopener noreferrer">Sūgaku Seminar, November 2025</a> (in Japanese).',
        publications: 'Publications', preprints: 'Preprints', published: 'Published', preprint: 'Preprint', firstPosted: 'First posted',
        all: 'All topics', filter: 'Filter by topic', clear: 'Clear filter', count: '{count} entries', empty: 'No entries match this topic.',
        loading: 'Loading entries…', loadError: 'The entries could not be loaded. Please try again.', retry: 'Try again',
        related: 'Related paper', unavailable: 'Unavailable',
        filterPaper: 'Filter by related paper', allPapers: 'All papers', relatedTalks: 'Related talks',
        clearFilters: 'Clear filters', emptyTalks: 'No talks match these filters.',
        slides: 'Slides', video: 'Video', noteJP: 'Note (JP)', pdf: 'PDF', inJapanese: 'In Japanese', inEnglish: 'In English', locked: 'Not yet available',
        education: 'Education', undergraduate: 'Undergraduate course', masters: 'Master’s course', doctoral: 'Doctoral course',
        undergraduateDates: 'April 2018 – March 2022', mastersDates: 'April 2022 – March 2024', doctoralDates: 'April 2024 – present',
        undergraduateText: 'Faculty of Science, Kyoto University.',
        graduateText: 'Division of Mathematics and Mathematical Sciences, Graduate School of Science, Kyoto University (<a href="https://www.kurims.kyoto-u.ac.jp/en/" target="_blank" rel="noopener noreferrer">RIMS</a>).',
        supervisor: 'Supervised by Prof. <a href="https://www.kurims.kyoto-u.ac.jp/~hassei/" target="_blank" rel="noopener noreferrer">Masahito Hasegawa</a>.',
        fellowship: 'Research Fellow of Japan Society for the Promotion of Science (<a href="https://www.jsps.go.jp/english/e-pd/" target="_blank" rel="noopener noreferrer">DC1</a>).',
        hobbies: 'Hobbies', music: 'Computer music',
        musicText: 'Computer music (composing music on PC) is one of my hobbies. My own music is available on the following platforms.',
        streaming: 'Streaming', others: 'Others', applications: 'Applications',
        applicationsEmpty: 'No application documents are available yet.',
        noscript: 'Please enable JavaScript to load the entries and use language switching.',
        notFound: 'Page not found', notFoundText: 'The page may have moved. Please use the navigation to find it.', backHome: 'Back to home'
    },
    ja: {
        home: 'ホーム', paper: '論文', talk: '講演・スライド', notes: 'ノート', cv: '経歴', misc: 'その他',
        menu: 'メニュー', language: '言語', navigation: 'メインナビゲーション', skip: '本文へ移動',
        lastUpdated: '最終更新日：',
        name: '河瀬 悠人',
        role: '博士後期課程学生・日本学術振興会特別研究員(<a href="https://www.jsps.go.jp/j-pd/" target="_blank" rel="noopener noreferrer">DC1</a>、2024年4月より)',
        affiliation: '京都大学 数理解析研究所(<a href="https://www.kurims.kyoto-u.ac.jp/ja/index.html" target="_blank" rel="noopener noreferrer">RIMS</a>)',
        interests: '研究分野', categoricalAlgebra: '圏論的代数学', categoryTheory: '圏論',
        algebraInterests: '等式理論・Birkhoffバラエティ・普遍代数学・圏論的ガロア理論・ホモロジー代数',
        categoryInterests: '到達可能圏と局所表示可能圏・モナドとその代数・豊穣圏・二重圏',
        paperDescription: '出版論文とプレプリント。', talkDescription: '講演一覧、スライド、録画。',
        notesDescription: '研究や学習に関するノート。', cvDescription: 'これまでの学歴。', miscDescription: '趣味やその他の資料。',
        answering: '質問に答えているところ', adjunctions: '随伴について説明しているところ',
        photoCredit: '2024年3月1日 · 東京 · 撮影：<a href="https://yuki-imamura.gitlab.io/ja/" target="_blank" rel="noopener noreferrer">今村 悠希</a>',
        answeringAlt: '黒板の前で質問に答える河瀬悠人', adjunctionsAlt: '黒板で随伴について説明する河瀬悠人',
        colleagues: '友人・同僚', outreach: 'アウトリーチ',
        keisukeHoshino: '星野 恵佑', hayatoNasu: '奈須 隼大', takahiroSanada: '眞田 嵩大',
        ryuyaHora: '洞 龍弥', kengoHirata: '平田 賢吾', yukiMaehara: '前原 悠究', yukiImamura: '今村 悠希',
        dalhousieAffiliation: '(ダルハウジー大学)', fukuiAffiliation: '(福井県立大学)',
        zenAffiliation: '(ZEN大学)', chibaAffiliation: '(千葉大学)',
        tokyoMetropolitanAffiliation: '(東京都立大学)', osakaMetropolitanAffiliation: '(大阪公立大学)',
        outreachText: '<a href="https://www.nippyo.co.jp/shop/magazine/9611.html" target="_blank" rel="noopener noreferrer">『数学セミナー』2025年11月号</a>に記事を寄稿しました。',
        publications: '出版論文', preprints: 'プレプリント', published: '出版済み', preprint: 'プレプリント', firstPosted: '初回公開',
        all: 'すべて', filter: 'タグで絞り込み', clear: '絞り込みを解除', count: '{count}件', empty: 'このタグに該当する項目はありません。',
        loading: '読み込み中…', loadError: 'データを読み込めませんでした。もう一度お試しください。', retry: '再読み込み',
        related: '関連論文', unavailable: '参照できません',
        filterPaper: '関連論文で絞り込み', allPapers: 'すべての論文', relatedTalks: '関連講演',
        clearFilters: '絞り込みを解除', emptyTalks: 'この条件に該当する講演はありません。',
        slides: 'スライド', video: '動画', noteJP: 'ノート(日本語)', pdf: 'PDF', inJapanese: '日本語', inEnglish: '英語', locked: '公開準備中',
        education: '学歴', undergraduate: '学士課程', masters: '修士課程', doctoral: '博士後期課程',
        undergraduateDates: '2018年4月 – 2022年3月', mastersDates: '2022年4月 – 2024年3月', doctoralDates: '2024年4月 – 現在',
        undergraduateText: '京都大学 理学部。',
        graduateText: '京都大学大学院 理学研究科 数学・数理解析専攻(<a href="https://www.kurims.kyoto-u.ac.jp/ja/index.html" target="_blank" rel="noopener noreferrer">RIMS</a>)。',
        supervisor: '指導教員：<a href="https://www.kurims.kyoto-u.ac.jp/~hassei/index-j.html" target="_blank" rel="noopener noreferrer">長谷川 真人</a>教授。',
        fellowship: '日本学術振興会特別研究員(<a href="https://www.jsps.go.jp/j-pd/" target="_blank" rel="noopener noreferrer">DC1</a>)。',
        hobbies: '趣味', music: 'DTM',
        musicText: '作曲をしています。',
        streaming: '音楽配信サービス', others: 'その他', applications: '申請書',
        applicationsEmpty: '公開している申請書はまだありません。',
        noscript: '一覧の読み込みと言語切り替えにはJavaScriptを有効にしてください。',
        notFound: 'ページが見つかりません', notFoundText: 'ページが移動した可能性があります。メニューからお探しください。', backHome: 'ホームへ戻る'
    }
};

let savedLanguage;
try { savedLanguage = localStorage.getItem('site-language'); } catch { /* Storage may be unavailable. */ }
let language = chooseLanguage(location.search, savedLanguage);
export const getLanguage = () => language;
export const localText = value => localized(value, language);
export function t(key, values = {}) {
    return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), translations[language][key] ?? translations.en[key] ?? key);
}

export function applyTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    // Only developer-authored translations may contain markup. JSON content is rendered with textContent.
    root.querySelectorAll('[data-i18n-html]').forEach(element => { element.innerHTML = t(element.dataset.i18nHtml); });
    root.querySelectorAll('[data-i18n-label]').forEach(element => element.setAttribute('aria-label', t(element.dataset.i18nLabel)));
    root.querySelectorAll('[data-i18n-alt]').forEach(element => { element.alt = t(element.dataset.i18nAlt); });
    root.querySelectorAll('a[data-href-en][data-href-ja]').forEach(anchor => {
        anchor.href = language === 'ja' ? anchor.dataset.hrefJa : anchor.dataset.hrefEn;
        anchor.hreflang = language;
    });
    root.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    root.querySelectorAll('a[data-site-link]').forEach(anchor => {
        const url = new URL(anchor.getAttribute('href'), location.href);
        url.searchParams.set('lang', language);
        anchor.setAttribute('href', url.pathname + url.search + url.hash);
    });
    document.documentElement.lang = language;
    const page = document.body.dataset.page;
    document.title = page === 'home' ? t('name') : `${t(page)} — ${t('name')}`;
}

export function setLanguage(next, updateUrl = true) {
    if (!['en', 'ja'].includes(next)) return;
    language = next;
    try { localStorage.setItem('site-language', next); } catch { /* URL selection still works. */ }
    if (updateUrl) {
        const url = new URL(location.href);
        url.searchParams.set('lang', next);
        history.replaceState(history.state, '', url);
    }
    applyTranslations();
    document.dispatchEvent(new CustomEvent('languagechange', { detail: next }));
}

export function initI18n() {
    try { localStorage.setItem('site-language', language); } catch { /* Keep working without storage. */ }
    document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.language)));
    addEventListener('popstate', () => setLanguage(chooseLanguage(location.search, language), false));
    applyTranslations();
}
