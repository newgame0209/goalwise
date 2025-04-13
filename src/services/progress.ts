import { supabase } from "@/integrations/supabase/client";
import { ChatSessionType } from "@/components/LearningChat/LearningChatState";

// 学習進捗データの型定義
export interface LearningProgress {
  id?: string;
  userId: string;
  moduleId: string;
  sessionType: ChatSessionType;
  questionsAnswered: number;
  correctAnswers: number;
  totalQuestions: number;
  completed: boolean;
  lastUpdated: string;
  startedAt?: string;          // 学習開始時間
  timeSpent?: number;          // 学習に費やした時間（秒）
  masteryLevel?: number;       // 習熟度レベル（0-100）
  streak?: number;             // 連続学習日数
  currentLevel?: 'beginner' | 'intermediate' | 'advanced'; // 現在のユーザーレベル
  answerHistory?: {
    questionId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    score?: number;            // 得点
    feedback?: string;         // フィードバック
    timestamp: string;
    timeSpent?: number;        // 回答にかかった時間
    confidence?: number;       // 自己採点の信頼度
    category?: string;         // 質問カテゴリ
  }[];
  completion_percentage?: number;
}

// 学習アクティビティの概要
export interface ActivitySummary {
  totalSessions: number;      // 総セッション数
  lastActiveDate: string;     // 最後のアクティビティ日
  averageScore: number;       // 平均スコア
  weakCategories: string[];   // 弱点カテゴリ
  strongCategories: string[]; // 得意カテゴリ
  improvementRate: number;    // 改善率
  studyStreak: number;        // 学習連続日数
  totalTimeSpent: number;     // 総学習時間（分）
  recommendedFocus: string[]; // 推奨学習フォーカス
}

/**
 * 学習進捗データを保存する関数
 * @param progressData 保存する学習進捗データ
 * @returns 保存が成功したかどうか
 */
export const saveProgress = async (progressData: LearningProgress): Promise<boolean> => {
  try {
    console.log('保存する進捗データ:', progressData);

    if (!progressData.userId) {
      console.error('ユーザーIDがありません');
      return false;
    }

    // 既存の進捗データを確認
    const { data: existingData, error: fetchError } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', progressData.userId)
      .eq('module_id', progressData.moduleId)
      .eq('session_type', progressData.sessionType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116はデータが見つからないエラー
      console.error('進捗データの取得エラー:', fetchError);
      return false;
    }

    // データ形式の変換（スネークケース）
    const formattedData = {
      user_id: progressData.userId,
      module_id: progressData.moduleId,
      session_type: progressData.sessionType,
      questions_answered: progressData.questionsAnswered,
      correct_answers: progressData.correctAnswers,
      total_questions: progressData.totalQuestions,
      completed: progressData.completed,
      last_updated: new Date().toISOString(),
      answer_history: progressData.answerHistory || [],
      completion_percentage: progressData.completion_percentage || 0
    };

    let result;
    
    if (existingData) {
      // 既存データの更新
      result = await supabase
        .from('learning_progress')
        .update(formattedData)
        .eq('id', existingData.id);
    } else {
      // 新規データの挿入
      result = await supabase
        .from('learning_progress')
        .insert([formattedData]);
    }

    if (result.error) {
      console.error('進捗データの保存エラー:', result.error);
      return false;
    }

    console.log('進捗データを保存しました');
    return true;
  } catch (error) {
    console.error('進捗データの保存中に例外が発生しました:', error);
    return false;
  }
};

/**
 * モジュールの学習進捗データを取得する関数
 * @param userId ユーザーID
 * @param moduleId モジュールID
 * @param sessionType セッションタイプ
 * @returns 学習進捗データ
 */
export const getProgress = async (
  userId: string,
  moduleId: string,
  sessionType: ChatSessionType
): Promise<LearningProgress | null> => {
  try {
    const { data, error } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .eq('session_type', sessionType)
      .single();

    if (error) {
      console.error('進捗データの取得エラー:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // データ形式の変換（キャメルケース）
    return {
      id: data.id,
      userId: data.user_id,
      moduleId: data.module_id,
      sessionType: data.session_type as ChatSessionType,
      questionsAnswered: data.questions_answered,
      correctAnswers: data.correct_answers,
      totalQuestions: data.total_questions,
      completed: data.completed,
      lastUpdated: data.last_updated,
      answerHistory: data.answer_history,
      completion_percentage: data.completion_percentage || 0
    };
  } catch (error) {
    console.error('進捗データの取得中に例外が発生しました:', error);
    return null;
  }
};

/**
 * ユーザーの全モジュールの学習進捗を取得する関数
 * @param userId ユーザーID
 * @returns 全モジュールの学習進捗データ
 */
export const getAllProgress = async (userId: string): Promise<LearningProgress[]> => {
  try {
    const { data, error } = await supabase
      .from('learning_progress')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('進捗データ取得エラー:', error);
      return [];
    }

    // 学習開始済みのデータのみを返す
    return (data || []).filter(record => 
      record.started_at && // 学習開始日時があるもののみ
      record.session_type === 'content' // コンテンツ学習のみを対象
    ).map(record => ({
      ...record,
      completion_percentage: record.completion_percentage || 0 // 未設定の場合は0%
    }));

  } catch (error) {
    console.error('進捗データ取得エラー:', error);
    return [];
  }
};

/**
 * 学習進捗の概要を計算する関数
 * @param progressList 進捗データのリスト
 * @returns 学習進捗の概要
 */
export const calculateProgressSummary = (progressList: LearningProgress[]) => {
  // 学習開始済みのモジュールのみを対象に計算
  const startedModules = progressList.filter(p => p.started_at);
  
  return {
    totalModules: progressList.length,
    completedModules: startedModules.filter(p => p.completion_percentage === 100).length,
    completionRate: startedModules.length > 0 
      ? (startedModules.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / startedModules.length)
      : 0,
    totalQuestionsAnswered: startedModules.reduce((sum, p) => sum + (p.questions_answered || 0), 0),
    totalCorrectAnswers: startedModules.reduce((sum, p) => sum + (p.correct_answers || 0), 0),
    overallAccuracy: startedModules.reduce((sum, p) => sum + (p.questions_answered || 0), 0) > 0
      ? (startedModules.reduce((sum, p) => sum + (p.correct_answers || 0), 0) / 
         startedModules.reduce((sum, p) => sum + (p.questions_answered || 0), 0)) * 100
      : 0
  };
};

/**
 * ユーザーの学習アクティビティの概要を計算する関数
 * @param userId ユーザーID
 * @returns 学習アクティビティの概要
 */
export const calculateActivitySummary = async (userId: string): Promise<ActivitySummary> => {
  try {
    // 全ての進捗データを取得
    const progressList = await getAllProgress(userId);
    
    if (!progressList || progressList.length === 0) {
      return {
        totalSessions: 0,
        lastActiveDate: new Date().toISOString(),
        averageScore: 0,
        weakCategories: [],
        strongCategories: [],
        improvementRate: 0,
        studyStreak: 0,
        totalTimeSpent: 0,
        recommendedFocus: []
      };
    }
    
    // 最新の活動日
    const sortedByDate = [...progressList].sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
    const lastActiveDate = sortedByDate[0].lastUpdated;
    
    // 平均スコア計算
    let totalScore = 0;
    let totalAnswered = 0;
    
    progressList.forEach(progress => {
      if (progress.questionsAnswered > 0) {
        totalScore += progress.correctAnswers;
        totalAnswered += progress.questionsAnswered;
      }
    });
    
    const averageScore = totalAnswered > 0 ? (totalScore / totalAnswered) * 100 : 0;
    
    // カテゴリ分析
    const categoryPerformance: Record<string, { correct: number, total: number }> = {};
    
    progressList.forEach(progress => {
      if (progress.answerHistory) {
        progress.answerHistory.forEach(answer => {
          const category = answer.category || '未分類';
          
          if (!categoryPerformance[category]) {
            categoryPerformance[category] = { correct: 0, total: 0 };
          }
          
          categoryPerformance[category].total += 1;
          if (answer.isCorrect) {
            categoryPerformance[category].correct += 1;
          }
        });
      }
    });
    
    // カテゴリごとの正解率を計算
    const categoryAccuracy: Record<string, number> = {};
    Object.entries(categoryPerformance).forEach(([category, data]) => {
      categoryAccuracy[category] = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    });
    
    // 弱点/得意カテゴリを特定
    const categoryEntries = Object.entries(categoryAccuracy);
    categoryEntries.sort((a, b) => a[1] - b[1]);
    
    const weakCategories = categoryEntries
      .filter(([_, accuracy]) => accuracy < 60)
      .slice(0, 3)
      .map(([category]) => category);
    
    const strongCategories = categoryEntries
      .filter(([_, accuracy]) => accuracy > 80)
      .slice(-3)
      .map(([category]) => category);
    
    // 改善率の計算（最近5セッションと前5セッションの比較）
    const chronologicalProgress = [...progressList].sort(
      (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
    );
    
    let improvementRate = 0;
    
    if (chronologicalProgress.length >= 10) {
      const firstHalf = chronologicalProgress.slice(0, 5);
      const secondHalf = chronologicalProgress.slice(-5);
      
      const firstHalfAccuracy = calculateGroupAccuracy(firstHalf);
      const secondHalfAccuracy = calculateGroupAccuracy(secondHalf);
      
      improvementRate = secondHalfAccuracy - firstHalfAccuracy;
    }
    
    // 学習連続日数の計算
    const streak = calculateStudyStreak(chronologicalProgress);
    
    // 総学習時間の計算（分）
    const totalTimeSpent = progressList.reduce((total, progress) => {
      return total + (progress.timeSpent || 0);
    }, 0) / 60; // 秒から分への変換
    
    // 推奨学習フォーカスの決定
    const recommendedFocus = determineRecommendedFocus(weakCategories, categoryAccuracy, averageScore);
    
    return {
      totalSessions: progressList.length,
      lastActiveDate,
      averageScore,
      weakCategories,
      strongCategories,
      improvementRate,
      studyStreak: streak,
      totalTimeSpent,
      recommendedFocus
    };
  } catch (error) {
    console.error('アクティビティ概要の計算エラー:', error);
    return {
      totalSessions: 0,
      lastActiveDate: new Date().toISOString(),
      averageScore: 0,
      weakCategories: [],
      strongCategories: [],
      improvementRate: 0,
      studyStreak: 0,
      totalTimeSpent: 0,
      recommendedFocus: []
    };
  }
};

/**
 * 学習セッションのグループの正解率を計算
 */
function calculateGroupAccuracy(sessions: LearningProgress[]): number {
  const totalCorrect = sessions.reduce((sum, session) => sum + session.correctAnswers, 0);
  const totalQuestions = sessions.reduce((sum, session) => sum + session.questionsAnswered, 0);
  
  return totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
}

/**
 * 学習連続日数を計算
 */
function calculateStudyStreak(sessions: LearningProgress[]): number {
  if (sessions.length === 0) return 0;
  
  // 日付ごとにセッションをグループ化
  const dateMap: Record<string, boolean> = {};
  
  sessions.forEach(session => {
    const date = new Date(session.lastUpdated).toISOString().split('T')[0];
    dateMap[date] = true;
  });
  
  const dates = Object.keys(dateMap).sort();
  if (dates.length === 0) return 0;
  
  // 最新の日付
  const latestDate = new Date(dates[dates.length - 1]);
  
  // 現在の日付と最新の学習日の差が1日以上なら連続が途切れている
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const latestDateObj = new Date(latestDate);
  latestDateObj.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today.getTime() - latestDateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 1) return 0;
  
  // 連続日数を計算
  let streak = 1;
  for (let i = dates.length - 2; i >= 0; i--) {
    const currentDate = new Date(dates[i]);
    const nextDate = new Date(dates[i + 1]);
    
    const diffTime = nextDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * 推奨学習フォーカスを決定
 */
function determineRecommendedFocus(
  weakCategories: string[],
  categoryAccuracy: Record<string, number>,
  averageScore: number
): string[] {
  const recommendations: string[] = [];
  
  // 弱点カテゴリがあれば最優先
  if (weakCategories.length > 0) {
    recommendations.push(...weakCategories.slice(0, 2));
  }
  
  // 全体の正解率が低い場合は基本に戻る
  if (averageScore < 50) {
    recommendations.push('基礎概念の復習');
  }
  
  // 中程度の正解率カテゴリも改善の余地あり
  const mediumCategories = Object.entries(categoryAccuracy)
    .filter(([_, accuracy]) => accuracy >= 60 && accuracy <= 80)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 1)
    .map(([category]) => category);
  
  if (mediumCategories.length > 0) {
    recommendations.push(...mediumCategories);
  }
  
  // 推奨が少ない場合は一般的な推奨を追加
  if (recommendations.length < 2) {
    if (averageScore > 80) {
      recommendations.push('応用問題への挑戦');
    } else if (averageScore > 60) {
      recommendations.push('実践的な問題解決');
    } else {
      recommendations.push('基本コンセプトの強化');
    }
  }
  
  return recommendations.slice(0, 3); // 最大3つの推奨に制限
}

export const initializeProgress = async (userId: string, moduleId: string): Promise<boolean> => {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('learning_progress')
      .insert({
        user_id: userId,
        module_id: moduleId,
        completion_percentage: 0,
        session_type: 'content',
        started_at: now,
        updated_at: now
      });

    if (error) {
      console.error('進捗初期化エラー:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('進捗初期化エラー:', error);
    return false;
  }
}; 