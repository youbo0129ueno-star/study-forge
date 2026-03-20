# Study Forge

**GitHub Pages: https://youbo0129ueno-star.github.io/study-forge/**

オフライン対応の学習テストアプリ。ブラウザで動作し、Service Workerでキャッシュする。

## 起動

```bash
cd /Users/uenoyuuta/Desktop/quiz-app
python -m http.server 8080
```

`http://localhost:8080` を開く。

## 出題タイプ

- 小テストのみ
- 用語テストのみ
- 混合

## 科目の追加

1. `data/template.json` をコピーして新しい科目JSONを作成する。
2. `data/index.json` に科目を追加する。

例:

```json
{
  "id": "new-subject",
  "title": "科目名",
  "file": "./data/new-subject.json"
}
```

## データ仕様

- `terms`: 用語と定義
- `quizzes`: 選択式問題
- `chapter`: 章フィルタに使う