import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  ModuleDetail, 
  LearningQuestion, 
  AnswerEvaluation,
  AnswerHistoryItem,
  ChatHistoryMessage,
  generateLearningQuestions, 
  evaluateUserAnswer,
  generateConversationalResponse,
  generateDetailedExplanation,
  adjustExplanationLevel,
  estimateUserUnderstandingLevel,
  fetchChatCompletion
} from '@/services/openai';
import { generateFallbackChatMessage, generateFallbackQuestions } from '@/services/fallback';
import { saveProgress, getProgress, LearningProgress } from '@/services/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { getSessionTitle, getWelcomeMessage } from '@/lib/utils';
import { 
  validateLearningQuestion, 
  validateAnswerEvaluation, 
  validateAnswerHistoryItem,
  validateLearningProgress 
} from '@/lib/validation';
import { 
  OpenAIError, 
  NetworkError, 
  ValidationError, 
  AuthenticationError,
  ContentGenerationError,
  getFriendlyErrorMessage,
  getErrorType
} from '@/lib/errors';
import { 
  handleOpenAIError,
  handleNetworkError,
  handleValidationError,
  handleAuthenticationError,
  getErrorMessage,
  isRetryableError
} from '@/lib/errors';
import { useAuth } from '@/contexts/AuthContext';

// チャットセッションのタイプ
export type ChatSessionType = 'practice' | 'quiz' | 'review' | 'feedback';

// チャットメッセージの型定義
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isQuestion?: boolean;
  questionId?: string;
  isAnswer?: boolean;
  evaluation?: {
    isCorrect: boolean;
    score: number;
    feedback: string;
  };
}

// 学習セッションの状態
export interface LearningSession {
  id: string;
  type: ChatSessionType;
  title: string;
  messages: ChatMessage[];
  currentQuestion?: LearningQuestion;
  questions: LearningQuestion[];
  progress: {
    questionsAnswered: number;
    correctAnswers: number;
    totalQuestions: number;
    completed: boolean;
  };
  moduleDetail?: ModuleDetail;
  answerHistory: AnswerHistoryItem[];
}

// ユーザープロファイルの型定義
interface UserProfile {
  id?: string;
  username?: string;
  currentLevel?: 'beginner' | 'intermediate' | 'advanced';
  learningGoals?: string[];
  preferredTopics?: string[];
  studyHabits?: {
    preferredTime?: string;
    sessionsPerWeek?: number;
    minutesPerSession?: number;
  };
  strengths?: string[];
  weaknesses?: string[];
  [key: string]: any; // その他のプロパティはany型で許容
}

// LearningChatの状態
interface LearningChatState {
  activeSession: LearningSession | null;
  sessionsHistory: LearningSession[];
  isLoading: boolean;
  error: string | null;
}

// アクションタイプ
type ActionType =
  | { type: 'START_SESSION'; payload: { type: ChatSessionType; moduleDetail: ModuleDetail } }
  | { type: 'SEND_MESSAGE'; payload: { content: string; isAnswer?: boolean } }
  | { type: 'ADD_AI_MESSAGE'; payload: { content: string; isQuestion?: boolean; questionId?: string } }
  | { type: 'SET_QUESTIONS'; payload: LearningQuestion[] }
  | { type: 'SET_CURRENT_QUESTION'; payload: LearningQuestion }
  | { type: 'SET_EVALUATION'; payload: { messageId: string; evaluation: any } }
  | { type: 'UPDATE_PROGRESS'; payload: { questionsAnswered: number; correctAnswers: number; completed?: boolean } }
  | { type: 'COMPLETE_SESSION' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// 初期状態
const initialState: LearningChatState = {
  activeSession: null,
  sessionsHistory: [],
  isLoading: false,
  error: null
};

// セッションの初期状態を作成するヘルパー関数
function createInitialSession(type: ChatSessionType, moduleDetail: ModuleDetail): LearningSession {
  return {
    id: uuidv4(),
    type,
    title: getSessionTitle(type),
    messages: [
      {
        id: uuidv4(),
        sender: 'ai',
        content: getWelcomeMessage(type),
        timestamp: new Date()
      }
    ],
    questions: [],
    progress: {
      questionsAnswered: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      completed: false
    },
    moduleDetail,
    answerHistory: []
  };
}

// リデューサー
function learningChatReducer(state: LearningChatState, action: ActionType): LearningChatState {
  switch (action.type) {
    case 'START_SESSION': {
      const newSession = createInitialSession(action.payload.type, action.payload.moduleDetail);
      
      return {
        ...state,
        activeSession: newSession,
        sessionsHistory: [...state.sessionsHistory, newSession]
      };
    }
    
    case 'SEND_MESSAGE': {
      if (!state.activeSession) return state;
      
      const newMessage: ChatMessage = {
        id: uuidv4(),
        sender: 'user',
        content: action.payload.content,
        timestamp: new Date(),
        isAnswer: action.payload.isAnswer
      };
      
      const updatedSession = {
        ...state.activeSession,
        messages: [...state.activeSession.messages, newMessage]
      };
      
      return {
        ...state,
        activeSession: updatedSession,
        sessionsHistory: state.sessionsHistory.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      };
    }
    
    case 'ADD_AI_MESSAGE': {
      if (!state.activeSession) return state;
      
      const newMessage: ChatMessage = {
        id: uuidv4(),
        sender: 'ai',
        content: action.payload.content,
        timestamp: new Date(),
        isQuestion: action.payload.isQuestion,
        questionId: action.payload.questionId
      };
      
      const updatedSession = {
        ...state.activeSession,
        messages: [...state.activeSession.messages, newMessage]
      };
      
      return {
        ...state,
        activeSession: updatedSession,
        sessionsHistory: state.sessionsHistory.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      };
    }
    
    case 'SET_QUESTIONS': {
      if (!state.activeSession) return state;
      
      const updatedSession = {
        ...state.activeSession,
        questions: action.payload,
        progress: {
          ...state.activeSession.progress,
          totalQuestions: action.payload.length
        }
      };
      
      return {
        ...state,
        activeSession: updatedSession,
        sessionsHistory: state.sessionsHistory.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      };
    }
    
    case 'SET_CURRENT_QUESTION': {
      if (!state.activeSession) return state;
      
      const updatedSession = {
        ...state.activeSession,
        currentQuestion: action.payload
      };
      
      return {
        ...state,
        activeSession: updatedSession,
        sessionsHistory: state.sessionsHistory.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      };
    }
    
    case 'SET_EVALUATION': {
      if (!state.activeSession) return state;
      
      const updatedMessages = state.activeSession.messages.map(message => 
        message.id === action.payload.messageId 
          ? { ...message, evaluation: action.payload.evaluation }
          : message
      );
      
      // 回答履歴に追加
      const evaluatedMessage = updatedMessages.find(m => m.id === action.payload.messageId);
      const { answerHistory = [] } = state.activeSession;
      const updatedAnswerHistory = [...answerHistory];
      
      if (evaluatedMessage && evaluatedMessage.questionId) {
        const questionIndex = state.activeSession.questions.findIndex(
          q => q.id === evaluatedMessage.questionId
        );
        
        if (questionIndex >= 0) {
          const question = state.activeSession.questions[questionIndex];
          
          // 既存のエントリを更新または新しいエントリを追加
          const historyItem: AnswerHistoryItem = {
            id: uuidv4(),
            questionId: evaluatedMessage.questionId || '',
            question: question.question,
            userAnswer: evaluatedMessage.content,
            correctAnswer: question.expectedAnswer || '',
            isCorrect: action.payload.evaluation.isCorrect,
            score: action.payload.evaluation.score,
            feedback: action.payload.evaluation.feedback,
            timestamp: new Date(),
            timeSpent: 0 // デフォルト値を設定
          };
          
          // 既存のエントリを更新または新しいエントリを追加
          const existingIndex = updatedAnswerHistory.findIndex(h => h.questionId === evaluatedMessage.questionId);
          if (existingIndex >= 0) {
            updatedAnswerHistory[existingIndex] = historyItem;
          } else {
            updatedAnswerHistory.push(historyItem);
          }
        }
      }
      
      const updatedSession = {
        ...state.activeSession,
        messages: updatedMessages,
        answerHistory: updatedAnswerHistory
      };
      
      return {
        ...state,
        activeSession: updatedSession,
        sessionsHistory: state.sessionsHistory.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      };
    }
    
    case 'UPDATE_PROGRESS': {
      if (!state.activeSession) return state;
      
      const updatedProgress = {
        ...state.activeSession.progress,
        questionsAnswered: action.payload.questionsAnswered,
        correctAnswers: action.payload.correctAnswers,
        completed: action.payload.completed || state.activeSession.progress.completed
      };
      
      const updatedSession = {
        ...state.activeSession,
        progress: updatedProgress
      };
      
      return {
        ...state,
        activeSession: updatedSession,
        sessionsHistory: state.sessionsHistory.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      };
    }
    
    case 'COMPLETE_SESSION': {
      if (!state.activeSession) return state;
      
      const updatedSession = {
        ...state.activeSession,
        progress: {
          ...state.activeSession.progress,
          completed: true
        }
      };
      
      return {
        ...state,
        activeSession: updatedSession,
        sessionsHistory: state.sessionsHistory.map(session => 
          session.id === updatedSession.id ? updatedSession : session
        )
      };
    }
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    default:
      return state;
  }
}

// セッションタイプに応じたタイトルを取得
// function getSessionTitle(type: ChatSessionType): string {
//   switch (type) {
//     case 'practice':
//       return '練習問題セッション';
//     case 'quiz':
//       return '理解度チェッククイズ';
//     case 'review':
//       return '学習内容の復習';
//     case 'feedback':
//       return '学習進捗フィードバック';
//     default:
//       return '学習セッション';
//   }
// }

// セッションタイプに応じたウェルカムメッセージを取得
// function getWelcomeMessage(type: ChatSessionType): string {
//   switch (type) {
//     case 'practice':
//       return 'こんにちは！今日は練習問題に取り組んでいきましょう。学んだ内容を実践することで理解が深まります。準備ができたら、問題を始めます。';
//     case 'quiz':
//       return 'こんにちは！これから学習内容の理解度を確認するクイズを行います。落ち着いて問題に取り組んでくださいね。';
//     case 'review':
//       return 'こんにちは！これまでの学習内容を復習していきましょう。効果的な復習は記憶の定着に重要です。';
//     case 'feedback':
//       return 'こんにちは！これまでの学習進捗について振り返り、フィードバックを行います。学習の成果と今後の方向性について考えていきましょう。';
//     default:
//       return 'こんにちは！学習セッションへようこそ。何か質問があればいつでも聞いてくださいね。';
//   }
// }

// コンテキスト
export interface LearningChatContextType {
  state: LearningChatState;
  dispatch: React.Dispatch<ActionType>;
  startSession: (type: ChatSessionType, moduleDetail: ModuleDetail, sectionId?: string) => Promise<void>;
  sendMessage: (content: string, isAnswer?: boolean) => Promise<void>;
  completeSession: () => Promise<void>;
  saveProgress: (sessionId: string) => Promise<void>;
  getSuggestions: () => Promise<string[]>;
  getUserLearningLevel: () => Promise<'beginner' | 'intermediate' | 'advanced'>;
  adaptExplanationToLevel: (content: string, userLevel: 'beginner' | 'intermediate' | 'advanced') => Promise<string>;
  nextQuestion: () => void;
  requestExplanation: (topic: string, level?: 'basic' | 'intermediate' | 'advanced') => Promise<void>;
  askAboutTopic: (topic: string) => Promise<void>;
}

// LearningChatコンテキスト作成
const LearningChatContext = createContext<LearningChatContextType | undefined>(undefined);

export const LearningChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(learningChatReducer, initialState);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const { user } = useAuth();
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>({ currentLevel: 'beginner' });
  
  // ユーザーレベルの推定
  const getUserLevel = useCallback((): 'beginner' | 'intermediate' | 'advanced' => {
    // 履歴がない場合は初心者
    if (!state.activeSession || state.activeSession.answerHistory.length === 0) {
      return 'beginner';
    }
    
    const correctAnswers = state.activeSession.answerHistory.filter(h => h.isCorrect).length;
    const totalAnswers = state.activeSession.answerHistory.length;
    const correctRate = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;
    
    if (correctRate >= 0.8 && totalAnswers >= 5) {
      return 'advanced';
    } else if (correctRate >= 0.6 && totalAnswers >= 3) {
      return 'intermediate';
    }
    
    return 'beginner';
  }, [state.activeSession]);
  
  // 習熟度レベルを計算
  const calculateMasteryLevel = useCallback((session: LearningSession): number => {
    if (!session || !session.answerHistory || session.answerHistory.length === 0) {
      return 0;
    }
    
    const correctAnswers = session.answerHistory.filter(h => h.isCorrect).length;
    const totalAnswers = session.answerHistory.length;
    
    // 習熟度レベルを0-100の範囲で計算
    if (totalAnswers === 0) return 0;
    
    // 基本的な正答率に基づく習熟度
    const baseScore = (correctAnswers / totalAnswers) * 100;
    
    // 質問数に応じた補正（より多くの質問に答えるほど信頼性が高まる）
    const questionCountFactor = Math.min(1, totalAnswers / 10); // 10問以上で最大値
    
    return Math.round(baseScore * questionCountFactor);
  }, []);
  
  // パーソナライズされた応答を生成
  const generatePersonalizedResponse = useCallback(async (
    userMessage: string,
    conversationHistory: ChatMessage[],
    moduleDetail: ModuleDetail
  ): Promise<string> => {
    try {
      // 会話履歴からコンテキストを構築
      const chatHistory: ChatHistoryMessage[] = conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }));
      
      // プロファイル情報の取得
      let profile = userProfile;
      if (!profile) {
        profile = { currentLevel: 'beginner' };
      }
      
      // 応答の生成
      const response = await generateConversationalResponse(
        chatHistory,
        {
          moduleDetail: moduleDetail,
          userProfile: profile,
          includeReferences: true
        }
      );
      
      return response;
    } catch (error) {
      console.error('パーソナライズ応答生成エラー:', error);
      return generateFallbackChatMessage(
        'practice',
        '申し訳ありません、応答の生成中にエラーが発生しました。もう一度お試しください。'
      );
    }
  }, [userProfile]);
  
  // 現在のユーザーIDを取得
  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    return user?.id || null;
  }, [user]);
  
  // 質問の生成
  const generateQuestions = useCallback(async (
    moduleDetail: ModuleDetail,
    sessionType: ChatSessionType,
    sectionId?: string
  ): Promise<LearningQuestion[]> => {
    try {
      let questions: LearningQuestion[] = [];

      // セクションIDが指定されている場合はそのセクションの質問を使用
      if (sectionId) {
        const targetSection = moduleDetail.content.find(sec => sec.id === sectionId);
        if (targetSection && targetSection.questions && targetSection.questions.length > 0) {
          questions = targetSection.questions.map((q, idx) => ({
            id: `${sectionId}-q${idx + 1}`,
            question: q.question,
            expectedAnswer: (q as any).answer || (q as any).expectedAnswer || '',
            hint: q.hint,
            difficulty: getUserLevel(),
          }));
        }
      }

      // セクションに質問がなかった場合はAI生成 (セクション限定)
      if (questions.length === 0) {
        const partialDetail: ModuleDetail = {
          ...moduleDetail,
          content: sectionId
            ? moduleDetail.content.filter(sec => sec.id === sectionId)
            : moduleDetail.content
        };

        questions = await generateLearningQuestions(
          partialDetail,
          sessionType,
          sessionType === 'quiz' ? 10 : 5,
          getUserLevel()
        );
      }

      // バリデーション: 不正な質問を除外し、質問オブジェクトそのものを返す
      const validQuestions = questions.filter(q => validateLearningQuestion(q));

      // ヒントに答えが含まれている場合はマスク
      const sanitizedQuestions = validQuestions.map(q => {
        if (q.hint && q.expectedAnswer && q.hint.toLowerCase().includes(q.expectedAnswer.toLowerCase())) {
          return { ...q, hint: 'もう一度教材を振り返ってみましょう。' };
        }
        return q;
      });

      return sanitizedQuestions;
    } catch (error) {
      console.error('質問生成エラー:', error);
      
      // 生成に失敗した場合はフォールバック質問を使用
      console.log('フォールバック質問を使用します');
      const fallbackQuestions = generateFallbackQuestions(moduleDetail);
      
      // フォールバック使用の通知
      toast({
        title: '基本的な質問を使用',
        description: 'AI質問生成に問題が発生したため、基本的な質問を使用します。再試行するとより良い質問が生成されるかもしれません。',
        variant: 'default',
        duration: 5000,
      });
      
      return fallbackQuestions;
    }
  }, [getUserLevel]);
  
  // セッションを開始する
  const startSession = useCallback(async (type: ChatSessionType, moduleDetail: ModuleDetail, sectionId?: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'START_SESSION', payload: { type, moduleDetail } });
    
    try {
      // セッション開始時間を記録
      setSessionStartTime(new Date());
      
      // 既存のプログレスデータがあるか確認
      const userId = await getCurrentUserId();
      let existingProgress = null;
      
      if (userId) {
        existingProgress = await getProgress(userId, moduleDetail.id, type);
        
        // 既存の進捗データがある場合は状態を更新
        if (existingProgress) {
          dispatch({
            type: 'UPDATE_PROGRESS',
            payload: {
              questionsAnswered: existingProgress.questionsAnswered,
              correctAnswers: existingProgress.correctAnswers
            }
          });
        }
      }
      
      // 質問生成を試みる
      try {
        const questions = await generateQuestions(moduleDetail, type, sectionId);
        
        if (questions && questions.length > 0) {
          // 質問をセット
          dispatch({ type: 'SET_QUESTIONS', payload: questions });
          
          // 最初の質問を設定
          dispatch({ type: 'SET_CURRENT_QUESTION', payload: questions[0] });
          
          // 最初の質問をメッセージとして追加
          dispatch({ 
            type: 'ADD_AI_MESSAGE', 
            payload: { 
              content: `問題 1/${questions.length}: ${questions[0].question}${questions[0].hint ? `\n\nヒント: ${questions[0].hint}` : ''}`, 
              isQuestion: true,
              questionId: questions[0].id
            } 
          });
          
          // Supabaseに初期進捗データの更新
          if (userId) {
            await saveProgress({
              userId,
              moduleId: moduleDetail.id,
              sessionType: type,
              questionsAnswered: 0,
              correctAnswers: 0,
              totalQuestions: questions.length,
              completed: false,
              lastUpdated: new Date().toISOString()
            });
          }
        } else {
          throw new Error('質問の生成に失敗しました');
        }
      } catch (error) {
        console.error('質問生成エラー:', error);
        
        // フォールバック質問を使用
        const fallbackQuestions = generateFallbackQuestions(moduleDetail);
        
        // 質問をセット
        dispatch({ type: 'SET_QUESTIONS', payload: fallbackQuestions });
        
        // 最初の質問を設定
        dispatch({ type: 'SET_CURRENT_QUESTION', payload: fallbackQuestions[0] });
        
        // 最初の質問をメッセージとして追加
        dispatch({ 
          type: 'ADD_AI_MESSAGE', 
          payload: { 
            content: `問題 1/${fallbackQuestions.length}: ${fallbackQuestions[0].question}${fallbackQuestions[0].hint ? `\n\nヒント: ${fallbackQuestions[0].hint}` : ''}`, 
            isQuestion: true,
            questionId: fallbackQuestions[0].id
          } 
        });
        
        // フォールバック使用の通知
        toast({
          title: '基本的な質問を使用',
          description: 'AI質問生成に問題が発生したため、基本的な質問を使用します。再試行するとより良い質問が生成されるかもしれません。',
          variant: 'default',
          duration: 5000,
        });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('セッション開始エラー:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : '不明なエラーが発生しました' 
      });
      
      // エラーメッセージを表示
      toast({
        title: 'セッション開始エラー',
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        variant: 'destructive',
      });
      
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [getCurrentUserId, generateQuestions]);
  
  // 学習履歴から学習レベルを推定する関数
  const getUserLearningLevel = useCallback(async (): Promise<'beginner' | 'intermediate' | 'advanced'> => {
    try {
      // ユーザーIDを取得
      const userId = await getCurrentUserId();
      if (!userId) return 'intermediate'; // デフォルト値
      
      // ユーザープロファイルからレベル情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('profile_data')
        .eq('id', userId)
        .single();
      
      if (profileError || !profileData?.profile_data) {
        console.log('プロファイルデータが取得できませんでした', profileError);
        return 'intermediate'; // データがない場合はデフォルト値
      }
      
      // プロファイルデータからレベル情報を抽出
      const profileDataAny = (profileData.profile_data || {}) as any;
      const profileAnswers = profileDataAny.answers || [];
      let explicitLevel: string | null = null;
      
      for (const answer of profileAnswers) {
        if (answer.question.includes('レベル') || 
            answer.question.includes('経験') || 
            answer.question.includes('知識')) {
          const answerText = answer.answer.toLowerCase();
          if (answerText.includes('初心者') || answerText.includes('beginner')) {
            explicitLevel = 'beginner';
            break;
          } else if (answerText.includes('中級') || answerText.includes('intermediate')) {
            explicitLevel = 'intermediate';
            break;
          } else if (answerText.includes('上級') || answerText.includes('advanced')) {
            explicitLevel = 'advanced';
            break;
          }
        }
      }
      
      if (explicitLevel) {
        return explicitLevel as 'beginner' | 'intermediate' | 'advanced';
      }
      
      // 明示的なレベルが指定されていない場合は学習履歴から推定
      const { data: historyData, error: historyError } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (historyError || !historyData) {
        console.log('学習履歴が取得できませんでした', historyError);
        return 'intermediate';
      }
      
      // 正答率に基づいてレベルを推定
      if (historyData.length === 0) return 'beginner';
      
      // 最新10件の学習記録から正答率を計算
      const recentSessions = historyData.slice(0, Math.min(10, historyData.length));
      let totalCorrect = 0;
      let totalQuestions = 0;
      
      recentSessions.forEach(session => {
        if ((session as any).questionsAnswered > 0) {
          totalCorrect += (session as any).correctAnswers || 0;
          totalQuestions += (session as any).questionsAnswered;
        }
      });
      
      if (totalQuestions === 0) return 'beginner';
      
      const accuracyRate = (totalCorrect / totalQuestions) * 100;
      
      if (accuracyRate < 50) return 'beginner';
      if (accuracyRate < 80) return 'intermediate';
      return 'advanced';
      
    } catch (error) {
      console.error('学習レベル推定エラー:', error);
      return 'intermediate'; // エラーが発生した場合はデフォルト値
    }
  }, [getCurrentUserId]);

  // 説明文をユーザーレベルに合わせて調整する関数
  const adaptExplanationToLevel = useCallback(async (
    content: string, 
    userLevel: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<string> => {
    try {
      return await adjustExplanationLevel(content, userLevel);
    } catch (error) {
      console.error('説明レベル調整エラー:', error);
      return content; // エラーが発生した場合は元の内容を返す
    }
  }, []);

  // ユーザーの回答パターンに基づいてパーソナライズされた質問の提案を取得
  const getSuggestions = useCallback(async (): Promise<string[]> => {
    try {
      if (!state.activeSession) {
        return [];
      }
      
      // 現在のセッション状態と過去の回答履歴に基づいて提案を生成
      const userLevel = await getUserLevel();
      const moduleTitle = state.activeSession.moduleDetail?.title || '';
      const answerHistory = state.activeSession.answerHistory || [];
      
      // 正答率の計算
      const correctAnswers = answerHistory.filter(item => item.isCorrect).length;
      const accuracy = answerHistory.length > 0 
        ? (correctAnswers / answerHistory.length) * 100 
        : 100;
      
      // 弱点の特定
      const weakPoints: Record<string, number> = {};
      answerHistory.forEach(item => {
        // category フィールドは未使用
        // if (!item.isCorrect && (item as any).category) {
        //   weakPoints[(item as any).category as string] = (weakPoints[(item as any).category as string] || 0) + 1;
        // }
      });
      
      // 最も問題のあるカテゴリーを特定
      const weakCategories = Object.entries(weakPoints)
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category);
      
      // 提案文の生成
      const suggestions: string[] = [];
      
      // レベルに応じた基本的な提案
      if (userLevel === 'beginner') {
        suggestions.push(`${moduleTitle}の基本概念について教えてください。`);
        suggestions.push('この内容を初心者向けに説明してください。');
      } else if (userLevel === 'intermediate') {
        suggestions.push(`${moduleTitle}の実践的な応用例を教えてください。`);
        suggestions.push('この概念をより深く理解するにはどうすればよいですか？');
      } else {
        suggestions.push(`${moduleTitle}の最新のトレンドや高度な使用方法について教えてください。`);
        suggestions.push('この分野の専門家になるために必要なスキルは何ですか？');
      }
      
      // 正答率に基づく提案
      if (accuracy < 50) {
        suggestions.push('基本的な概念から復習したいです。');
        suggestions.push('もっと簡単な例で説明していただけますか？');
      } else if (accuracy < 80) {
        suggestions.push('理解できていない部分がありますので、もう少し詳しく説明してください。');
      }
      
      // 弱点カテゴリに基づく提案
      if (weakCategories.length > 0) {
        suggestions.push(`${weakCategories[0]}について詳しく教えてください。理解が不十分かもしれません。`);
      }
      
      // ユニークな提案のみを返す
      return [...new Set(suggestions)].slice(0, 3);
      
    } catch (error) {
      console.error('提案生成エラー:', error);
      return [
        'この内容についてもっと詳しく教えてください。',
        '実践的な例を教えてください。',
        'この概念をどのように応用できますか？'
      ];
    }
  }, [state.activeSession, getUserLevel]);

  // セッション開始時のユーザープロファイル取得
  const getUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) return null;
      
      // Supabaseからプロファイルを取得
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('プロファイル取得エラー:', error);
        return null;
      }
      
      if (!data) return null;
      
      // プロファイルデータを整形
      const profileDataAny = (data.profile_data || {}) as any;
      
      return {
        id: userId,
        username: data.username || 'ユーザー',
        currentLevel: profileDataAny.currentLevel || 'intermediate',
        learningGoals: profileDataAny.goals || [],
        preferredTopics: profileDataAny.preferredTopics || [],
        studyHabits: profileDataAny.studyHabits || {},
        strengths: profileDataAny.strengths || [],
        weaknesses: profileDataAny.weaknesses || []
      };
    } catch (error) {
      console.error('プロファイル取得処理エラー:', error);
      return null;
    }
  }, [getCurrentUserId]);

  // 複数ターンの会話履歴を考慮した応答生成
  const askAboutTopic = useCallback(async (topic: string) => {
    if (!state.activeSession) {
      console.error('No active session');
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // ユーザーメッセージの追加
      const userMessageContent = topic;
      dispatch({
        type: 'SEND_MESSAGE',
        payload: { content: userMessageContent }
      });
      
      // プロファイル情報の取得
      let profile = userProfile;
      if (!profile) {
        // Supabaseから取得する実装（ここでは省略）
        profile = { currentLevel: 'beginner' };
      }
      
      // 会話履歴の準備
      const chatHistory: ChatHistoryMessage[] = state.activeSession.messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }));
      
      // 応答の生成
      const response = await generateConversationalResponse(
        chatHistory,
        {
          moduleDetail: state.activeSession.moduleDetail,
          userProfile: profile,
          includeReferences: true
        }
      );
      
      // AIメッセージの追加
      dispatch({
        type: 'ADD_AI_MESSAGE',
        payload: { content: response }
      });
      
      // 進捗状況の更新
      // ここでは簡単な更新のみ。実際には理解度なども考慮すべき
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          questionsAnswered: state.activeSession.progress.questionsAnswered,
          correctAnswers: state.activeSession.progress.correctAnswers
        }
      });
      
    } catch (error) {
      console.error('Error asking about topic:', error);
      let errorMessage = 'トピックについての回答生成に失敗しました';
      
      if (error instanceof Error) {
        errorMessage = `トピックについての回答生成に失敗しました: ${error.message}`;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      // フォールバックメッセージを生成
      const fallbackMessage = generateFallbackChatMessage(
        state.activeSession.type,
        errorMessage
      );
      
      // エラーメッセージをチャットに追加
      dispatch({
        type: 'ADD_AI_MESSAGE',
        payload: { content: fallbackMessage }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.activeSession, userProfile]);
  
  // モジュール内容に基づいた詳細説明生成
  const requestExplanation = useCallback(async (
    topic: string, 
    level?: 'basic' | 'intermediate' | 'advanced'
  ) => {
    if (!state.activeSession) {
      console.error('No active session');
      return;
    }
    
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // ユーザーメッセージの追加
      const userMessageContent = `「${topic}」について詳しく教えてください`;
      dispatch({
        type: 'SEND_MESSAGE',
        payload: { content: userMessageContent }
      });
      
      // プロファイル情報の取得
      let profile = userProfile;
      if (!profile) {
        // Supabaseから取得する実装（ここでは省略）
        profile = { currentLevel: 'beginner' };
      }
      
      // ユーザーレベルの決定
      const userLevel = level || getUserLevel();
      
      // 詳細説明の生成
      const detailLevelMap: Record<string, 'basic' | 'intermediate' | 'advanced'> = {
        'beginner': 'basic',
        'intermediate': 'intermediate',
        'advanced': 'advanced'
      };
      
      const explanation = await generateDetailedExplanation(
        topic,
        state.activeSession.moduleDetail!,
        {
          detailLevel: detailLevelMap[userLevel],
          includeExamples: true,
          includeCode: userLevel !== 'beginner',
          userProfile: profile
        }
      );
      
      // フォーマットして表示
      let formattedExplanation = explanation.explanation;
      
      if (explanation.examples && explanation.examples.length > 0) {
        formattedExplanation += '\n\n例:\n';
        explanation.examples.forEach(example => {
          formattedExplanation += `\n${example.title}\n${example.content}\n`;
        });
      }
      
      if (explanation.relatedTopics && explanation.relatedTopics.length > 0) {
        formattedExplanation += '\n\n関連トピック:\n';
        formattedExplanation += explanation.relatedTopics.join(', ');
      }
      
      if (explanation.resources && explanation.resources.length > 0) {
        formattedExplanation += '\n\n参考リソース:\n';
        explanation.resources.forEach(resource => {
          formattedExplanation += `\n- ${resource.title}: ${resource.description} ${resource.url ? `[${resource.url}]` : ''}`;
        });
      }
      
      // AIメッセージの追加
      dispatch({
        type: 'ADD_AI_MESSAGE',
        payload: { content: formattedExplanation }
      });
      
    } catch (error) {
      console.error('Error generating detailed explanation:', error);
      let errorMessage = '詳細説明の生成に失敗しました';
      
      if (error instanceof Error) {
        errorMessage = `詳細説明の生成に失敗しました: ${error.message}`;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      // フォールバックメッセージを生成
      const fallbackMessage = generateFallbackChatMessage(
        state.activeSession.type,
        `「${topic}」の詳細説明を生成できませんでした。${errorMessage}`
      );
      
      // エラーメッセージをチャットに追加
      dispatch({
        type: 'ADD_AI_MESSAGE',
        payload: { content: fallbackMessage }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.activeSession, userProfile, getUserLevel]);
  
  // 質問から消費ポイント計算
  const getPointsForQuestion = useCallback((question: LearningQuestion): number => {
    const difficultyMultiplier = 
      question.difficulty === 'advanced' ? 2.0 :
      question.difficulty === 'intermediate' ? 1.5 : 1.0;
      
    return Math.round(10 * difficultyMultiplier);
  }, []);

  // 次の質問に進む
  const nextQuestion = useCallback(() => {
    if (!state.activeSession) return;
    
    // 既に表示された質問のIDを収集
    const askedQuestionIds = state.activeSession.messages
      .filter(m => m.isQuestion && m.questionId)
      .map(m => m.questionId);
    
    // 次の質問を探す
    const nextQuestion = state.activeSession.questions.find(
      q => !askedQuestionIds.includes(q.id)
    );
    
    if (nextQuestion) {
      // 次の質問を設定
      dispatch({ type: 'SET_CURRENT_QUESTION', payload: nextQuestion });
      
      // 質問番号を計算 (配列上のインデックス + 1 で確実に整数にする)
      const questionIndex = state.activeSession.questions.findIndex(q => q.id === nextQuestion.id);
      const questionNumber = questionIndex >= 0 ? questionIndex + 1 : askedQuestionIds.length + 1;
      
      // 次の質問をメッセージとして追加
      dispatch({ 
        type: 'ADD_AI_MESSAGE', 
        payload: { 
          content: `問題 ${questionNumber}/${state.activeSession?.progress.totalQuestions}: ${nextQuestion.question}${nextQuestion.hint ? `\n\nヒント: ${nextQuestion.hint}` : ''}`, 
          isQuestion: true,
          questionId: nextQuestion.id
        } 
      });
    }
  }, [state.activeSession]);
  
  // 回答評価処理関数
  const evaluateUserResponse = useCallback(async (userAnswer: string) => {
    if (!state.activeSession || !state.activeSession.currentQuestion) {
      console.error('アクティブな質問が見つかりません');
      return;
    }
    
    try {
      const question = state.activeSession.currentQuestion;
      console.log('回答評価開始:', userAnswer);
      
      // AIによる回答評価
      const evaluation = await evaluateUserAnswer(
        question, 
        userAnswer
      );
      
      console.log('回答評価結果:', evaluation);
      
      // 最後のメッセージ（ユーザーの回答）にevaluationをセット
      const lastMessage = state.activeSession.messages[state.activeSession.messages.length - 1];
      dispatch({ 
        type: 'SET_EVALUATION', 
        payload: { 
          messageId: lastMessage.id, 
          evaluation: {
            isCorrect: evaluation.isCorrect,
            score: evaluation.score,
            feedback: evaluation.feedback
          } 
        } 
      });
      
      // 進捗を更新
      const progress = state.activeSession.progress;
      const newQuestionsAnswered = progress.questionsAnswered + 1;
      const newCorrectAnswers = progress.correctAnswers + (evaluation.isCorrect ? 1 : 0);
      
      dispatch({
        type: 'UPDATE_PROGRESS',
        payload: {
          questionsAnswered: newQuestionsAnswered,
          correctAnswers: newCorrectAnswers
        }
      });
      
      // 回答履歴に追加
      const answerHistoryItem: AnswerHistoryItem = {
        id: uuidv4(),
        questionId: question.id,
        question: question.question,
        userAnswer: userAnswer,
        correctAnswer: question.expectedAnswer,
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        feedback: evaluation.feedback,
        timestamp: new Date().toISOString(),
        timeSpent: 0
      };
      
      // 自己肯定感を高めるポジティブなフィードバックへ変更
      let feedbackMessage = `${evaluation.isCorrect ? '🎉 正解です！よくできました！' : '❌ 不正解ですが、大丈夫。次はきっとうまくいきます！'}\n\n`;
      
      // AI からの追加フィードバックを簡潔に付加
      if (evaluation.feedback) {
        feedbackMessage += `${evaluation.feedback}\n\n`;
      }
      
      if (!evaluation.isCorrect && evaluation.correctAnswer) {
        feedbackMessage += `【正解】${evaluation.correctAnswer}\n\n`;
      }
      
      if (evaluation.explanation) {
        feedbackMessage += `解説: ${evaluation.explanation}\n\n`;
      }
      
      if (evaluation.furtherStudyTips) {
        feedbackMessage += `学習アドバイス: ${evaluation.furtherStudyTips}`;
      }
      
      // ユーザーのレベルに応じてフィードバックを調整
      const userLevel = await getUserLevel();
      const adjustedFeedback = await adaptExplanationToLevel(
        feedbackMessage,
        userLevel
      );
      
      // フィードバックメッセージを追加
      dispatch({ 
        type: 'ADD_AI_MESSAGE', 
        payload: { content: adjustedFeedback } 
      });
      
      // 進捗データをSupabaseに保存
      try {
        const userId = await getCurrentUserId();
        if (userId && state.activeSession.moduleDetail) {
          // Supabaseに保存
          await saveProgress({
            userId,
            moduleId: state.activeSession.moduleDetail.id,
            sessionType: state.activeSession.type,
            questionsAnswered: newQuestionsAnswered,
            correctAnswers: newCorrectAnswers,
            totalQuestions: progress.totalQuestions,
            completed: false,
            lastUpdated: new Date().toISOString(),
            timeSpent: 0,
            answerHistory: answerHistoryItem as any
          });
          
          console.log('学習進捗を保存しました');
        }
      } catch (error) {
        console.error('進捗保存エラー:', error);
      }
      
      // 次の質問へ移動するか、セッションを完了する
      const remainingQuestions = state.activeSession.questions.filter(
        q => !state.activeSession?.messages.some(m => m.questionId === q.id)
      );
      
      if (remainingQuestions.length > 0) {
        // 次の質問を表示
        setTimeout(() => {
          const nextQuestion = remainingQuestions[0];
          dispatch({ type: 'SET_CURRENT_QUESTION', payload: nextQuestion });
          
          // 次の質問をメッセージとして追加
          dispatch({ 
            type: 'ADD_AI_MESSAGE', 
            payload: { 
              content: `問題 ${state.activeSession?.progress.questionsAnswered + 1}/${state.activeSession?.progress.totalQuestions}: ${nextQuestion.question}${nextQuestion.hint ? `\n\nヒント: ${nextQuestion.hint}` : ''}`, 
              isQuestion: true,
              questionId: nextQuestion.id
            } 
          });
        }, 1500);
      } else {
        // すべての質問が終わったらセッションを完了
        setTimeout(async () => {
          const totalQuestions = state.activeSession?.progress.totalQuestions || 0;
          const correctAnswers = newCorrectAnswers;
          const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
          
          const summaryMessage = `
セッションが完了しました！

結果:
- 全${totalQuestions}問中${correctAnswers}問正解
- 正答率: ${score}%

${score >= 80 ? '素晴らしい結果です！' : score >= 60 ? '良い成績です。さらに復習して理解を深めましょう。' : '基本的な概念の復習が必要かもしれません。'}

またいつでも練習問題やクイズに挑戦できます。学習を続けていきましょう！`;
          
          dispatch({
            type: 'ADD_AI_MESSAGE',
            payload: { content: summaryMessage } 
          });
          
          dispatch({ type: 'COMPLETE_SESSION' });
          
          // セッション完了時にも進捗データを保存
          try {
            const userId = await getCurrentUserId();
            if (userId && state.activeSession?.moduleDetail) {
              // Supabaseに完了状態を保存
              await saveProgress({
                userId,
                moduleId: state.activeSession.moduleDetail.id,
                sessionType: state.activeSession.type,
                questionsAnswered: newQuestionsAnswered,
                correctAnswers: newCorrectAnswers,
                totalQuestions: totalQuestions,
                completed: true,
                lastUpdated: new Date().toISOString(),
                timeSpent: 0,
                answerHistory: answerHistoryItem as any
              });
              
              console.log('セッション完了を保存しました');
            }
          } catch (error) {
            console.error('セッション完了保存エラー:', error);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('回答評価エラー:', error);
      
      // エラー時のフォールバックメッセージ
      dispatch({ 
        type: 'ADD_AI_MESSAGE', 
        payload: { 
          content: 'すみません、回答の評価中にエラーが発生しました。もう一度お試しください。' 
        } 
      });
      
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : '不明なエラーが発生しました' 
      });
    }
  }, [state.activeSession, getCurrentUserId, getUserLevel, adaptExplanationToLevel]);
  
  // セッションを完了する
  const completeSession = useCallback(async () => {
    if (!state.activeSession) {
      return;
    }
    
    try {
      // セッション完了のステータスを設定
      dispatch({ type: 'COMPLETE_SESSION' });
      
      // 終了メッセージを追加
      const summaryMessage = state.activeSession.type === 'quiz'
        ? `クイズを終了しました。また挑戦してください！`
        : `学習セッションを終了しました。お疲れ様でした！`;
      
      dispatch({
        type: 'ADD_AI_MESSAGE',
        payload: { content: summaryMessage }
      });
      
      // 進捗データを更新
      const userId = await getCurrentUserId();
      if (userId && state.activeSession.moduleDetail) {
        await saveProgress({
          userId,
          moduleId: state.activeSession.moduleDetail.id,
          sessionType: state.activeSession.type,
          questionsAnswered: state.activeSession.progress.questionsAnswered,
          correctAnswers: state.activeSession.progress.correctAnswers,
          totalQuestions: state.activeSession.progress.totalQuestions,
          completed: true,
          lastUpdated: new Date().toISOString(),
          timeSpent: 0,
          answerHistory: state.activeSession.answerHistory as any
        });
      }
      
      // セッション終了時のトースト通知
      toast({
        title: 'セッション完了',
        description: '学習セッションが正常に完了しました',
        duration: 3000,
      });
      
    } catch (error) {
      console.error('セッション完了エラー:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : '不明なエラーが発生しました' 
      });
      
      toast({
        title: 'エラー',
        description: 'セッションの完了処理中にエラーが発生しました',
        variant: 'destructive',
      });
    }
  }, [state.activeSession, getCurrentUserId]);
  
  // 進捗を保存する
  const saveProgressToSupabase = useCallback(async (sessionId: string) => {
    const session = state.sessionsHistory.find(s => s.id === sessionId);
    if (!session || !session.moduleDetail) return;
    
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        // 回答履歴を取得
        const answerHistory = session.answerHistory || [];
        
        // 学習時間
        const sessionTime = timeSpent;
        
        // 習熟度レベルを計算
        const masteryLevel = calculateMasteryLevel(session);
        
        // Supabaseに保存
        await saveProgress({
          userId,
          moduleId: session.moduleDetail.id,
          sessionType: session.type,
          questionsAnswered: session.progress.questionsAnswered,
          correctAnswers: session.progress.correctAnswers,
          totalQuestions: session.progress.totalQuestions,
          completed: session.progress.completed,
          lastUpdated: new Date().toISOString(),
          timeSpent: sessionTime,
          masteryLevel,
          answerHistory: answerHistory as any
        });
        
        console.log('進捗と回答履歴を保存しました', {
          sessionId,
          answerHistoryCount: answerHistory.length,
          timeSpent: sessionTime,
          masteryLevel
        });
      }
    } catch (error) {
      console.error('進捗・回答履歴保存エラー:', error);
    }
  }, [state.sessionsHistory, getCurrentUserId, timeSpent, calculateMasteryLevel]);
  
  // メッセージを送信する
  const sendMessage = useCallback(async (content: string, isAnswer = false) => {
    if (!state.activeSession) {
      console.error('アクティブなセッションがありません');
      return;
    }
    
    // ユーザーメッセージをセッションに追加
    dispatch({ type: 'SEND_MESSAGE', payload: { content, isAnswer } });

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const moduleDetail = state.activeSession.moduleDetail;
      if (!moduleDetail) {
        throw new Error('モジュール詳細情報がありません');
      }
      
      // 現在のチャットセッションが質問応答中かどうか確認
      const isQuestionActive = !!state.activeSession.currentQuestion;
      
      if (isQuestionActive && isAnswer) {
        // 回答評価処理
        await evaluateUserResponse(content);
      } else {
        // 通常の会話応答を生成
        const aiResponse = await generatePersonalizedResponse(
          content,
          state.activeSession.messages,
          moduleDetail
        );
        
        // AIの応答をセッションに追加
        dispatch({ 
          type: 'ADD_AI_MESSAGE', 
          payload: { content: aiResponse } 
        });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      
      // エラー発生時のフォールバック応答
      const fallbackMessage = state.activeSession.type
        ? generateFallbackChatMessage(state.activeSession.type, '応答の生成中にエラーが発生しました')
        : 'すみません、応答の生成中にエラーが発生しました。もう一度お試しください。';
      
      dispatch({ 
        type: 'ADD_AI_MESSAGE', 
        payload: { content: fallbackMessage } 
      });
      
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error instanceof Error ? error.message : '不明なエラーが発生しました' 
      });
      
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.activeSession, evaluateUserResponse, generatePersonalizedResponse]);
  
  // コンテキスト値
  const contextValue = {
    state,
    dispatch,
    startSession,
    sendMessage,
    completeSession,
    saveProgress: saveProgressToSupabase,
    getSuggestions,
    getUserLearningLevel,
    adaptExplanationToLevel,
    nextQuestion,
    requestExplanation,
    askAboutTopic
  };
  
  return (
    <LearningChatContext.Provider value={contextValue}>
      {children}
    </LearningChatContext.Provider>
  );
}

// フック
export function useLearningChat() {
  const context = useContext(LearningChatContext);
  if (context === undefined) {
    throw new Error('useLearningChat must be used within a LearningChatProvider');
  }
  return context;
} 