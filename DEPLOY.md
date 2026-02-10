# Git から GitHub → Vercel までの手順

## 1. いまの変更をコミットする

プロジェクトのフォルダでターミナルを開き、次を実行します。

```bash
# すべてのファイルをステージ
git add .

# コミット（メッセージは自由に変更してOK）
git commit -m "VOTEアプリ完成：HOME・検索・マイページ・作成・コレクションなど"
```

## 2. GitHub にリポジトリを作る

1. [GitHub](https://github.com) にログイン
2. 右上の **+** → **New repository**
3. 設定例:
   - **Repository name**: `vote-v2`（任意でOK）
   - **Public** を選択
   - 「Add a README file」などは**つけなくてOK**（ローカルに既にあるため）
4. **Create repository** をクリック

## 3. ローカルを GitHub にプッシュする

GitHub でリポジトリを作ったあと、画面に表示される「…or push an existing repository from the command line」のコマンドを使います。

**まだリモートを追加していない場合:**

```bash
# リモートを追加（URL は自分のリポジトリに合わせて書き換え）
git remote add origin https://github.com/あなたのユーザー名/vote-v2.git

# main ブランチを GitHub にプッシュ
git push -u origin main
```

- `あなたのユーザー名` を自分の GitHub のユーザー名に
- リポジトリ名を `vote-v2` 以外にした場合は、その名前に

**すでに `origin` を追加している場合:**

```bash
git push -u origin main
```

初回は GitHub のログイン（ブラウザまたはトークン）を求められます。

## 4. Vercel でデプロイする

1. [Vercel](https://vercel.com) にアクセス → **Sign Up** または **Log In**
2. **Continue with GitHub** で GitHub アカウントと連携
3. **Add New…** → **Project**
4. **Import** で `vote-v2`（または作ったリポジトリ名）を選ぶ
5. **Deploy** をクリック（設定はそのままでOK）
6. 数分後、`https://vote-v2-xxxx.vercel.app` のような URL が表示される

この URL を共有すれば、他の人もアプリを見られます。

---

## Vercel を使わずにサーバーで動かす

**難しくありません。** サーバーに Node.js が入っていれば、ビルドして起動するだけです。

### サーバーで必要なもの

- **Node.js**（v18 以上推奨）  
  - 確認: `node -v`
- **npm**（Node と一緒に入ります）

### 手順（サーバーに SSH で入れる場合）

**1. サーバーにプロジェクトを置く**

- GitHub に push 済みなら、サーバーで `git clone` するのが簡単です。

```bash
# 例: サーバーで
git clone https://github.com/あなたのユーザー名/vote-v2.git
cd vote-v2
```

- GitHub を使わない場合は、ローカルでフォルダごと ZIP にしてサーバーにアップロード（scp や FTP など）し、サーバー上で解凍しても構いません。

**2. 依存関係のインストールとビルド**

```bash
npm ci
npm run build
```

**3. 起動**

```bash
npm run start
```

デフォルトでは **ポート 3000** で動きます。  
ブラウザで `http://サーバーのIP:3000` や `http://ドメイン:3000` にアクセスすると確認できます。

**4. ずっと動かしておきたい場合（オプション）**

`npm run start` はターミナルを閉じると止まります。常時稼働させたい場合は **pm2** を使う方法が簡単です。

```bash
# pm2 を入れる（1回だけ）
npm install -g pm2

# 起動してバックグラウンドで動かす
pm2 start npm --name "vote-v2" -- start

# 再起動や停止
pm2 restart vote-v2
pm2 stop vote-v2
```

**5. 80番ポートや HTTPS で公開したい場合（オプション）**

- **Nginx** などでリバースプロキシを設定し、`http://サーバー:3000` を 80 番や 443（HTTPS）に振り向ける方法が一般的です。
- レンタルサーバーでは「Node 対応」のプランでないとこの方法は使えません。その場合は VPS（さくら、ConoHa、AWS など）や、Vercel の方が向いています。

### まとめ

| 方法 | 難しさ |
|------|--------|
| サーバーに SSH で入って `npm run build` → `npm run start` | そこまで難しくない（Node が入っていればOK） |
| 常時稼働（pm2）・ドメイン・HTTPS | 設定は増えるが手順どおりで可能 |
| レンタルサーバー（Node 非対応）のみ | 難しい → Vercel か Node 対応サーバーが無難 |

---

## よく使う Git コマンド（参考）

| やりたいこと           | コマンド |
|------------------------|----------|
| 変更をコミット         | `git add .` → `git commit -m "メッセージ"` |
| GitHub に反映          | `git push` |
| 最新を取る             | `git pull` |
| 状態確認               | `git status` |

## トラブル時

- **`git push` で認証エラー**  
  GitHub の **Settings → Developer settings → Personal access tokens** でトークンを作り、パスワードの代わりにトークンを入力する方法があります。

- **リモート URL を確認したい**  
  `git remote -v`

- **リモートを付け直したい**  
  `git remote remove origin` のあと、もう一度 `git remote add origin ...` を実行
