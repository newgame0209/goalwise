-- 学習進捗管理のためのテーブル作成
CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  session_type TEXT NOT NULL,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  answer_history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- インデックス
  CONSTRAINT unique_user_module_session UNIQUE (user_id, module_id, session_type)
);

-- RLSポリシーの設定
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- 所有者のみが自分の進捗を読み取れるポリシー
CREATE POLICY "ユーザーは自分の進捗データのみ閲覧可能" 
  ON learning_progress 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 所有者のみが自分の進捗を挿入できるポリシー
CREATE POLICY "ユーザーは自分の進捗データのみ挿入可能" 
  ON learning_progress 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 所有者のみが自分の進捗を更新できるポリシー
CREATE POLICY "ユーザーは自分の進捗データのみ更新可能" 
  ON learning_progress 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- 所有者のみが自分の進捗を削除できるポリシー
CREATE POLICY "ユーザーは自分の進捗データのみ削除可能" 
  ON learning_progress 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- インデックス（検索パフォーマンス向上のため）
CREATE INDEX idx_learning_progress_user_id ON learning_progress (user_id);
CREATE INDEX idx_learning_progress_module_id ON learning_progress (module_id);
CREATE INDEX idx_learning_progress_completed ON learning_progress (completed);

-- 進捗概要を取得するためのビューを作成
CREATE OR REPLACE VIEW user_progress_summary AS
SELECT 
  user_id,
  COUNT(DISTINCT module_id) AS total_modules,
  COUNT(DISTINCT CASE WHEN completed THEN module_id END) AS completed_modules,
  SUM(questions_answered) AS total_questions_answered,
  SUM(correct_answers) AS total_correct_answers,
  CASE 
    WHEN SUM(questions_answered) > 0 
    THEN (SUM(correct_answers)::FLOAT / SUM(questions_answered)) * 100 
    ELSE 0 
  END AS overall_accuracy,
  CASE 
    WHEN COUNT(DISTINCT module_id) > 0 
    THEN (COUNT(DISTINCT CASE WHEN completed THEN module_id END)::FLOAT / COUNT(DISTINCT module_id)) * 100 
    ELSE 0 
  END AS completion_rate
FROM learning_progress
GROUP BY user_id;

-- 進捗ビューのRLSポリシー
ALTER VIEW user_progress_summary SECURITY INVOKER;

-- 機能説明のコメント
COMMENT ON TABLE learning_progress IS '学習セッションごとの進捗や成績を保存するテーブル';
COMMENT ON COLUMN learning_progress.user_id IS 'ユーザーID（auth.usersテーブルを参照）';
COMMENT ON COLUMN learning_progress.module_id IS '学習モジュールのID';
COMMENT ON COLUMN learning_progress.session_type IS 'セッションタイプ（practice/quiz/review/feedback）';
COMMENT ON COLUMN learning_progress.questions_answered IS '回答した質問の数';
COMMENT ON COLUMN learning_progress.correct_answers IS '正解した質問の数';
COMMENT ON COLUMN learning_progress.total_questions IS 'セッションの合計質問数';
COMMENT ON COLUMN learning_progress.completed IS 'セッションが完了したかどうか';
COMMENT ON COLUMN learning_progress.answer_history IS '回答履歴（問題、ユーザー回答、正解などを含むJSON配列）';
COMMENT ON VIEW user_progress_summary IS 'ユーザーごとの学習進捗概要を表示するビュー'; 