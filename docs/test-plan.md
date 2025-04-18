# Goalwise Learning - テスト計画書

このドキュメントはGoalwise Learningアプリケーションの手動テスト計画を詳細に記述しています。テストの目的は、MVPとして実装した機能が正常に動作するかを確認することです。

## テスト環境

- 開発サーバー: `npm run dev`
- ブラウザ: Chrome, Safari
- テスト対象環境: デスクトップ、モバイル

## テスト優先順位

1. **最優先**: コア機能テスト（新規実装部分）
2. **高優先**: 安定性機能テスト（エラー処理と回復性）
3. **中優先**: ユーザーフロー全体のテスト
4. **低優先**: ブラウザ互換性

## 1. コア機能テスト（最近実装した主要機能）

### 1.1 プログレスバー改善テスト

| ID | テスト内容 | 期待される結果 | 確認結果 |
|----|-----------|--------------|--------|
| 1.1.1 | モジュールビューアーページでモジュール詳細生成時のプログレスインジケーター表示 | ProgressIndicatorコンポーネントが表示され、現在の進捗状況、ステップ情報、推定残り時間が表示される | [ ] |
| 1.1.2 | プログレスインジケーターの進捗更新 | 処理の進行に応じて進捗バーが更新され、パーセンテージ表示も変化する | [ ] |
| 1.1.3 | ステップ表示の確認 | 「ステップX/Y」の形式で現在のステップと全体のステップ数が表示される | [ ] |
| 1.1.4 | 残り時間表示の確認 | 「残り約XX秒」または「残り約XX分XX秒」の形式で表示される | [ ] |
| 1.1.5 | エラー状態の表示 | エラー発生時に適切なエラーメッセージとアイコンが表示される | [ ] |
| 1.1.6 | 完了状態の表示 | 処理完了時に適切な完了メッセージとアイコンが表示される | [ ] |

**テスト手順:**
1. 開発サーバーを起動: `npm run dev`
2. モジュールビューアーページに移動
3. 新しいモジュール詳細を生成する（既存データを削除するか新規モジュールを使用）
4. 生成プロセス中のプログレスインジケーターの各要素を確認

### 1.2 パーソナライズ対話機能テスト

| ID | テスト内容 | 期待される結果 | 確認結果 |
|----|-----------|--------------|--------|
| 1.2.1 | ユーザーレベルの自動推定 | ユーザープロファイルと学習履歴に基づいて適切なレベル（beginner/intermediate/advanced）が推定される | [ ] |
| 1.2.2 | ユーザーレベルに応じた回答の調整 | 初心者には詳細な説明、上級者には簡潔な説明が提供される | [ ] |
| 1.2.3 | パーソナライズされた提案の生成 | ユーザーの回答パターンに基づいた関連性の高い質問提案が表示される | [ ] |
| 1.2.4 | 弱点カテゴリに関する提案 | 誤答の多いカテゴリについて学習を深める提案が生成される | [ ] |
| 1.2.5 | 複数ターンの会話履歴を考慮した応答 | 過去の会話コンテキストを踏まえた一貫性のある応答が生成される | [ ] |

**テスト手順:**
1. 開発サーバーを起動: `npm run dev`
2. モジュールビューアーページで「AIチャット」タブに移動
3. チャットを開始し、複数の質問を入力
4. 回答の適応性と提案の関連性を確認
5. 誤答を含む質問に回答し、弱点カテゴリに関する提案の表示を確認

## 2. 安定性機能テスト（既に実装済み）

### 2.1 エラーハンドリングテスト

| ID | テスト内容 | 期待される結果 | 確認結果 |
|----|-----------|--------------|--------|
| 2.1.1 | APIキー未設定時の動作 | 適切なエラーメッセージが表示され、フォールバックコンテンツが提供される | [ ] |
| 2.1.2 | ネットワーク接続なしでの動作 | ネットワークエラーが検出され、適切なエラーメッセージと再試行オプションが表示される | [ ] |
| 2.1.3 | APIレート制限時の動作 | レート制限エラーが検出され、適切な待機メッセージが表示される | [ ] |
| 2.1.4 | 認証エラー時の動作 | 認証エラーが検出され、適切なエラーメッセージとトラブルシューティング情報が表示される | [ ] |

**テスト手順:**
1. APIキーを意図的に無効化してテスト
2. ネットワーク接続を切断してテスト（ブラウザのネットワークタブで）
3. 短時間に多数のリクエストを送信してレート制限を発生させる
4. 無効な認証情報でのテスト

### 2.2 フォールバックシステムテスト

| ID | テスト内容 | 期待される結果 | 確認結果 |
|----|-----------|--------------|--------|
| 2.2.1 | モジュール詳細生成失敗時のフォールバック | 基本的なフォールバックコンテンツが表示され、ユーザーに通知される | [ ] |
| 2.2.2 | 質問生成失敗時のフォールバック | 基本的なフォールバック質問が表示され、学習を続行できる | [ ] |
| 2.2.3 | チャット応答生成失敗時のフォールバック | 基本的なフォールバック応答が表示され、会話が途切れない | [ ] |
| 2.2.4 | フォールバック発生時のユーザー通知 | フォールバックが発生したことをユーザーに明確に通知する | [ ] |

**テスト手順:**
1. APIキーを無効化するか、ネットワーク接続を切断して各機能をテスト
2. フォールバックコンテンツが適切に表示されるか確認
3. フォールバック発生時の通知メッセージを確認

## 3. ユーザーフローテスト

### 3.1 初回訪問フロー

| ID | テスト内容 | 期待される結果 | 確認結果 |
|----|-----------|--------------|--------|
| 3.1.1 | プロファイリングからカリキュラム生成の流れ | プロファイリング完了後、カリキュラムが自動生成される | [ ] |
| 3.1.2 | カリキュラム生成中の進捗表示 | 生成中の進捗状況が明確に表示される | [ ] |
| 3.1.3 | カリキュラム生成完了後のダッシュボード表示 | 生成されたカリキュラムがダッシュボードに正しく表示される | [ ] |
| 3.1.4 | モジュール選択と詳細表示 | モジュールを選択すると詳細ページが表示される | [ ] |

**テスト手順:**
1. ローカルサーバーを起動してアプリケーションにアクセス
2. プロファイリングプロセスを完了
3. カリキュラム生成中の表示を確認
4. ダッシュボードで生成されたカリキュラムを確認
5. モジュールを選択して詳細ページの表示を確認

### 3.2 学習進捗管理フロー

| ID | テスト内容 | 期待される結果 | 確認結果 |
|----|-----------|--------------|--------|
| 3.2.1 | 学習セッション完了時の進捗保存 | セッション完了後、進捗状況がデータベースに保存される | [ ] |
| 3.2.2 | モジュールビューアーでの進捗表示 | モジュールページで現在の進捗率が正しく表示される | [ ] |
| 3.2.3 | ダッシュボードでの進捗表示 | ダッシュボードで各モジュールの進捗状況が正しく表示される | [ ] |
| 3.2.4 | 複数モジュールの進捗状況の正確性 | 複数のモジュールで学習を進めた場合、それぞれの進捗が個別に正しく記録・表示される | [ ] |

**テスト手順:**
1. モジュールビューアーページで学習セッションを完了
2. 進捗状況の更新を確認
3. ダッシュボードに戻り、全体の進捗状況を確認
4. 別のモジュールでも学習を進め、個別の進捗状況を確認

## 4. ブラウザ互換性テスト

| ID | テスト内容 | 期待される結果 | 確認結果 |
|----|-----------|--------------|--------|
| 4.1.1 | Chrome での表示・機能確認 | 全ての機能が正常に動作し、レイアウトが崩れない | [ ] |
| 4.1.2 | Safari での表示・機能確認 | 全ての機能が正常に動作し、レイアウトが崩れない | [ ] |
| 4.1.3 | モバイル表示の確認 | レスポンシブデザインが適切に機能し、モバイルでも使いやすい | [ ] |
| 4.1.4 | 画面サイズ変更時の動作確認 | ウィンドウサイズ変更時にレイアウトが適切に調整される | [ ] |

**テスト手順:**
1. 各ブラウザでアプリケーションを開き、主要機能をテスト
2. デベロッパーツールを使用してモバイル表示をシミュレート
3. ウィンドウサイズを変更しながらレイアウトの変化を確認

## テスト結果記録

テスト実施後、各項目の確認結果を[ ]内にチェックマーク（✓）または✗で記入し、問題点や改善点を以下に記録してください。

### 発見された問題

| ID | 問題の内容 | 重要度 | 修正方針 |
|----|-----------|-------|---------|
|    |           |       |         |

### 総合評価

- テスト完了日時：
- テスト実施者：
- 総合判定：[ ] 合格 [ ] 条件付き合格 [ ] 不合格

### 次のステップ

- 修正すべき課題：
- 強化すべき機能：
- 追加すべき機能： 