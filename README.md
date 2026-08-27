# GROOVE COFFEE スマート注文アプリ

個人経営・小規模カフェ向けのレジ業務スマート化アプリ。`handoff-instructions.md` の仕様に沿って、お客さん用アプリ・レジ(スタッフ用)アプリ・管理画面の3つを1つのNext.jsアプリとして実装しています。

引き継ぎ指示書にあったプロトタイプファイル(`cafe-order-app.jsx` 等)は見つからなかったため、UIは仕様書のテキストから新規に組み立てています。デザインの再現度よりも、データの流れと権限まわりを実データで動くところまで作ることを優先しました。

## セットアップ

DBはPostgres (Vercel Postgres = Neon) を使います。あらかじめVercelプロジェクトの「Storage」タブからPostgresストアを1つアタッチしてください(Vercelアカウント側の操作なので、これは各自でお願いします)。

```bash
npm install

# 接続文字列を用意する:
#   Vercel経由: npx vercel env pull .env.local   (アタッチ済みならこれで POSTGRES_URL が入る)
#   もしくは Neon コンソールの接続文字列を .env の POSTGRES_URL に直接貼る

npm run db:migrate   # テーブルを作成 (何度実行しても安全)
npm run seed          # デモ用の店舗・メニュー・スタッフアカウントを投入
npm run dev
```

http://localhost:3000 を開くと、開発用のトップページから客/レジ/管理の3画面に入れます。

seed で作成されるスタッフアカウント:
- 管理者: `admin` / `admin1234`
- レジ担当: `register` / `register1234`

## 実装した内容

- **データ層**: Postgres (`@neondatabase/serverless`、Vercel PostgresはNeonのネイティブ統合)。HTTPベースのドライバなので接続プール管理が不要で、複数クエリのまとめ書きは `sql.transaction()` で原子性を確保しています。テーブル構成は指示書 4章のデータモデルに準拠 (店舗・メニュー・オプション・注文・お気に入り・提供記録など)。スキーマ変更は `src/lib/db/schema.sql` を編集して `npm run db:migrate` を再実行してください(`CREATE ... IF NOT EXISTS` のみなので毎回実行しても安全です)。
- **お客さん用アプリ** (`/order/[storeId]`): メニュー閲覧 → カスタマイズ → カート → 注文確定 → QRチケット表示 (`qrcode`で実際にQR画像を生成、中身は `order_token` のみ)。「いつもの」の登録・一覧・再注文にも対応。店舗をまたいだ「いつもの」はメニュー名で一致するものだけを表示。
- **レジアプリ** (`/register`): カメラでのQRスキャン (`jsQR` + `getUserMedia`、失敗時は手入力にフォールバック)、会計待ち一覧、現金/カード会計、提供記録。
- **管理画面** (`/admin`): 店舗/開催回の作成・公開切り替え、メニューCRUD(オプション・選択肢の編集込み)、画像アップロード。注文履歴がある商品は削除できず、非公開化を促すメッセージを返す。
- **認証**:
  - スタッフ (レジ/管理画面): `username`/`password` + JWTセッションCookie。role は `admin` / `register`。
  - お客さん: 本番ではLIFF (`liff.getIDToken()`) をサーバー側でLINEの検証エンドポイントに照会する想定。**LINEログインチャネルが未設定の間は、開発用ログイン(名前を入力するだけ)に自動フォールバック**します (`NEXT_PUBLIC_LIFF_ID` が空の間だけ有効)。

## 本番投入前にやること

`.env` に以下を設定すると、開発用ログインは自動的に無効化され、実際のLIFFログインに切り替わります。

```
NEXT_PUBLIC_LIFF_ID=...       # LINE DevelopersのLIFF ID
LINE_LOGIN_CHANNEL_ID=...     # 同チャネルのChannel ID (IDトークン検証用)
AUTH_STAFF_SECRET=...         # 十分に長いランダム文字列に変更
AUTH_DEV_CUSTOMER_SECRET=...  # 同上
```

- 画像アップロードは現状 `public/uploads` へのローカル保存です。Vercelはファイルシステムが永続しないため、このままVercelにデプロイすると画像が消えます。Vercel Blob等への差し替えが必要 (`src/app/api/admin/upload/route.ts` の1ファイルを差し替えるだけで済む設計にしています) — 次のタスクとして予定しています。
- 指示書6章で未確定だった「提供記録→いつもの反映のフロー」は、現状「注文内容どおりに提供済みとして記録する」というシンプルな実装に留めています。実際に運用しながら承認ステップの要否を判断してください。
- 引き継ぎ指示書にあったプロトタイプJSXファイル一式が見つからなかったため、UIは仕様のテキストのみを根拠に作っています。元のプロトタイプが見つかった場合は、見た目周りは差し替えを推奨します。

## ディレクトリ構成の勘所

```
src/lib/db/          スキーマとDB接続
src/lib/data/        DBアクセス関数 (店舗・メニュー・注文・お気に入り・スタッフ)
src/lib/auth/        スタッフセッション / お客さん(LIFF)認証
src/lib/client/       ブラウザ側の状態管理 (カート・お客さん認証コンテキスト)
src/app/order/        お客さん用アプリ
src/app/register/     レジアプリ
src/app/admin/        管理画面
src/app/api/          上記3アプリが叩くAPI Routes
scripts/migrate.ts      schema.sqlをDBに適用するスクリプト (npm run db:migrate)
scripts/seed.ts         デモデータ投入スクリプト
```
