import { 
  LearningQuestion, 
  AnswerEvaluation, 
  AnswerHistoryItem, 
  LearningProgress,
  ModuleDetail
} from '@/services/openai';

// モジュール詳細のバリデーション
export const validateModuleDetail = (detail: ModuleDetail): boolean => {
  if (!detail.id || !detail.title || !detail.description) {
    return false;
  }
  if (!Array.isArray(detail.content)) {
    return false;
  }
  return true;
};

// 学習質問のバリデーション
export const validateLearningQuestion = (question: LearningQuestion): boolean => {
  if (!question.id || !question.question || !question.expectedAnswer) {
    return false;
  }
  if (question.difficulty && !['beginner', 'intermediate', 'advanced'].includes(question.difficulty)) {
    return false;
  }
  return true;
};

// 回答評価のバリデーション
export const validateAnswerEvaluation = (evaluation: AnswerEvaluation): boolean => {
  if (typeof evaluation.isCorrect !== 'boolean' || 
      typeof evaluation.score !== 'number' || 
      !evaluation.feedback) {
    return false;
  }
  if (evaluation.score < 0 || evaluation.score > 100) {
    return false;
  }
  return true;
};

// 回答履歴アイテムのバリデーション
export const validateAnswerHistoryItem = (item: AnswerHistoryItem): boolean => {
  if (!item.id || !item.questionId || !item.question || 
      !item.userAnswer || !item.correctAnswer || 
      typeof item.isCorrect !== 'boolean') {
    return false;
  }
  
  // オプショナルフィールドの型チェック
  if ((item.score !== undefined && typeof item.score !== 'number') || 
      (item.feedback !== undefined && typeof item.feedback !== 'string') || 
      (item.timestamp !== undefined && typeof item.timestamp !== 'string' && !(item.timestamp instanceof Date)) || 
      (item.timeSpent !== undefined && typeof item.timeSpent !== 'number') || 
      (item.confidence !== undefined && typeof item.confidence !== 'number') || 
      (item.category !== undefined && typeof item.category !== 'string')) {
    return false;
  }

  // 有効な値の範囲チェック
  if ((item.score !== undefined && (item.score < 0 || item.score > 100)) ||
      (item.confidence !== undefined && (item.confidence < 0 || item.confidence > 100))) {
    return false;
  }
  
  return true;
};

// 学習進捗のバリデーション
export const validateLearningProgress = (progress: LearningProgress): boolean => {
  if (!progress.userId || 
      !progress.moduleId || 
      !progress.sessionType || 
      typeof progress.questionsAnswered !== 'number' || 
      typeof progress.correctAnswers !== 'number' || 
      typeof progress.totalQuestions !== 'number' || 
      typeof progress.completed !== 'boolean' || 
      !progress.lastUpdated) {
    return false;
  }
  
  // オプショナルフィールドの型チェック
  if ((progress.timeSpent !== undefined && typeof progress.timeSpent !== 'number') ||
      (progress.masteryLevel !== undefined && typeof progress.masteryLevel !== 'number') ||
      (progress.streak !== undefined && typeof progress.streak !== 'number') ||
      (progress.currentLevel !== undefined && 
       !['beginner', 'intermediate', 'advanced'].includes(progress.currentLevel)) ||
      (progress.answerHistory !== undefined && !Array.isArray(progress.answerHistory))) {
    return false;
  }
  
  // 有効な値の範囲チェック
  if ((progress.masteryLevel !== undefined && (progress.masteryLevel < 0 || progress.masteryLevel > 100)) ||
      (progress.questionsAnswered < 0) ||
      (progress.correctAnswers < 0) ||
      (progress.totalQuestions < 0) ||
      (progress.correctAnswers > progress.questionsAnswered)) {
    return false;
  }
  
  // answerHistoryの各アイテムをバリデーション
  if (progress.answerHistory && progress.answerHistory.length > 0) {
    // 簡易チェック - 深い検証は別のバリデーション関数で実行
    const validHistory = progress.answerHistory.every(item => 
      item.questionId && 
      item.question && 
      item.userAnswer !== undefined && 
      item.correctAnswer !== undefined &&
      typeof item.isCorrect === 'boolean'
    );
    
    if (!validHistory) {
      return false;
    }
  }
  
  return true;
};

// 回答履歴の配列をバリデーション
export const validateAnswerHistory = (history: AnswerHistoryItem[]): boolean => {
  return history.every(item => validateAnswerHistoryItem(item));
}; 