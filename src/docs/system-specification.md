# 教材自動生成システム 仕様書

## フロントエンド仕様

### 技術スタック
- フレームワーク: React + TypeScript
- ビルドツール: Vite
- UIライブラリ: shadcn/ui
- スタイリング: Tailwind CSS
- 状態管理: React Query
- ルーティング: React Router
- アイコン: lucide-react
- グラフ表示: recharts

### ファイル構造
```
src/
├── components/         # 共通コンポーネント
│   ├── ChatWidget/     # AIチャットボット関連
│   │   ├── ChatMessage.tsx
│   │   ├── ChatState.tsx
│   │   ├── ChatWidget.tsx
│   │   ├── TypingIndicator.tsx
│   │   └── index.ts
│   ├── ContentGenerator.tsx
│   ├── FeatureCard.tsx
│   ├── Footer.tsx
│   ├── Hero.tsx
│   ├── LearningPlan.tsx
│   ├── MaterialCard.tsx
│   ├── MaterialContent.tsx
│   ├── MaterialSidebar.tsx
│   ├── Navbar.tsx
│   ├── ProtectedRoute.tsx
│   └── ui/             # shadcn/uiコンポーネント
├── contexts/
│   └── AuthContext.tsx # 認証コンテキスト
├── docs/               # ドキュメント
│   ├── implementation-roadmap.md
│   ├── prioritized-tasks.md
│   └── system-specification.md
├── hooks/              # カスタムフック
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── integrations/       # 外部連携
│   └── supabase/       # Supabase連携
│       ├── client.ts
│       └── types.ts
├── lib/                # ユーティリティ
│   └── utils.ts
├── pages/              # ページコンポーネント
│   ├── Dashboard.tsx
│   ├── Index.tsx
│   ├── Login.tsx
│   ├── MaterialDetail.tsx
│   ├── MaterialSample.tsx  # 教材表示のサンプルページ（本番環境の教材ページとして使用）
│   ├── Materials.tsx
│   ├── NotFound.tsx
│   ├── Profiling.tsx
│   └── SignUp.tsx
├── services/           # サービス
│   └── openai.ts
├── App.css
├── App.tsx             # メインアプリコンポーネント
├── index.css
├── main.tsx            # エントリーポイント
└── vite-env.d.ts
```

### 主要コンポーネント詳細
1. **認証関連**
   - **Login.tsx**: メールアドレスとパスワードによるログイン機能、Supabaseの認証APIを使用
   - **SignUp.tsx**: 新規ユーザー登録、必須項目はメールアドレスとパスワード
   - **ProtectedRoute.tsx**: 認証ステータスに基づくルート保護、未認証ユーザーのリダイレクト処理、およびプロファイル未完了ユーザーのプロファイリングページへの誘導

2. **プロファイリング機能**
   - **Profiling.tsx**: 
     - プロファイリング進行状況の表示
     - AIチャットUIを通じたユーザー情報収集
     - プロファイル完了検出とカリキュラム生成プロセスの開始
     - 生成進捗表示とステップ説明
   - **ChatWidget/**: 
     - **ChatWidget.tsx**: チャットインターフェースのメインコンポーネント、メッセージ入力と送信機能
     - **ChatMessage.tsx**: ユーザーとAIメッセージの表示、Markdownレンダリング対応
     - **TypingIndicator.tsx**: AIの応答待ち表示
     - **ChatState.tsx**: チャット状態・メッセージ管理、プロファイル完了フラグの管理

3. **ダッシュボード機能**
   - **Dashboard.tsx**: 
     - ユーザーメインダッシュボード画面
     - 学習進捗サマリー表示
     - 次の推奨教材カード表示
     - カリキュラム概要表示
   - **MaterialCard.tsx**: 
     - 教材カード表示コンポーネント
     - タイトル、説明、画像、カ��ゴリタグ、所要時間、進捗率表示
     - 難易度バッジ（初級/中級/上級）表示
     - クリック時の詳細ページへの遷移

4. **教材関連**
   - **Materials.tsx**: 教材一覧ページ、フィルタリング機能
   - **MaterialDetail.tsx**: 教材詳細ページ、学習進捗管理
   - **MaterialSample.tsx**: 教材表示の本番環境用サンプルページ、サイドバー付きのタブベースインターフェース
   - **MaterialContent.tsx**: メインコンテンツ表示コンポーネント、タブによる内容切り替え
   - **MaterialSidebar.tsx**: 教材のナビゲーションサイドバー、進捗表示
   - **ContentGenerator.tsx**: AIによるコンテンツ自動生成コンポーネント

5. **共通コンポーネント**
   - **Navbar.tsx**: ナビゲーションバー、ロゴ、メニュー、認証状態表示
   - **Footer.tsx**: フッター情報
   - **FeatureCard.tsx**: 機能説明カード（主にランディングページで使用）
   - **Hero.tsx**: ランディングページのヒーローセクション
   - **LearningPlan.tsx**: 学習計画表示コンポーネント
   - **ui/**: shadcn/uiベースのデザインシステムコンポーネント群

### ルーティング構造
```
/                   # ランディングページ (Index.tsx)
/login              # ログインページ (Login.tsx)
/signup             # 新規登録ページ (SignUp.tsx)
/profiling          # プロファイリングページ (Profiling.tsx)
/dashboard          # ダッシュボード (Dashboard.tsx)
/materials          # 教材一覧 (Materials.tsx)
/materials/:id      # 教材詳細 (MaterialDetail.tsx)
/material-sample    # 教材サンプルページ (MaterialSample.tsx)
*                   # 404ページ (NotFound.tsx)
```

### 状態管理
1. **認証状態**
   - `AuthContext.tsx`: ユーザー認証状態の管理、ログイン/ログアウト機能、ユーザー情報の提供
   - 主要状態: `user`、`loading`、`signUp`、`signIn`、`signOut`関数

2. **チャット状態**
   - `ChatState.tsx`: チャットウィジェットの状態管理
   - 主要状態: `isOpen`, `isMinimized`, `messages`, `profileCompleted`
   - 主要関数: `setIsOpen`, `setIsMinimized`, `addMessage`, `setProfileCompleted`

3. **トースト通知**
   - `use-toast.ts`: アプリケーション全体の通知システム
   - 主要関数: `toast`, `useToast`

## バックエンド仕様 (Supabase)

### データベース詳細構造

1. **profiles テーブル**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  profile_data JSONB,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. **user_curriculum テーブル**
```sql
CREATE TABLE user_curriculum (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  curriculum_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### JSONBデータ構造

1. **profile_data**の構造
```json
{
  "answers": [
    {
      "question": "現在のプログラミングスキルレベルを教えてください",
      "answer": "初心者（プログラミング経験なし）"
    },
    {
      "question": "学習の目的は何ですか？",
      "answer": "就職・転職のため"
    },
    {
      "question": "特に興味のある分野はありますか？",
      "answer": "Webフロントエンド開発"
    },
    ...
  ],
  "completed": true,
  "skills": {
    "programming": 1,
    "webDevelopment": 0,
    "dataScience": 0,
    ...
  },
  "interests": ["webFrontend", "mobileApp"],
  "goals": ["career", "project"],
  "timeCommitment": "medium",
  "learningStyle": "visual"
}
```

2. **curriculum_data**の構造
```json
{
  "title": "Webフロントエンド開発者への道",
  "description": "プログラミング未経験からWebフロントエンドエンジニアになるためのカリキュラム",
  "estimated_duration": "12週間",
  "difficulty": "beginner",
  "skills_covered": ["HTML", "CSS", "JavaScript", "React"],
  "modules": [
    {
      "id": "module1",
      "title": "HTML・CSS基礎",
      "description": "Webサイト構築の基礎となるHTML・CSSの基本を学びます",
      "estimated_duration": "2週間",
      "units": [
        {
          "id": "unit1-1",
          "title": "HTMLの基本構造",
          "type": "lesson",
          "content_id": "html-basics",
          "completed": false
        },
        ...
      ]
    },
    ...
  ]
}
```

### 認証システム
- Supabaseの組み込み認証システムを使用
- 認証方法
  - メールパスワード認証: 現在実装済み
  - ソーシャル認証（Google, GitHub）: 実装予定
- 認証後のフロー:
  1. ユーザー登録完了時にTriggerによるプロファイルレコード自動生成
  2. 初回ログイン時にプロファイリングページへ誘導
  3. プロファイル完了後はダッシュボードへ遷移

### バックエンド処理フロー
1. **ユーザー登録**
   - フロント: SignUp.tsxでメールアドレス・パスワード登録
   - バックエンド: Supabase Auth API経由でユーザー作成
   - トリガー: `on_auth_user_created`によるprofilesテーブルへのレコード自動作成

2. **プロファイリング**
   - フロント: Profiling.tsxとChatWidget.tsxでユーザー情報収集
   - バックエンド: profilesテーブルのprofile_dataカラムにJSONB形式で回答データを保存
   - 完了時: profile_completedをTRUEに更新

3. **カリキュラム生成**
   - フロント: プロファイル完了検出後にカリキュラム生成プロセス開始
   - バックエンド: （今後実装）OpenAIのAPIを使用して、profile_dataに基づいたカリキュラム生成
   - 保存先: user_curriculumテーブルのcurriculum_dataカラムにJSONB形式で保存

4. **学習管理**
   - 進捗追跡: user_curriculumテーブルのcurriculum_dataを更新
   - 教材アクセス: 教材IDに基づいた教材コンテンツの取得と表示

## 段階的な実装計画と進捗状況

### フェーズ1: 基盤整備（スプリント1-2）

1. **プロファイリングシステムの安定化** ✅
   - ChatWidgetコンポーネントの動作安定化
     - 実装箇所: `src/components/ChatWidget/ChatWidget.tsx`, `src/components/ChatWidget/ChatState.tsx`
     - 実装内容: メッセージの送受信ロジックの安定化、エラーハンドリングの追加
   - プロファイル完了検出の改善
     - 実装箇所: `src/components/ChatWidget/ChatState.tsx`
     - 実装内容: プロファイル完了を正確に検出する条件式の最適化
   - プロファイルデータ構造の最適化
     - 実装箇所: `src/services/openai.ts`の`ContentGenerationPrompt`インターフェース
     - 実装内容: プロファイルデータの型定義と構造の最適化
   - ユーザーの回答をより構造化されたデータに変換する処理の実装
     - 実装箇所: `src/components/ContentGenerator.tsx`内の`getCurrentUser`関数
     - 実装内容: ユーザー回答から構造化プロファイルデータへの変換ロジック

2. **データモデルの確立** ✅
   - 教材コンテンツのデータモデル詳細設計
     - 実装箇所: `src/services/openai.ts`の`GeneratedMaterial`、`ContentSection`等のインターフェース
     - 実装内容: 教材コンテンツの詳細な型定義とデータモデルの設計
   - カリキュラム構造の詳細設計
     - 実装箇所: `src/services/openai.ts`の`PlanNode`インターフェース
     - 実装内容: カリキュラムのノード構造の型定義と階層関係の設計
   - データバリデーション機能の実装
     - 実装箇所: `src/components/ContentGenerator.tsx`の`handleSubmit`関数
     - 実装内容: フォーム入力値のバリデーションロジックの実装

3. **OpenAI連携の基本実装** ✅
   - APIキー管理の改善（セキュアな保存方法）
     - 実装箇所: `src/services/openai.ts`の`setOpenAIKey`、`getOpenAIKey`関数
     - 実装内容: ローカルストレージを使用したAPIキーの保存と取得メカニズム
   - 基本的なプロンプト設計
     - 実装箇所: `src/services/openai.ts`の`createProfileBasedSystemPrompt`、`generateCurriculumSystemPrompt`関数
     - 実装内容: プロファイルデータに基づく最適化されたプロンプトの設計と生成
   - エラーハンドリングの強化
     - 実装箇所: `src/services/openai.ts`の`generateMaterialContent`関数内のtry-catchブロック
     - 実装内容: APIエラーの捕捉と適切なユーザーフィードバックの提供

### フェーズ2: 段階的生成システムの構築（スプリント3-4）

1. **カリキュラム構造生成機能** ⬜
   - プロファイルデータに基づくカリキュラム構造のプロンプト設計
   - 生成されたカリキュラム構造のバリデーション
   - カリキュラム表示コンポーネントの実装

2. **モジュール概要生成機能** ⬜
   - カリキュラム構造をインプットとするモジュール概要生成プロンプト設計
   - モジュール概要のバリデーションと最適化
   - モジュール一覧表示コンポーネントの実装

3. **段階的生成プロセスの管理** ⬜
   - 生成状態管理の実装（進行中、完了、エラーなど）
   - 段階間のデータ連携
   - プログレスバーとステータス表示の改善

### フェーズ3: 教材コンテンツ完全自動化（スプリント5-6）

1. **教材ページUIの詳細実装** ⏳
   - ヘッダーエリアの実装
     - ロゴ/ブランド名表示
     - ユーザー情報と進捗バーの表示
     - モジュール間ナビゲーション
   - サイドバー/サブナビの実装
     - KPIツリー/マインドマップの視覚的表示
     - モジュール一覧と進捗インジケーター
   - メインコンテンツエリアの実装
     - タブ/カード形式のモジュール表示
     - セクション（導入・理論・実例）の構造化表示
     - 関連リソース/参考資料リンクの配置
   - インタラクティブエリアの実装
     - AI対話セッションへの明確な誘導UI
     - シームレスなチャット移行フロー
   - フッターの実装
     - 利用規約・プライバシーポリシー等のリンク

2. **AIチャットシステムの強化** ⏳
   - チャット開始トリガーの設計
     - 自動誘導機能の実装
     - 手動トリガーUI
     - 定期的リマインダー機能
   - 例題提示システムの実装
     - セクション終了後の理解度確認例題
     - モジュール間の振り返り問題
     - ユーザー回答に応じた分岐シナリオ
     - 定期的な復習タイミング制御
   - 対話フローの設計と実装
     - イントロダクション・例題出題・フィードバック提供
     - 難易度調整と応用例題の動的生成
     - セッション終了と振り返り機能
   - パーソナライズ対話の実装
     - 過去の回答履歴に基づく難易度調整
     - フィードバックデータの蓄積と分析
     - UI間のシームレスな遷移

3. **拡張機能と統合** ⏳
   - TTS（Text-to-Speech）機能の実装
     - 教材テキストの音声再生機能
     - 音声設定（速度・声質）のカスタマイズ
   - 学習データ分析機能
     - 学習進捗のデータ可視化
     - 弱点分野の自動抽出と強化推奨
     - 最適な学習パスの推奨アルゴリズム
   - ユーザー間コラボレーション機能
     - 学習グループ・コミュニティ機能
     - 学習成果の共有メカニズム
     - ピアレビュー・相互フィードバック

4. **カリキュラム生成システムの高度化** 🔄
   - 構造化カリキュラムの自動生成
   - 学習目標に基づくKPIツリー構築
   - タイムラインと進捗管理の連動

### フェーズ4: エラーハンドリングとUI改善（スプリント7-8）

1. **生成エラーの検出と処理** ⬜
   - バリデーションエラーの詳細なログ記録
   - 再生成プロセスの自動化
   - ユーザーへのエラー通知の改善

2. **フォールバックシステム** ⬜
   - 部分的な生成失敗時のフォールバックコンテンツ
   - テンプレートベースのデフォルトコンテンツ
   - グレースフルデグラデーション戦略の実装

3. **UIの最適化** 🔄
   - ローディング状態の改善
   - レスポンシブデザインの徹底
   - アニメーションとトランジションの洗練
   - アクセシビリティの向上

### フェーズ5: フィードバックループと継続的改善（スプリント9-10）

1. **ユーザーフィードバック機能** ⬜
   - 教材コンテンツへの簡易フィードバック機能
   - 理解度自己評価機能
   - フィードバックデータの収集と分析

2. **プロンプト最適化システム** ⬜
   - フィードバックデータを基にしたプロンプト調整メカニズム
   - A/Bテスト機能の実装
   - プロンプトバージョン管理システム

3. **パフォーマンス最適化** ⬜
   - キャッシング戦略の実装
   - バンドルサイズの最適化
   - 遅延ローディングの導入

## 高度なコンテンツ生成アプローチ

### 構造化されたJSONレスポンスの厳格な要求

1. **強力なプロンプト指示**
   - AIへのプロンプトで、必ず特定のJSON構造で返すことを強く指示
   - 必須フィールドと期待する型を明示的に指定
   - 不適切なレスポンス形式に対するペナルティや再生成条件を含める

2. **厳格なバリデーション**
   - 受け取ったJSON応答の構造を検証する強固なバリデーションロジック
   - 必須フィールドの存在チェックと型チェック
   - ネストされたオブジェクト構造の一貫性チェック

3. **規範となるサンプル提供**
   - プロンプト内に高品質な応答サンプルを含める
   - サンプルは実際のユースケースに沿った具体的な例を示す
   - フォーマット、スタイル、詳細度のベンチマークを設定

### 段階的生成アプローチ

1. **マルチステップ生成プロセス**
   - 一度にすべてのコンテンツを生成するのではなく、「カリキュラム構造」→「各モジュールの概要」→「各モジュールの詳細」のような段階を踏む
   - 各ステップでAIからの出力を検証し、次のステップのプロンプトに組み込む
   - エラーや不適切な出力が検出された場合のフォールバック戦略を定義

2. **コンテキスト連鎖**
   - 前のステップの出力を後続のプロンプトに含める
   - 生成物間の一貫性を維持するための参照システム
   - 依存関係の明示的な管理（例：「モジュール3はモジュール1と2の概念に基づいています」）

3. **インクリメンタルな詳細化**
   - 高レベルから低レベルへと徐々に詳細を追加していく
   - 各段階で特定の目的に集中したプロンプト設計
   - ユーザーフィードバックやシステム検証に基づく反復改善

### テンプレート化とスロット方式

1. **モジュール化されたコンテンツ構造**
   - UIコンポーネントをより細分化し、AIが生成する「スロット」を明確に定義
   - 例えば「導入部」「例題」「練習問題」などの部分ごとに生成し、それぞれ専用のコンポーネントにマッピング
   - コンポーネント間の関係と依存性を明確に定義

2. **目的別テンプレート**
   - コンテンツタイプや難易度に応じた特化型テンプレート
   - 初心者向け、中級者向け、上級者向けの異なるテンプレート
   - 技術トピック、理論解説、実践演習などの目的別構造

3. **条件付きレンダリングロジック**
   - コンテンツの存在・品質に基づく表示ロジック
   - オプショナルセクションの管理（すべてのモジュールが同じ構造を持つ必要はない）
   - 代替コンテンツやフォールバックのスマートな選択メカニズム

### 失敗に強いシステム設計

1. **エラー検出と対応**
   - 生成されたコンテンツの検証ロジックを実装し、期待する構造と一致しない場合はフォールバックコンテンツを表示
   - 必須フィールドが欠けている場合、自動的に再生成リクエストを行う
   - エラーの種類と深刻度に基づいた段階的な対応戦略

2. **分散リスク戦略**
   - 大きな生成タスクを複数の小さなタスクに分割
   - 部分的な失敗が全体の生成を妨げないように設計
   - コンポーネント単位のフォールバックと再試行メカニズム

3. **キャッシュと状態保存**
   - 成功した生成結果の確実な保存
   - 部分的な成功を活用できるインクリメンタル生成と保存メカニズム
   - クライアント側とサーバー側の両方でのキャッシュ戦略

### ユーザーフィードバックループ

1. **インタラクティブなフィードバック収集**
   - 生成された教材に対する簡単なフィードバック機能を実装（「この説明はわかりやすかった」「この例題は難しすぎる」など）
   - セクションごとの粒度の細かいフィードバック収集
   - 暗黙的フィードバック（時間の使い方、ページ滞在時間など）の監視と分析

2. **フィードバック適応システム**
   - 収集したフィードバックを次回以降の生成プロンプトに組み込む
   - ユーザーの好みと理解レベルに基づいたパーソナライゼーション
   - フィードバックパターンに基づく自動プロンプト最適化

3. **学習進捗との統合**
   - 学習者の進行状況とフィードバックの相関分析
   - 理解度と満足度のメトリクスと生成パラメータの関連付け
   - 长期的な学習成果に基づくコンテンツ生成戦略の調整

### ハイブリッド生成方式

1. **コントロールとクリエイティビティのバランス**
   - 重要な部分（学習目標、構造、カリキュラム設計）はよりコントロールされたプロンプトで生成
   - 説明文や例題などの詳細コンテンツは、より自由度の高いプロンプトで生成
   - 教育的効果と創造性のバランスを最適化

2. **領域特化型プロンプト設計**
   - コンテン츠の種類に応じた専用プロンプト設計
   - 技術的正確性が求められる部分と説明力が求められる部分で異なるアプローチ
   - 特定のドメイン知識を強化するためのプロンプト補強

3. **マルチモデル戦略**
   - 異なるAIモデルの長所を活かした複合的アプローチ
   - 構造生成、内容生成、検証の各フェーズで最適なモデルを選択
   - モデル間の結果比較と品質保証メカニズム

## 実装のための具体的なアクション

1. **コンポーネント細分化**
   - MaterialContent.tsxを複数の小さなコンポーネントに分割し、AIが生成したコンテンツを各コンポーネントに適切にマッピング
   - 例：
     - `ContentSection.tsx`: メインコンテンツのセクション表示
     - `ExampleCard.tsx`: 例題表示専用コンポーネント
     - `QuestionSet.tsx`: 練習問題セットの表示
     - `SummaryPoints.tsx`: 要約ポイントの表示

2. **データ変換レイヤーの導入**
   - データモデルとUIコンポーネントの間に中間レイヤーを導入し、AIレスポンスを適切な形式に変換する処理を一元化
   - `contentTransformers.ts`: AIレスポンスからUIコンポーネント用データ構造への変換ロジック
   - `validationService.ts`: コンテンツ検証と欠陥検出ロジック

3. **エラー処理の強化**
   - エラー処理とフォールバックメカニズムを強化し、一部の生成が失敗しても全体のUXを損なわないように
   - `ErrorBoundary` コンポーネントの導入
   - フォールバックコンテンツライブラリの整備
   - 再試行メカニズムの実装

4. **プロンプトエンジニアリングの改善**
   - プロンプトテンプレートの体系化と管理システム
   - プロンプト効果の測定と分析
   - 自動プロンプト最適化実験の設計

5. **ユーザー体験の向上**
   - 生成プロセスの視覚的フィードバック強化
   - インタラクティブ要素の追加（例：内容の難易度調整スライダー）
   - カスタマイズオプションの拡充

## 技術的な実装詳細

### 生成プロセス管理のためのフックとサービス

```typescript
// コンテンツ生成ステータスの型定義
type GenerationStatus = 'idle' | 'generating-curriculum' | 'generating-modules' | 
                         'generating-content' | 'generating-summary' | 'generating-resources' | 
                         'complete' | 'error';

// 段階的生成プロセス管理のためのカスタムフック
function useStepwiseGeneration(profileData: ProfileData) {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [results, setResults] = useState<{
    curriculum?: CurriculumStructure;
    modules?: ModuleOverview[];
    content?: ContentSection[];
    summary?: string;
    resources?: Resource[];
  }>({});
  
  // 生成プロセスを開始する関数
  const startGeneration = async () => {
    try {
      setStatus('generating-curriculum');
      setProgress(10);
      
      // ステップ1: カリキュラム構造の生成
      const curriculum = await generateCurriculumStructure(profileData);
      setResults(prev => ({ ...prev, curriculum }));
      setCurrentStep(2);
      setProgress(30);
      
      // ステップ2: モジュール概要の生成
      setStatus('generating-modules');
      const modules = await generateModuleOverviews(curriculum);
      setResults(prev => ({ ...prev, modules }));
      setCurrentStep(3);
      setProgress(50);
      
      // ステップ3: コンテンツの生成
      setStatus('generating-content');
      const content = await generateDetailedContent(modules);
      setResults(prev => ({ ...prev, content }));
      setCurrentStep(4);
      setProgress(70);
      
      // ステップ4: 要約の生成
      setStatus('generating-summary');
      const summary = await generateSummary(content);
      setResults(prev => ({ ...prev, summary }));
      setCurrentStep(5);
      setProgress(90);
      
      // ステップ5: 補足資料の生成
      setStatus('generating-resources');
      const resources = await generateResources(content, summary);
      setResults(prev => ({ ...prev, resources }));
      
      // 完了
      setStatus('complete');
      setProgress(100);
      
    } catch (error) {
      console.error('生成プロセスエラー:', error);
      setStatus('error');
    }
  };
  
  return {
    status,
    progress,
    currentStep,
    results,
    startGeneration
  };
}
```

### JSONバリデーションとエラーハンドリング

```typescript
// 生成されたコンテンツを検証する関数
function validateGeneratedContent(content: any, schema: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  // 必須フィールドの存在チェック
  for (const field of schema.requiredFields) {
    if (!content[field]) {
      errors.push({
        field,
        type: 'missing_required_field',
        message: `必須フィールド「${field}」が見つかりません`
      });
    }
  }
  
  // 型チェック
  for (const [field, expectedType] of Object.entries(schema.fieldTypes)) {
    if (content[field] && typeof content[field] !== expectedType) {
      errors.push({
        field,
        type: 'invalid_type',
        message: `フィールド「${field}」の型が不正です。期待: ${expectedType}, 実際: ${typeof content[field]}`
      });
    }
  }
  
  // 構造的整合性チェック
  if (schema.structuralChecks) {
    for (const check of schema.structuralChecks) {
      const result = check(content);
      if (!result.valid) {
        errors.push({
          field: result.field,
          type: 'structural_error',
          message: result.message
        });
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// 検証エラー時のフォールバック戦略
async function handleValidationFailure(
  content: any, 
  errors: ValidationError[],
  regenerateFunction: Function
): Promise<any> {
  // エラーのログ記録
  console.error('コンテンツ検証エラー:', errors);
  
  // エラーの深刻度に基づく処理
  const criticalErrors = errors.filter(e => e.type === 'missing_required_field');
  
  if (criticalErrors.length > 0) {
    // 重大なエラーがある場合は再生成を試みる
    try {
      const regeneratedContent = await regenerateFunction({
        previousContent: content,
        errors: criticalErrors
      });
      
      // 再生成されたコンテンツも検証
      const validation = validateGeneratedContent(regeneratedContent, schema);
      if (validation.valid) {
        return regeneratedContent;
      } else {
        // 再生成も失敗した場合はフォールバックコンテンツを返す
        return generateFallbackContent(content, errors);
      }
    } catch (error) {
      console.error('コンテンツ再生成エラー:', error);
      return generateFallbackContent(content, errors);
    }
  } else {
    // 軽微なエラーの場合は修正を試みる
    return fixMinorContentIssues(content, errors);
  }
}
```

### コンテンツ生成プロンプトの最適化

```typescript
// 段階的に最適化されたプロンプトを生成する関数
function createOptimizedPrompt(
  stage: 'curriculum' | 'module' | 'content' | 'summary' | 'resources',
  context: any,
  userPreferences: UserPreferences
): string {
  // 基本プロンプト構造
  const basePrompt = {
    curriculum: `あなたは教育カリキュラム設計の専門家です。以下のユーザープロファイルに基づいて、最適な学習カリキュラムの構造を設計してください。`,
    module: `あなたは教育コンテンツ開発の専門家です。以下のカリキュラム構造に基づいて、各モジュールの詳細な概要を作成してください。`,
    content: `あなたは教育コンテンツライターです。以下のモジュール概要に基づいて、詳細な学習コンテンツを作成してください。`,
    summary: `あなたは教育コンテンツの要約専門家です。以下の学習コンテンツに基づいて、主要なポイントを抽出し簡潔な要約を作成してください。`,
    resources: `あなたは教育リソースキュレーターです。以下の学習コンテンツと要約に基づいて、最適な補足資料と参考リソースを提案してください。`
  };
  
  // ステージに応じた特殊指示
  const specialInstructions = {
    curriculum: `カリキュラムは学習者の目標と現在のスキルレベルに合わせて、段階的な成長を促す構造にしてください。`,
    module: `各モジュールは明確な学習目標を持ち、前のモジュールで学んだ内容を基に構築される形にしてください。`,
    content: `コンテンツには概念説明だけでなく、実践的な例と演習を含めてください。コードサンプルはすべて動作確認済みのものにしてください。`,
    summary: `要約は単なる内容の短縮ではなく、学習者が復習時に重要ポイントを素早く思い出せるような構造にしてください。`,
    resources: `リソースは単なるリンク集ではなく、なぜそのリソースが有用なのか、どのように活用すべきかの説明を含めてください。`
  };
  
  // ユーザー設定に基づく調整
  const userPreferenceAdjustments = {
    learningStyle: userPreferences.learningStyle === 'visual' 
      ? `視覚的な例や図表を多く含めてください。` 
      : userPreferences.learningStyle === 'practical'
        ? `実践的な演習と実例を重視してください。`
        : `概念の詳細な説明と理論的背景を重視してください。`,
    
    detailLevel: userPreferences.detailLevel === 'basic'
      ? `基本的な概念に焦点を当て、複雑な詳細は避けてください。`
      : userPreferences.detailLevel === 'intermediate'
        ? `基本と応用をバランスよく含めてください。`
        : `高度な概念と詳細な技術的説明を含めてください。`
  };
  
  // コンテキスト情報の統合
  const contextDescription = JSON.stringify(context);
  
  // 出力形式の指定
  const outputFormatInstructions = `
  以下の正確なJSON形式で出力してください：
  
  ${getOutputSchemaForStage(stage)}
  
  マークダウンやプレーンテキストではなく、必ず上記のJSON構造で返してください。
  `;
  
  // 完全なプロンプトの組み立て
  return `
  ${basePrompt[stage]}
  
  ${specialInstructions[stage]}
  
  ${userPreferenceAdjustments.learningStyle}
  ${userPreferenceAdjustments.detailLevel}
  
  以下のコンテキスト情報に基づいてください：
  ${contextDescription}
  
  ${outputFormatInstructions}
  `;
}

// ステージに応じた出力スキーマを取得
function getOutputSchemaForStage(stage: string): string {
  const schemas = {
    curriculum: `{
      "title": "カリキュラムのタイトル",
      "description": "カリキュラムの説明",
      "estimatedDuration": "推定学習期間",
      "difficulty": "難易度（beginner/intermediate/advanced）",
      "prerequisite": "前提条件",
      "learningOutcomes": ["学習成果1", "学習成果2", ...],
      "modules": [
        {
          "id": "モジュールID",
          "title": "モジュールタイトル",
          "description": "モジュールの説明",
          "estimatedDuration": "推定学習時間",
          "learningObjectives": ["学習目標1", "学習目標2", ...]
        },
        ...
      ]
    }`,
    
    // 他のステージのスキーマも同様に定義
    module: `...`,
    content: `...`,
    summary: `...`,
    resources: `...`
  };
  
  return schemas[stage] || schemas.curriculum;
}
```

このアプローチにより、段階的で高品質なコンテンツ生成が可能になり、ユーザーに最適化された学習体験を提供できます。
