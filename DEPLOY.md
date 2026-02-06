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
