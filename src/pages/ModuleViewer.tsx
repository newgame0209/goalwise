import React, { useState, useEffect } from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MaterialSidebar from '@/components/MaterialSidebar';
import MaterialContent from '@/components/MaterialContent';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CurriculumStructure, generateModuleDetail, ModuleDetail } from '@/services/openai';
import { useSearchParams, useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, BookOpen, Loader2, AlertTriangle, Bot, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { LearningChat, LearningChatProvider } from '@/components/LearningChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLearningChat } from '@/components/LearningChat';
import { Card } from '@/components/ui/card';
import { ChatSessionType } from '@/components/LearningChat/LearningChatState';
import ResourceList from '@/components/Resources/ResourceList';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { generateFallbackModuleDetail, getFriendlyErrorMessage } from '@/services/fallback';
import { getOpenAIKey } from '@/services/openai';

interface ProgressState {
  introduction: number;
  theory: number;
  examples: number;
  practice: number;
  [key: string]: number; // インデックスシグネチャ
}

// ローディング状態の型定義
enum LoadingState {
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
  NO_DATA = 'no_data'
}

// エラー表示コンポーネント
const ErrorState = ({ 
  onRetry, 
  errorType = 'general', 
  errorMessage 
}: { 
  onRetry: () => void; 
  errorType?: 'network' | 'api' | 'auth' | 'general' | 'timeout'; 
  errorMessage?: string;
}) => {
  // エラーの種類に応じたメッセージを取得
  const getErrorDetails = () => {
    switch (errorType) {
      case 'network':
        return {
          title: 'ネットワーク接続エラー',
          message: errorMessage || 'インターネット接続を確認して、もう一度お試しください。',
          icon: <AlertTriangle className="h-5 w-5" />
        };
      case 'api':
        return {
          title: 'API接続エラー',
          message: errorMessage || 'AIコンテンツ生成サービスとの通信に失敗しました。しばらく待ってから再試行してください。',
          icon: <AlertCircle className="h-5 w-5" />
        };
      case 'auth':
        return {
          title: '認証エラー',
          message: errorMessage || 'APIキーが無効か認証に失敗しました。APIキー設定を確認してください。',
          icon: <AlertCircle className="h-5 w-5" />
        };
      case 'timeout':
        return {
          title: 'タイムアウトエラー',
          message: errorMessage || 'リクエストの処理に時間がかかりすぎています。サーバーが混雑している可能性があります。',
          icon: <AlertCircle className="h-5 w-5" />
        };
      default:
        return {
          title: 'コンテンツ生成エラー',
          message: errorMessage || 'モジュールのコンテンツを生成する際にエラーが発生しました。もう一度お試しください。',
          icon: <AlertTriangle className="h-5 w-5" />
        };
    }
  };

  const details = getErrorDetails();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-lg w-full">
        <Alert variant="destructive" className="mb-4">
          {details.icon}
          <AlertTitle>{details.title}</AlertTitle>
          <AlertDescription className="mt-2">
            {details.message}
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={onRetry} 
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                再試行
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => window.location.href = '/dashboard'} 
                className="flex items-center gap-2"
              >
                ダッシュボードに戻る
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {errorType === 'api' && (
          <div className="bg-muted p-4 rounded-md mt-4">
            <h3 className="text-sm font-medium mb-2">問題が解決しない場合：</h3>
            <ul className="text-sm list-disc list-inside space-y-1">
              <li>OpenAI APIキーが正しく設定されているか確認してください</li>
              <li>ネットワーク接続が安定していることを確認してください</li>
              <li>APIの利用制限に達していないか確認してください</li>
              <li>しばらく待ってから再度お試しください</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ローディング表示コンポーネント
const LoadingStateComponent = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-xl font-medium mb-2">コンテンツを生成しています</p>
      <p className="text-muted-foreground">少々お待ちください...</p>
    </div>
  );
};

const ModuleViewer = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { moduleId } = useParams<{ moduleId: string }>();
  
  const [activeModule, setActiveModule] = useState('introduction');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [progress, setProgress] = useState<ProgressState>({
    introduction: 0,
    theory: 0,
    examples: 0,
    practice: 0
  });
  
  // 生成状態を追跡する状態
  const [generationStatus, setGenerationStatus] = useState({
    status: '',
    progress: 0,
    estimatedTime: 0,
    step: 1, 
    totalSteps: 3
  });

  // 生成プロセスが開始されたかどうかを追跡
  const [generationStarted, setGenerationStarted] = useState(false);
  
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.LOADING);
  const [curriculum, setCurriculum] = useState<CurriculumStructure | null>(null);
  const [currentModule, setCurrentModule] = useState<any>(null);
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { startSession } = useLearningChat();
  const [activeTab, setActiveTab] = useState('content');
  const [chatSessionType, setChatSessionType] = useState<ChatSessionType>('practice');
  const [currentSectionId, setCurrentSectionId] = useState<string | undefined>(undefined);
  const [errorType, setErrorType] = useState<'network' | 'api' | 'auth' | 'general' | 'timeout'>('general');

  // カリキュラムデータを取得
  useEffect(() => {
    const fetchCurriculum = async () => {
      if (!user) return;
      
      try {
        setLoadingState(LoadingState.LOADING);
        const { data, error } = await supabase
          .from('user_curriculum')
          .select('curriculum_data')
          .eq('user_id', user.id)
          .single();
          
        if (error) {
          throw error;
        }
        
        if (data && data.curriculum_data) {
          // 型キャストを安全に行うため、まず unknown に変換
          const curriculumData = data.curriculum_data as unknown as CurriculumStructure;
          setCurriculum(curriculumData);
          
          // モジュールIDが指定されている場合は該当するモジュールを選択
          if (moduleId) {
            const module = curriculumData.modules.find(m => m.id === moduleId);
            if (module) {
              setCurrentModule(module);
              console.log('ModuleViewer: 現在のモジュールを設定:', module);
            } else {
              // モジュールが見つからない場合は最初のモジュールを選択
              setCurrentModule(curriculumData.modules[0]);
              console.log('ModuleViewer: 指定されたモジュールが見つからないため最初のモジュールを選択:', curriculumData.modules[0]);
            }
          } else {
            // モジュールIDが指定されていない場合は最初のモジュールを選択
            setCurrentModule(curriculumData.modules[0]);
            console.log('ModuleViewer: モジュールIDが指定されていないため最初のモジュールを選択:', curriculumData.modules[0]);
          }
          
          // 進捗情報の取得
          const { data: progressData, error: progressError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', user.id);
            
          if (progressError) {
            console.error('進捗データ取得エラー:', progressError);
          }
          
          // 進捗データの初期化（すべて0%から開始）
          const progressObj = { 
            introduction: 0,
            theory: 0,
            examples: 0,
            practice: 0
          } as ProgressState;
          
          curriculumData.modules.forEach((module: any) => {
            progressObj[module.id] = 0;
          });
          
          // 取得した進捗データを反映（実際に学習を開始したモジュールのみ）
          if (progressData) {
            progressData.forEach((record: any) => {
              if (record.module_id && 
                  record.completion_percentage && 
                  record.session_type === 'content' && 
                  record.started_at) { // 学習開始日時がある場合のみ進捗を反映
                progressObj[record.module_id] = record.completion_percentage;
              }
            });
          }
          
          setProgress(progressObj);
          
          // モジュールデータを取得したらすぐにモジュール詳細の生成を開始
          setTimeout(() => {
            generateModuleContent();
          }, 500);
        } else {
          setLoadingState(LoadingState.NO_DATA);
          setErrorMessage('カリキュラムデータが見つかりませんでした。まずはプロファイリングを完了させてください。');
        }
      } catch (error) {
        console.error('カリキュラムデータ取得エラー:', error);
        setLoadingState(LoadingState.ERROR);
        setErrorMessage('カリキュラムデータの取得に失敗しました。');
      }
    };

    fetchCurriculum();
  }, [user, moduleId]);
  
  // モジュール詳細を生成する関数
  const generateModuleContent = async () => {
    // currentModuleが設定されていない場合は処理をスキップ
    if (!currentModule) {
      console.log('ModuleViewer: currentModuleが設定されていません。処理をスキップします。');
      // フォールバックコンテンツを表示
      try {
        console.log('ModuleViewer: currentModuleが未設定のためフォールバックコンテンツを生成します');
        const fallbackContent = generateFallbackModuleDetail(null);
        if (fallbackContent) {
          console.log('ModuleViewer: フォールバックコンテンツを生成しました');
          setModuleDetail(fallbackContent);
          setLoadingState(LoadingState.SUCCESS);
          
          toast({
            title: 'フォールバックコンテンツを表示',
            description: 'コンテンツデータを取得できませんでした。基本的なコンテンツを表示しています。',
            variant: 'default',
          });
        }
      } catch (fallbackError) {
        console.error('ModuleViewer: フォールバックコンテンツ生成エラー:', fallbackError);
        setLoadingState(LoadingState.ERROR);
        setErrorMessage('コンテンツを表示できません。再度お試しください。');
      }
      return;
    }
    
    // APIキーが設定されているか確認
    const apiKey = getOpenAIKey();
    console.log('ModuleViewer: APIキー確認:', apiKey ? 'APIキーが設定されています' : 'APIキーが設定されていません');
    
    if (!apiKey) {
      setGenerationStatus({
        status: 'error',
        message: 'OpenAI APIキーが設定されていません。システム管理者にお問い合わせください。',
        step: 0,
        totalSteps: 0,
        estimatedTime: 0
      });
      
      toast({
        title: 'APIキーエラー',
        description: 'システム管理者にお問い合わせください',
        variant: 'destructive',
      });
      return;
    }

    // タイムアウト処理の追加
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        console.log('ModuleViewer: 生成プロセスがタイムアウトしました (3分)');
        reject(new Error('モジュール生成がタイムアウトしました。再度お試しください。'));
      }, 180000); // 3分でタイムアウト
    });

    try {
      console.log('ModuleViewer: モジュール生成プロセスを開始します。モジュールID:', moduleId);
      setLoadingState(LoadingState.LOADING);
      
      // ステップ1: モジュール詳細をSupabaseから検索
      setGenerationStatus({
        ...generationStatus,
        status: 'モジュール詳細を取得中...',
        progress: 10,
        estimatedTime: 30,
        step: 1,
        totalSteps: 3
      });
      console.log('ModuleViewer: ステップ1 - Supabaseからモジュール詳細の検索を開始');
      
      // Supabaseからモジュール詳細を検索
      const { data, error } = await supabase
        .from('module_details')
        .select('*')
        .eq('module_id', moduleId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = データが見つからない
        console.error('ModuleViewer: モジュール詳細取得エラー:', error);
        throw error;
      }
      
      // モジュール詳細が存在する場合はそれを使用
      if (data) {
        console.log('ModuleViewer: 既存のモジュール詳細を取得しました:', data);
        setModuleDetail(data.detail_data);
        setLoadingState(LoadingState.SUCCESS);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      } else {
        console.log('ModuleViewer: 既存のモジュール詳細がありません。新規生成を開始します');
      }
      
      // ステップ2: モジュール詳細が存在しない場合は生成
      setGenerationStatus({
        ...generationStatus,
        status: 'モジュール詳細を生成中...',
        progress: 30,
        estimatedTime: 120,
        step: 2,
        totalSteps: 3
      });
      console.log('ModuleViewer: ステップ2 - モジュール詳細の生成を開始');
      console.log('ModuleViewer: 現在のモジュール情報:', currentModule);
      
      // モジュール詳細を取得するためのコールバック関数
      const progressCallback = (status: string, progress: number, estimatedTime?: number) => {
        console.log(`ModuleViewer: 生成進捗 - ${status}, ${progress}%, 残り時間: ${estimatedTime || '不明'}秒`);
        setGenerationStatus({
          ...generationStatus,
          status,
          progress: 30 + (progress * 0.6), // 30%から90%の範囲で表示
          estimatedTime: estimatedTime || 0,
          step: 2,
          totalSteps: 3
        });
      };
      
      // モジュールがない場合は新規生成 (タイムアウト処理を追加)
      const generatePromise = generateModuleDetail(
        currentModule,
        { 
          maxRetries: 2, 
          retryDelay: 2000,
          onProgress: progressCallback
        }
      );
      
      // タイムアウト処理と生成処理を競争させる
      console.log('ModuleViewer: OpenAI APIによるモジュール詳細生成を開始（タイムアウト: 3分）');
      const moduleDetail = await Promise.race([generatePromise, timeoutPromise]);

      if (timeoutId) clearTimeout(timeoutId);
      
      if (!moduleDetail) {
        console.error('ModuleViewer: モジュール詳細が生成されませんでした');
        throw new Error('モジュール詳細の生成に失敗しました。');
      }
      
      console.log('ModuleViewer: モジュール詳細の生成に成功しました:', moduleDetail);
      
      // ステップ3: 生成したモジュール詳細をSupabaseに保存
      setGenerationStatus({
        ...generationStatus,
        status: '生成したコンテンツを保存中...',
        progress: 90,
        estimatedTime: 10,
        step: 3,
        totalSteps: 3
      });
      console.log('ModuleViewer: ステップ3 - 生成したモジュール詳細をSupabaseに保存');
      
      // 生成したモジュール詳細をSupabaseに保存
      const { error: saveError } = await supabase
        .from('module_details')
        .insert([{
          module_id: moduleId,
          detail_data: moduleDetail,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
      
      if (saveError) {
        console.error('ModuleViewer: モジュール詳細保存エラー:', saveError);
        // 保存に失敗してもモジュール詳細は表示する
        console.warn('ModuleViewer: モジュール詳細の保存に失敗しましたが、生成されたデータを表示します');
      } else {
        console.log('ModuleViewer: モジュール詳細が正常にSupabaseに保存されました');
      }
      
      setModuleDetail(moduleDetail);
      setLoadingState(LoadingState.SUCCESS);
      
      // 完了を表示
      setGenerationStatus({
        ...generationStatus,
        status: 'モジュール詳細の生成が完了しました',
        progress: 100,
        estimatedTime: 0,
        step: 3,
        totalSteps: 3
      });
      console.log('ModuleViewer: モジュール生成プロセスが正常に完了しました');
      
      // 進捗状態を更新
      const newProgress = { ...progress };
      if (!newProgress[moduleId] || newProgress[moduleId] < 25) {
        newProgress[moduleId] = 25; // モジュール詳細の閲覧で25%進捗
        setProgress(newProgress);
      }
      
      // 進捗データをSupabaseに保存
      try {
        const { error: progressError } = await supabase
          .from('learning_progress')
          .upsert({
            user_id: user.id,
            module_id: moduleId,
            progress: 25,
            updated_at: new Date().toISOString()
          });
        
        if (progressError) {
          console.error('ModuleViewer: 進捗データ保存エラー:', progressError);
        } else {
          console.log('ModuleViewer: 進捗データが正常に保存されました');
        }
      } catch (progressSaveError) {
        console.error('ModuleViewer: 進捗データ保存中にエラーが発生しました:', progressSaveError);
      }
      
    } catch (error) {
      console.error('ModuleViewer: モジュール詳細取得/生成エラー:', error);
      
      // タイムアウトをクリア
      if (timeoutId) clearTimeout(timeoutId);
      
      // エラー状態を設定
      setLoadingState(LoadingState.ERROR);
      
      // エラーの種類を判断
      let errorType: 'network' | 'api' | 'auth' | 'general' | 'timeout' = 'general';
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
          errorType = 'network';
        } else if (errorMessage.includes('api') || errorMessage.includes('openai')) {
          errorType = 'api';
        } else if (errorMessage.includes('auth') || errorMessage.includes('token') || errorMessage.includes('key')) {
          errorType = 'auth';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('time out')) {
          errorType = 'timeout';
        }
      }
      
      setErrorType(errorType);
      setErrorMessage(error instanceof Error ? error.message : '不明なエラーが発生しました');
      console.log(`ModuleViewer: エラータイプ: ${errorType}, メッセージ: ${error instanceof Error ? error.message : '不明なエラー'}`);
      
      // フォールバックコンテンツの生成を試みる
      try {
        console.log('ModuleViewer: フォールバックコンテンツの生成を試みます');
        const fallbackContent = generateFallbackModuleDetail(currentModule);
        if (fallbackContent) {
          console.log('ModuleViewer: フォールバックコンテンツを生成しました:', fallbackContent);
          setModuleDetail(fallbackContent);
          setLoadingState(LoadingState.SUCCESS);
          
          toast({
            title: 'フォールバックコンテンツを表示',
            description: 'エラーが発生したため、基本的なコンテンツを表示しています。',
            variant: 'default',
          });
        }
      } catch (fallbackError) {
        console.error('ModuleViewer: フォールバックコンテンツ生成エラー:', fallbackError);
      }
    }
  };

  // モジュールが変更された場合に必要なリセット
  useEffect(() => {
    if (moduleId && currentModule && moduleId !== currentModule.id) {
      setModuleDetail(null); // モジュール詳細をリセット
      setGenerationStarted(false); // 生成状態もリセット
    }
    
    // currentModuleが設定されていて、まだ生成が開始されていなければ生成を開始
    if (currentModule && !generationStarted && loadingState !== LoadingState.SUCCESS) {
      console.log('ModuleViewer: currentModuleが設定されたので生成を開始します');
      setGenerationStarted(true);
      generateModuleContent();
    }
  }, [moduleId, currentModule, generationStarted, loadingState]);

  // モジュール詳細生成後の進捗更新処理
  useEffect(() => {
    const updateModuleProgress = async () => {
      if (!user || !currentModule || !moduleDetail) return;
      
      try {
        // learning_progressテーブルのレコードを確認
        const { data: existingProgress, error: fetchError } = await supabase
          .from('learning_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('module_id', currentModule.id)
          .eq('session_type', 'content')
          .single();
          
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('進捗データ取得エラー:', fetchError);
          return;
        }
        
        // 既存の進捗データがある場合のみ更新
        if (existingProgress) {
          const { error: updateError } = await supabase
            .from('learning_progress')
            .update({
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProgress.id);
            
          if (updateError) {
            console.error('learning_progress更新エラー:', updateError);
          }
          
          // ローカルの進捗状態を更新
          setProgress(prev => ({
            ...prev,
            [currentModule.id]: existingProgress.completion_percentage
          }));
        }
      } catch (err) {
        console.error('進捗更新中のエラー:', err);
      }
    };
    
    if (moduleDetail && loadingState === LoadingState.SUCCESS) {
      updateModuleProgress();
    }
  }, [user, currentModule, moduleDetail, loadingState]);

  // モバイル表示時にはサイドバーを閉じる
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleModuleChange = async (moduleId: string) => {
    setActiveModule(moduleId);
    
    if (isMobile) {
      setSidebarOpen(false);
    }
    
    // 進捗の更新は学習開始時のみ
    if (progress[moduleId] === 0) {
      try {
        const now = new Date().toISOString();
        const { error: progressError } = await supabase
          .from('learning_progress')
          .insert({
            user_id: user?.id,
            module_id: moduleId,
            completion_percentage: 0,
            session_type: 'content',
            started_at: now,
            updated_at: now
          });
          
        if (progressError) throw progressError;
        
        // ローカルの進捗状態は0%のまま維持
        const newProgress = { ...progress };
        newProgress[moduleId] = 0;
        setProgress(newProgress);
        
        toast({
          title: "学習を開始しました",
          description: `${moduleId}モジュールの学習を開始しました`,
        });
      } catch (error) {
        console.error('進捗データ保存エラー:', error);
      }
    }
  };

  const handleStartPractice = () => {
    setIsChatOpen(true);
    
    toast({
      title: "インタラクティブセッションを開始します",
      description: "AIチャットと接続中...",
    });
    
    // 練習モジュールの進捗を更新
    const newProgress = { ...progress };
    newProgress.practice = 20;
    setProgress(newProgress);
    
    // learning_progressテーブルに練習セッション情報を記録
    if (user && currentModule) {
      (async () => {
        const now = new Date().toISOString();
        
        try {
          // セッションの存在確認
          const { data: existingSession, error: fetchError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('module_id', currentModule.id)
            .eq('session_type', 'practice')
            .single();
            
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('練習セッション取得エラー:', fetchError);
          }
          
          if (existingSession) {
            // 既存のセッションを更新
            const { error: updateError } = await supabase
              .from('learning_progress')
              .update({
                completion_percentage: 20,
                updated_at: now,
              })
              .eq('id', existingSession.id);
              
            if (updateError) {
              console.error('練習セッション更新エラー:', updateError);
            }
          } else {
            // 新規セッションを作成
            const { error: insertError } = await supabase
              .from('learning_progress')
              .insert({
                user_id: user.id,
                module_id: currentModule.id,
                session_type: 'practice',
                completion_percentage: 20,
                duration_minutes: 0,
                created_at: now,
                updated_at: now,
                completed: false
              });
              
            if (insertError) {
              console.error('練習セッション作成エラー:', insertError);
            }
          }
        } catch (err) {
          console.error('練習セッション処理エラー:', err);
        }
      })();
    }
  };

  const handleChatComplete = (progressValue: number) => {
    // 進捗を更新
    const newProgress = { ...progress };
    newProgress.practice = progressValue;
    setProgress(newProgress);
    
    toast({
      title: "学習セッションが完了しました",
      description: "おめでとうございます！理解度の確認が完了しました。",
    });
    
    // learning_progressテーブルの練習セッション情報を更新
    if (user && currentModule) {
      (async () => {
        try {
          // セッションの存在確認
          const { data: existingSession, error: fetchError } = await supabase
            .from('learning_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('module_id', currentModule.id)
            .eq('session_type', 'practice')
            .single();
            
          if (fetchError) {
            console.error('練習セッション取得エラー:', fetchError);
            return;
          }
          
          if (existingSession) {
            // 完了フラグを更新
            const isCompleted = progressValue >= 100;
            const duration_minutes = existingSession.duration_minutes + 15; // 15分追加と仮定
            
            const { error: updateError } = await supabase
              .from('learning_progress')
              .update({
                completion_percentage: progressValue,
                duration_minutes: duration_minutes,
                updated_at: new Date().toISOString(),
                completed: isCompleted
              })
              .eq('id', existingSession.id);
              
            if (updateError) {
              console.error('練習セッション完了エラー:', updateError);
            }
            
            // コンテンツの進捗も更新
            const contentProgress = Math.min(100, (progress[currentModule.id] || 0) + 25);
            
            // ローカルの進捗状態を更新
            setProgress(prev => ({
              ...prev,
              [currentModule.id]: contentProgress
            }));
            
            // コンテンツの進捗をDBに反映
            const { data: contentSession, error: contentFetchError } = await supabase
              .from('learning_progress')
              .select('*')
              .eq('user_id', user.id)
              .eq('module_id', currentModule.id)
              .eq('session_type', 'content')
              .single();
              
            if (!contentFetchError && contentSession) {
              const { error: contentUpdateError } = await supabase
                .from('learning_progress')
                .update({
                  completion_percentage: contentProgress,
                  updated_at: new Date().toISOString(),
                  completed: contentProgress >= 100
                })
                .eq('id', contentSession.id);
                
              if (contentUpdateError) {
                console.error('コンテンツ進捗更新エラー:', contentUpdateError);
              }
            }
            
            // カリキュラムデータも更新
            const { error: curriculumError } = await supabase
              .from('user_curriculum')
              .update({
                updated_at: new Date().toISOString(),
                curriculum_data: {
                  ...curriculum,
                  modules: curriculum?.modules.map((m: any) => {
                    if (m.id === currentModule.id) {
                      return {
                        ...m,
                        progress: contentProgress
                      };
                    }
                    return m;
                  })
                }
              })
              .eq('user_id', user.id);
              
            if (curriculumError) {
              console.error('カリキュラムデータ更新エラー:', curriculumError);
            }
          }
        } catch (err) {
          console.error('セッション完了処理エラー:', err);
        }
      })();
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // チャットセッションタイプの変更
  const handleSessionTypeChange = (type: ChatSessionType) => {
    setChatSessionType(type);
    setActiveTab('chat');
  };

  // MaterialContentコンポーネントでセクションが変わったときに呼び出される関数
  const handleSectionChange = (sectionId: string) => {
    setCurrentSectionId(sectionId);
  };

  // チャットセッションの開始処理を追加
  const handleChatSessionStart = (type: ChatSessionType) => {
    setChatSessionType(type);
    // ここに必要な処理を追加
    console.log(`ModuleViewer: チャットセッション開始 - タイプ: ${type}`);
    // chatSessionをstartSessionで開始
    startSession(type);
  };

  // タブ切り替え時の処理
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'chat' && !isChatOpen) {
      setIsChatOpen(true);
      // チャットが初めて開かれる場合はデフォルトのセッションを設定
      handleChatSessionStart('practice');
    }
  };

  // ローディング状態に応じて表示を切り替え
  const renderContent = () => {
    switch (loadingState) {
      case LoadingState.LOADING:
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <ProgressIndicator 
              value={generationStatus.progress}
              status={generationStatus.status}
              estimatedTime={generationStatus.estimatedTime}
              currentStep={generationStatus.step}
              totalSteps={generationStatus.totalSteps}
              showDetails={true}
              animated={true}
              className="max-w-md w-full mb-6"
            />
            <p className="text-muted-foreground">AIによってコンテンツが生成されています。少々お待ちください。</p>
          </div>
        );
      
      case LoadingState.ERROR:
        return (
          <ErrorState 
            onRetry={() => generateModuleContent()} 
            errorType={errorType}
            errorMessage={errorMessage}
          />
        );
      
      case LoadingState.NO_DATA:
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-medium mb-2">モジュールが見つかりません</p>
            <p className="text-muted-foreground mb-4">指定されたモジュールが見つかりませんでした。</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'} 
              className="flex items-center gap-2"
            >
              ダッシュボードに戻る
            </Button>
          </div>
        );
      
      case LoadingState.SUCCESS:
        if (!moduleDetail) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-medium mb-2">コンテンツがありません</p>
              <p className="text-muted-foreground mb-4">このモジュールにはまだコンテンツがありません。</p>
              <Button 
                variant="outline" 
                onClick={() => generateModuleContent()} 
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                コンテンツを生成
              </Button>
            </div>
          );
        }
        
        // モジュール詳細がある場合は通常コンテンツを表示
        return (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
            <div className="border-b">
              <div className="flex justify-between items-center px-4 py-2">
                <div className="flex items-center">
                  <TabsList>
                    <TabsTrigger value="content" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      コンテンツ
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      AIチャット
                    </TabsTrigger>
                    <TabsTrigger value="resources" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      リソース
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{progress[currentModule?.id || 'introduction']}%</span>
                  <div className="w-32">
                    <Progress
                      value={progress[currentModule?.id || 'introduction']}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <TabsContent value="content" className="flex-1 overflow-auto px-0">
              <MaterialContent content={moduleDetail} />
            </TabsContent>
            
            <TabsContent value="chat" className="flex-1 overflow-hidden p-0">
              <LearningChatProvider>
                <LearningChat
                  moduleDetail={moduleDetail}
                  onSessionStart={handleChatSessionStart}
                  onSessionComplete={handleChatComplete}
                />
              </LearningChatProvider>
            </TabsContent>
            
            <TabsContent value="resources" className="flex-1 overflow-auto">
              <ResourceList moduleId={moduleId || ''} resources={moduleDetail.resources || []} />
            </TabsContent>
          </Tabs>
        );
      
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-medium mb-2">予期せぬエラー</p>
            <p className="text-muted-foreground mb-4">コンテンツの表示中に問題が発生しました。</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              ページを再読み込み
            </Button>
          </div>
        );
    }
  };

  return (
    <LearningChatProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div className="flex h-screen flex-col">
          <Navbar />
          <div className="flex flex-1 overflow-hidden">
            <div className={`${sidebarOpen ? 'block' : 'hidden'} ${isMobile ? 'fixed inset-0 z-10 bg-background/95 backdrop-blur-sm' : 'w-72 flex-shrink-0'}`}>
              <MaterialSidebar 
                activeModule={currentModule?.id || 'introduction'} 
                onModuleChange={handleModuleChange}
                progress={progress}
                curriculumModules={curriculum?.modules}
              />
            </div>
            
            <div className="flex-1 overflow-auto pb-20 w-full">
              {renderContent()}
            </div>
          </div>
          <Footer />
        </div>
      </SidebarProvider>
    </LearningChatProvider>
  );
};

export default ModuleViewer;
