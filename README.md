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

## Home の更新履歴

自己紹介の直後、各ページへの案内カードの前に、論文・講演・ノートの最新3件の更新を表示する。新規項目、公開資料の追加・リンク変更、出版情報の変更が対象。未公開資料の登録、文言・翻訳・タグの修正、並べ替え、削除、同じURLのPDF差し替えは含めない。

講演とノートの `id` は小文字英数字とハイフンで一意に付け、一度登録したら変更しない。タイトルや開催日を修正しても、項目リンクと履歴の対応が維持される。論文には既存の `key` を使用する。

`npm.cmd run updates` で `databases/updates.json` を生成する。このファイルは自動生成専用で、編集・コミットしない。`main` の first-parent 履歴を使用し、更新日は `main` への取り込み日時になる。英語ではUTC、日本語では日本時間で表示する。作業中の未コミット変更や他ブランチの変更には更新日を付けない。

旧形式の対応表は `scripts/history-identities.json` に固定してある。既存項目を修正するときにこの対応表を書き換えない。新規項目は `id` / `key` で追跡するため、対応表への追加は不要。JSON 化の最初の一括登録は基準データとし、それ以前の掲載日は推測しない。

`preview.ps1` は起動時に同じ履歴を生成する。プレビュー中に新たなコミットを反映するときは、`npm.cmd run updates` またはプレビューの再起動で更新する。履歴生成には全履歴が必要なため、shallow clone の場合は先に `git fetch --unshallow` を実行する。

## 検査と公開

`npm.cmd test` と `npm.cmd run check` は履歴を生成してから検査する。`npm.cmd run build` は生成した履歴と公開ファイルを `.cache/site/` にまとめる。既存のHTML・PDF・旧URL用転送ページも含める。

`.github/workflows/pages.yml` は `main` への push 時に検査・生成・GitHub Pages 公開を実行する。プルリクエストでは検査とビルドのみを行う。初回導入時は、ワークフローを `main` に反映してから GitHub の Settings → Pages → Build and deployment → Source を **GitHub Actions** に設定し、Actions → Publish GitHub Pages → Run workflow で初回公開を実行する。従来のブランチ直接公開では履歴生成が実行されない。
