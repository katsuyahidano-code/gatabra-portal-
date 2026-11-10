# ガタブラポータル (吹奏楽部総合ポータル)

吹奏楽部の活動を一元管理するためのWebポータルアプリケーションです。
日・週・月の練習日程管理、Googleフォーム出欠集計連動、トラック楽器積み込みリスト、所持楽譜管理、Geminiを活用した楽器相談室・音楽用語辞典などを備えています。

---

## 🌟 主な機能

1. **練習日程・スケジュール管理**
   - 日表示・週表示・月間カレンダー表示に対応
   - Googleスプレッドシート（公開CSV）との自動・手動同期
   - パート練習・合奏・イベントのタイムスケジュール一覧

2. **出欠管理 (Googleフォーム連動)**
   - Googleフォームの回答集約シート（`Raw_Form_Responses`）と連動
   - 日付・学年・組・パート・氏名・出欠種別（欠席・遅刻・早退・出席）・理由を自動集計＆カード表示
   - スプレッドシートURL同期およびCSVファイル直接インポートに対応

3. **楽器相談室 & 音楽用語辞典**
   - 専用のカスタムGem（Gemini）へのダイレクトリンク
   - アプリ内での楽器別AIクリニック・音楽用語検索

4. **トラック積み込みリスト**
   - 演奏会・合宿・コンクール時の大型楽器・備品積み込みチェックリスト

5. **楽譜ライブラリ**
   - 部の所有楽譜検索・編成・保管場所の確認

---

## 🚀 ローカルでの動かし方

### 必要環境
- **Node.js**: v18.0.0 以上
- **npm** または **bun** / **pnpm** / **yarn**

### 1. リポジトリのクローン & パッケージインストール
```bash
git clone https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
cd <リポジトリ名>

npm install
```

### 2. 環境変数の設定
`.env.example` をコピーして `.env` を作成します（Gemini API連携をアプリ内で行う場合）：
```bash
cp .env.example .env
```
`.env` 内の `GEMINI_API_KEY` にGoogle AI Studio等で取得したAPIキーを設定します（※外部リンクのみ使用する場合は空でも動作します）。

### 3. 開発サーバーの起動
```bash
npm run dev
```
ブラウザで [http://localhost:3000](http://localhost:3000) を開くとアプリが起動します。

### 4. プロダクションビルド & 実行
```bash
# ビルド
npm run build

# 本番サーバー起動
npm start
```

---

## 📤 GitHubへのアップロード手順

1. **GitHubで新しいリポジトリを作成**
   - [GitHub](https://github.com/) にアクセスし、右上の「+」→「New repository」をクリック
   - Repository name（例: `gatabra-portal`）を入力
   - **「Add a README file」などのチェックは外した状態**で「Create repository」をクリック

2. **ローカルからプッシュ**
   プロジェクトのルートディレクトリで以下のコマンドを実行します：
   ```bash
   git init
   git add .
   git commit -m "feat: ガタブラポータル初回コミット"
   git branch -M main
   git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
   git push -u origin main
   ```

---

## 🌐 インターネット上への公開（ホスティング）

本アプリはExpressサーバー（スプレッドシート連携プロキシおよびAPI）を含んでいるため、以下のNode.js実行環境でのホスティングが推奨されます：

- **Render** ([render.com](https://render.com/)) - GitHubリポジトリ連携で簡単にWebサービスとしてデプロイ可能（Build Command: `npm run build`, Start Command: `npm start`）
- **Railway** ([railway.app](https://railway.app/)) - リポジトリを選択するだけで自動検出してデプロイ
- **Google Cloud Run** - コンテナまたはBuildpacksで安全かつ高速に運用
