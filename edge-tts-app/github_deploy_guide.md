# GitHub デプロイ完全ガイド (GitHub Pages + Render.com)

GitHub を活用して **LingoBotWebApp** を全世界に無料デプロイ・公開する手順です。

---

## 🏗️ 全体構成

1. **GitHub Pages (フロントエンド)**: `public/` フォルダの静的Web UIを `https://<your-username>.github.io/LingoBotWebApp/` に無料公開。
2. **Render.com (バックエンド)**: `server.py` の Edge TTS 音声生成 API を `https://lingobot-api.onrender.com` に無料公開。

---

## 📋 デプロイ手順（3ステップ）

### Step 1: コードを GitHub リポジトリに Push

1. [GitHub](https://github.com/) で新しいリポジトリ（名前: `LingoBotWebApp`）を作成。
2. ターミナルで `C:\Users\Admin\.gemini\antigravity\scratch\vocalise-edge-app` に移動し、Git コマンドを実行：

```bash
git init
git add .
git commit -m "Initial commit for LingoBotWebApp"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/LingoBotWebApp.git
git push -u origin main
```

---

### Step 2: GitHub Pages (フロントエンド) の有効化

1. GitHub のリポジトリ画面で **Settings** ➔ **Pages** を開きます。
2. **Source** の項目で **「GitHub Actions」** を選択します。
3. すでに作成済みの `.github/workflows/deploy-pages.yml` が自動起動し、数分で `https://<YOUR-USERNAME>.github.io/LingoBotWebApp/` に公開されます！

---

### Step 3: Render.com (バックエンド API) の連携

1. [Render.com](https://render.com/) にアクセスし、無料登録。
2. **「New +」** ➔ **「Web Service」** をクリック。
3. **「Build and deploy from a Git repository」** を選択し、GitHubの `LingoBotWebApp` リポジトリを選択。
4. 設定（リポジトリ内の `render.yaml` が自動読み込みされます）：
   - **Name**: `lingobot-tts-api`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app`
5. **「Create Web Service」** を押すと、`https://lingobot-tts-api.onrender.com` のURLが発行されます。

---

## 🔗 フロントエンドとバックエンドの接続完了

Render で発行された API URL（例: `https://lingobot-tts-api.onrender.com/api/tts`）を `public/index.html` の `fetch('/api/tts')` の部分に置き換えて `git push` するだけで、完全オンラインで音声会話＆MP3ダウンロード機能が動作します！
