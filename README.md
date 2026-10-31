# Yuto Kawase — personal website

静的HTML・CSS・JavaScriptを使用。

## ローカルプレビュー

`preview.ps1` をPowerShellで実行する。既定のURLは `http://127.0.0.1:8000/`、ポートを変える場合は `-Port 8001`のように指定する。

専用の `scripts/preview.mjs` は `/notes`・`/misc` を同名のPDFフォルダーより優先してHTMLへ解決する。

## コンテンツの編集

データは `databases/` 内のJSONで管理。

| ファイル | 内容 |
| --- | --- |
| `papers.json` | 論文一覧。`publication` があれば出版論文、`null` ならプレプリントとして表示する。 |
| `talks.json` | 講演一覧。配列順が関連論文の表示順になる。講演の `event` と `event-url` は、共通の文字列または `{"en": "英語の値", "ja": "日本語の値"}` で指定する。日本語の値を省略した場合は英語の値を使用する。イベントURLを省略すると、イベント名をリンクなしで表示する。 |
| `notes.json` | ノート一覧。 |
| `tags.json` | サイト共通のタグ定義。 |
| `applications.json` | Miscに置く申請書一覧。配列順に表示する。 |
