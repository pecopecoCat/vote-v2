This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 他の人に見せるには

**おすすめ: Vercel にデプロイ（無料・URL を共有できる）**

1. このフォルダを **GitHub** にプッシュする（まだなら `git init` → リポジトリ作成 → push）
2. [Vercel](https://vercel.com) にログイン（GitHub 連携が簡単）
3. 「Add New Project」→ このリポジトリを選択 → **Deploy**
4. 数分で `https://○○○.vercel.app` のような URL が発行されるので、そのリンクを共有する

**データの保存について**

- **何も設定しない場合**: ブックマーク・コレクション・投票結果・作成したVOTEなどはブラウザの **localStorage** に保存されます。端末ごとに別のデータになります（デモ・プレビュー用）。
- **10人などで同じデータを共有してチェックしたい場合**: 下記の「共有ストア（Vercel KV）」を設定すると、**作成したVOTE・投票数・コメント**が全員で共有されます。

### 共有ストア（Vercel KV）の設定（任意）

複数ユーザーで同じVOTE一覧・投票結果を見たいときは、Vercel の Redis（Upstash）を用意し、環境変数を設定してください。

1. [Vercel Dashboard](https://vercel.com) → プロジェクト → **Storage** で **Redis**（Upstash）を追加する  
   または [Upstash](https://upstash.com) で Redis を作成し、REST API の URL とトークンを取得する
2. プロジェクトのルートに `.env.local` を作成し、次を記述する（値は Vercel / Upstash の画面からコピー）:
   ```bash
   KV_REST_API_URL=https://xxxxx.upstash.io
   KV_REST_API_TOKEN=AXxx...
   ```
3. `npm run dev` で再起動する

設定後は、**作成したVOTE**と**投票・コメントの集計**が KV に保存され、同じURLにアクセスした全員で同じデータが表示されます。ブックマーク・コレクション・ログイン状態は従来どおり各端末の localStorage です。

**ローカルで試すだけなら**

- 同じ Wi‑Fi 内の相手: `npm run dev` で起動し、PC の IP アドレスでアクセス（例: `http://192.168.1.10:3000`）
- 離れた相手: [ngrok](https://ngrok.com) などでローカルを一時的に公開する方法もあります

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
