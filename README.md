# Study Forge

**GitHub Pages: https://yuta-u-tech.github.io/study-forge/**

オフライン対応の学習アプリ。`HOME` から科目ページへ移動し、科目ごとのテーマで用語・小テスト・資料を扱える。

## 起動

```bash
cd /Users/uenoyuuta/Desktop/quiz-app
python -m http.server 8080
```

`http://localhost:8080` を開く。`index.html` が HOME、`study.html?subject=...` が各科目ページ。

## 学習モード

- 用語
- 小テスト
- 資料

## 科目の追加

1. `data/template.json` をコピーして新しい科目JSONを作成する。
2. `data/index.json` に科目を追加する。

例:

```json
{
  "id": "new-subject",
  "title": "科目名",
  "file": "./data/new-subject.json",
  "theme": "default",
  "group": "Subject",
  "description": "HOME に出す説明文"
}
```

## データ仕様

- `terms`: 用語と定義
- `materials`: 資料の要点と補足
- `quizzes`: 選択式問題
- `chapter`: 章フィルタに使う
