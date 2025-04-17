import React, { useState, useEffect, useCallback } from 'react';
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
import { AlertCircle, RefreshCw, BookOpen, Loader2, AlertTriangle, Bot, FileText, ListTree, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { LearningChat, LearningChatProvider, useLearningChat } from '@/components/LearningChat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ChatSessionType } from '@/components/LearningChat/LearningChatState';
import ResourceList from '@/components/Resources/ResourceList';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { generateFallbackModuleDetail, getFriendlyErrorMessage } from '@/services/fallback';
import { getOpenAIKey } from '@/services/openai';

interface ProgressState {
  [key: string]: number; // インデックスシグネチャをシンプルに
}

// ローディング状態の型定義
enum LoadingState {
  IDLE = 'idle', // 初期状態を追加
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
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const { moduleId } = useParams<{ moduleId: string }>();
  
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [progress, setProgress] = useState<ProgressState>({});
  
  // 生成状態を追跡する状態
  const [generationStatus, setGenerationStatus] = useState({
    status: '',
    progress: 0,
    estimatedTime: 0,
    step: 1,
    totalSteps: 3
  });

  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [curriculum, setCurriculum] = useState<CurriculumStructure | null>(null);
  const [currentModule, setCurrentModule] = useState<any>(null);
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { startSession, state: chatState } = useLearningChat();
  const [activeTab, setActiveTab] = useState('content');
  const [errorType, setErrorType] = useState<'network' | 'api' | 'auth' | 'general' | 'timeout'>('general');

  // ユーザープロファイルデータを取得する関数
  const fetchUserProfileData = async (userId: string) => {
    try {
      console.log('ModuleViewer: ユーザープロファイルデータ取得開始');
      const { data, error } = await supabase
        .from('profiles')
        .select('profile_data, profile_completed')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('ModuleViewer: プロファイル取得エラー:', error);
        return null;
      }
      
      if (!data || !data.profile_completed) {
        console.log('ModuleViewer: プロファイルが未完了または存在しません');
        return null;
      }
      
      console.log('ModuleViewer: ユーザープロファイルデータ取得成功');
      return data.profile_data;
    } catch (err) {
      console.error('ModuleViewer: プロファイル取得中の例外:', err);
      return null;
    }
  };

  // 進捗情報を取得
  const fetchProgressData = useCallback(async (moduleId: string) => {
    if (!user?.id) return;
    
    try {
      console.log('進捗情報を取得します', { userId: user.id, moduleId });
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .eq('session_type', 'content')
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('進捗データなし、新規レコードが必要です (fetchProgressData)');
          setProgress(prev => ({ ...prev, [moduleId]: 0 }));
        } else {
          console.error('進捗データ取得エラー (fetchProgressData):', error);
        }
        return;
      }

      if (data) {
        console.log('進捗データを取得しました (fetchProgressData):', data);
        setProgress(prev => ({
          ...prev,
          [moduleId]: data.completion_percentage || 0
        }));
      } else {
        console.log('進捗データなし、新規レコードが必要です (fetchProgressData)');
        setProgress(prev => ({ ...prev, [moduleId]: 0 }));
        await initializeProgressData(moduleId);
      }
    } catch (error) {
      console.error('進捗データ取得中のエラー (fetchProgressData):', error);
    }
  }, [user]);

  // 進捗データを初期化する関数
  const initializeProgressData = async (moduleId: string) => {
    if (!user?.id) return;
    try {
      console.log('進捗データを初期化します:', { userId: user.id, moduleId });
      const { error: insertError } = await supabase
        .from('learning_progress')
        .insert({
          user_id: user.id,
          module_id: moduleId,
          session_type: 'content',
          completion_percentage: 0,
          duration_minutes: 0,
          completed: false,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          console.log('進捗データは既に存在します (initializeProgressData)');
        } else {
          console.error('進捗データ初期化エラー (initializeProgressData):', insertError);
        }
      } else {
        console.log('進捗データを初期化しました (initializeProgressData)');
        setProgress(prev => ({ ...prev, [moduleId]: 0 }));
      }
    } catch (insertErr) {
      console.error('進捗データ初期化中の例外 (initializeProgressData):', insertErr);
    }
  };

  // カリキュラムデータを取得
  const fetchCurriculum = useCallback(async () => {
    if (!user?.id || curriculum) return;

    setLoadingState(LoadingState.LOADING);
    console.log('ModuleViewer: カリキュラムの取得を開始します - ユーザーID:', user.id);

    try {
        const { data, error } = await supabase
          .from('user_curriculum')
          .select('curriculum_data')
          .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('ModuleViewer: カリキュラム取得エラー:', error);
        setErrorMessage(getFriendlyErrorMessage(error));
        setErrorType('api');
        setLoadingState(LoadingState.ERROR);
        return;
      }

      if (data?.curriculum_data) {
        console.log('ModuleViewer: カリキュラムデータを取得しました');
        const typedData = data.curriculum_data as unknown as CurriculumStructure;
        setCurriculum(typedData);

        let targetModuleId = moduleId;

        if (!targetModuleId && typedData.modules && typedData.modules.length > 0) {
          targetModuleId = typedData.modules[0].id;
          console.log('ModuleViewer: URLにモジュールIDなし、最初のモジュールを選択:', targetModuleId);
        }

        if (targetModuleId) {
          setActiveModule(targetModuleId);
          console.log('ModuleViewer: アクティブモジュールを設定:', targetModuleId);
          } else {
          console.log('ModuleViewer: 有効なモジュールが見つかりません');
          setLoadingState(LoadingState.NO_DATA);
        }
      } else {
        console.log('ModuleViewer: カリキュラムデータが見つかりません');
        setErrorMessage("カリキュラムデータが見つかりません。プロファイルの設定を完了してください。");
        setLoadingState(LoadingState.NO_DATA);
      }
    } catch (err) {
      console.error('ModuleViewer: カリキュラム取得中にエラーが発生しました:', err);
      setErrorMessage(err instanceof Error ? err.message : 'カリキュラムの取得中にエラーが発生しました');
      setErrorType('general');
      setLoadingState(LoadingState.ERROR);
    }
  }, [user, curriculum, moduleId]);

  // 初回マウント時、またはユーザー変更時にカリキュラムを取得
  useEffect(() => {
    if (user && !authLoading) {
    fetchCurriculum();
    }
  }, [user, authLoading, fetchCurriculum]);
  
  // アクティブモジュールが変更された時の処理
  useEffect(() => {
    if (!activeModule || !curriculum) return;

    console.log('ModuleViewer: アクティブモジュール変更検出:', activeModule);

    const selectedModule = curriculum.modules.find(m => m.id === activeModule);

    if (selectedModule) {
      console.log('ModuleViewer: 選択されたモジュール情報:', selectedModule);
      setCurrentModule(selectedModule);

      if (moduleDetail?.id === activeModule) {
        console.log('ModuleViewer: 既存のモジュール詳細を使用:', moduleDetail.id);
        setLoadingState(LoadingState.SUCCESS);
      } else {
        console.log('ModuleViewer: モジュール詳細をリセットし、生成/取得を開始します');
        setModuleDetail(null);
        setLoadingState(LoadingState.LOADING);
        generateModuleContent(selectedModule);
      }
      fetchProgressData(activeModule);
    } else {
      console.error('ModuleViewer: アクティブモジュールに対応するデータがカリキュラム内に見つかりません:', activeModule);
      setLoadingState(LoadingState.ERROR);
      setErrorMessage(`モジュール '${activeModule}' が見つかりません。`);
    }
  }, [activeModule, curriculum]);

  // モジュール詳細を生成/取得する関数
  const generateModuleContent = useCallback(async (moduleInfo: any) => {
    if (!moduleInfo) {
      console.error('ModuleViewer: generateModuleContent にモジュール情報が渡されませんでした');
      setLoadingState(LoadingState.ERROR);
      setErrorMessage('モジュール情報の取得に失敗しました。');
      return;
    }

    console.log('ModuleViewer: モジュール生成プロセスを開始します。モジュール:', moduleInfo.title);
    setLoadingState(LoadingState.LOADING);

    const apiKey = getOpenAIKey();
    if (!apiKey) {
      setErrorMessage('OpenAI APIキーが設定されていません。');
      setErrorType('auth');
      setLoadingState(LoadingState.ERROR);
      toast({ title: 'APIキーエラー', description: '管理者に連絡してください。', variant: 'destructive' });
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        console.log('ModuleViewer: 生成プロセスがタイムアウトしました (3分)');
        reject(new Error('timeout'));
      }, 180000);
    });

    try {
      setGenerationStatus({ status: '既存データを確認中...', progress: 10, estimatedTime: 5, step: 1, totalSteps: 4 });
      console.log('ModuleViewer: ステップ1 - Supabaseからモジュール詳細の検索を開始:', moduleInfo.id);

      const { data: existingDetail, error: fetchDbError } = await supabase
        .from('module_details')
        .select('detail_data')
        .eq('module_id', moduleInfo.id)
        .maybeSingle();

      if (fetchDbError && fetchDbError.code !== 'PGRST116') {
        console.error('ModuleViewer: 既存モジュール詳細取得エラー:', fetchDbError);
      }

      if (existingDetail?.detail_data) {
        console.log('ModuleViewer: 既存のモジュール詳細を使用:', moduleInfo.id);
        const typedDetailData = existingDetail.detail_data as unknown as ModuleDetail;
        setModuleDetail(typedDetailData);
        setLoadingState(LoadingState.SUCCESS);
        if (timeoutId) clearTimeout(timeoutId);
        return;
      } else {
        console.log('ModuleViewer: 既存のモジュール詳細なし、新規生成を開始します');
      }

      setGenerationStatus({ status: 'ユーザー情報を準備中...', progress: 20, estimatedTime: 3, step: 2, totalSteps: 4 });
      let userProfileData = null;
      if (user?.id) {
        userProfileData = await fetchUserProfileData(user.id);
        console.log('ModuleViewer: ユーザープロファイルデータ:', userProfileData ? '取得成功' : '取得失敗またはなし');
      }

      setGenerationStatus({ status: 'AIによるコンテンツ生成中...', progress: 30, estimatedTime: 120, step: 3, totalSteps: 4 });
      console.log('ModuleViewer: ステップ3 - モジュール詳細の生成を開始:', moduleInfo.title);

      const progressCallback = (status: string, progress: number, estimatedTime?: number) => {
        console.log(`ModuleViewer: 生成進捗 - ${status}, ${progress}%, 残り時間: ${estimatedTime || '不明'}秒`);
        setGenerationStatus(prev => ({
          ...prev,
          status,
          progress: 30 + (progress * 0.6),
          estimatedTime: estimatedTime || prev.estimatedTime,
          step: 3,
        }));
      };

      const generatePromise = generateModuleDetail(
        moduleInfo,
        {
          maxRetries: 2,
          retryDelay: 2000,
          onProgress: progressCallback,
          userProfile: userProfileData
        }
      );

      console.log('ModuleViewer: OpenAI APIによるモジュール詳細生成を開始（タイムアウト: 3分）');
      const generatedDetail = await Promise.race([generatePromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      if (!generatedDetail) {
        console.error('ModuleViewer: モジュール詳細が生成されませんでした');
        throw new Error('生成失敗');
      }
      console.log('ModuleViewer: モジュール詳細の生成に成功しました:', generatedDetail);

      setGenerationStatus({ status: '生成コンテンツを保存中...', progress: 95, estimatedTime: 5, step: 4, totalSteps: 4 });
      console.log('ModuleViewer: ステップ4 - 生成したモジュール詳細をSupabaseに保存');

      const detailDataForStorage = JSON.parse(JSON.stringify(generatedDetail));

      const { error: saveError } = await supabase
        .from('module_details')
        .insert({
          module_id: moduleInfo.id,
          user_id: user?.id,
          detail_data: detailDataForStorage,
        });

      if (saveError) {
        console.error('モジュール詳細の保存エラー:', saveError);
      }

      setModuleDetail(generatedDetail);
      setLoadingState(LoadingState.SUCCESS);
      setGenerationStatus(prev => ({ ...prev, status: '生成完了', progress: 100, estimatedTime: 0, step: 4 }));
      console.log('ModuleViewer: モジュール生成プロセスが正常に完了しました');

      if (progress[moduleInfo.id] === undefined || progress[moduleInfo.id] === 0) {
        await initializeProgressData(moduleInfo.id);
      }

    } catch (error: any) {
      console.error('ModuleViewer: モジュール詳細取得/生成エラー:', error);
      if (timeoutId) clearTimeout(timeoutId);

      let determinedErrorType: 'network' | 'api' | 'auth' | 'general' | 'timeout' = 'general';
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      if (errorMessage.includes('timeout')) {
        determinedErrorType = 'timeout';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        determinedErrorType = 'network';
      } else if (errorMessage.includes('api') || errorMessage.includes('openai') || errorMessage.includes('key')) {
        determinedErrorType = 'api';
      } else if (errorMessage.includes('auth') || errorMessage.includes('token')) {
        determinedErrorType = 'auth';
      } else if (errorMessage === '生成失敗') {
        determinedErrorType = 'api';
      }

      setErrorType(determinedErrorType);
      setErrorMessage(getFriendlyErrorMessage(error));
      console.log(`ModuleViewer: エラータイプ: ${determinedErrorType}, メッセージ: ${getFriendlyErrorMessage(error)}`);

      try {
        console.log('ModuleViewer: フォールバックコンテンツの生成を試みます');
        const fallbackContent = generateFallbackModuleDetail(moduleInfo);
        if (fallbackContent) {
          console.log('ModuleViewer: フォールバックコンテンツを生成しました:', fallbackContent);
          setModuleDetail(fallbackContent);
          setLoadingState(LoadingState.SUCCESS);
          toast({
            title: 'フォールバックコンテンツを表示',
            description: 'エラーが発生したため、基本的なコンテンツを表示しています。',
            variant: 'default',
          });
        } else {
          throw new Error('フォールバック生成失敗');
        }
      } catch (fallbackError) {
        console.error('ModuleViewer: フォールバックコンテンツ生成エラー:', fallbackError);
        setLoadingState(LoadingState.ERROR);
      }
    }
  }, [user, progress, toast]);

  // モバイル表示時にはサイドバーを閉じる
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleModuleChange = (moduleId: string) => {
    console.log('handleModuleChange called with:', moduleId);
    setActiveModule(moduleId);
    
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const handleStartPractice = () => {
    setActiveTab('chat');
    setIsChatOpen(true);

    toast({
      title: "インタラクティブセッションを開始",
      description: "AIチャットで理解度を確認しましょう。",
    });
  };

  // チャット完了時の処理 (LearningChatから呼び出される)
  const handleChatComplete = async (progressValue: number, sessionType: ChatSessionType) => {
    console.log(`チャット完了: タイプ=${sessionType}, 進捗=${progressValue}%`);
    if (!user || !currentModule) return;

    // 完了したセッションの進捗をDBに記録 (upsertを使用)
    try {
      const { error: upsertError } = await supabase
        .from('learning_progress')
        .upsert({
          user_id: user.id,
          module_id: currentModule.id,
          session_type: sessionType, // 完了したセッションのタイプ
          completion_percentage: progressValue,
          duration_minutes: 0, // TODO: セッション時間を計測・設定する
          completed: progressValue >= 100,
          updated_at: new Date().toISOString(),
          // created_at は onConflict で既存レコードがあれば更新されない
        }, {
          onConflict: 'user_id, module_id, session_type' // 複合主キー or 一意制約
        });

      if (upsertError) {
        console.error(`${sessionType} セッション進捗更新エラー:`, upsertError);
        toast({ title: '進捗更新エラー', description: '進捗の保存に失敗しました。', variant: 'destructive' });
      } else {
        console.log(`${sessionType} セッション進捗を更新しました`);
        toast({ title: '進捗を更新しました', description: `${sessionType}の進捗が${progressValue}%になりました。` });

        // 'content' セッションの進捗も更新するロジック (必要に応じて)
        // 例: クイズ完了でコンテンツ進捗も少し上げる
        if (sessionType === 'practice' && progressValue > 0) {
          const currentContentProgress = progress[currentModule.id] || 0;
          const newContentProgress = Math.min(100, currentContentProgress + 10); // 例: 練習で10%アップ
          await updateContentProgress(newContentProgress);
        }
      }
    } catch (err) {
      console.error('チャット完了処理中のエラー:', err);
    }
  };

  // コンテンツ進捗を更新するヘルパー関数
  const updateContentProgress = async (newPercentage: number) => {
    if (!user || !currentModule) return;
    try {
      const { error } = await supabase
        .from('learning_progress')
        .upsert({
          user_id: user.id,
          module_id: currentModule.id,
          session_type: 'content',
          completion_percentage: newPercentage,
          duration_minutes: 0, // TODO: コンテンツ閲覧時間を計測・設定する
          completed: newPercentage >= 100,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, module_id, session_type' });

      if (error) {
        console.error('コンテンツ進捗更新エラー:', error);
      } else {
        console.log('コンテンツ進捗を更新しました:', newPercentage);
        setProgress(prev => ({ ...prev, [currentModule.id]: newPercentage }));
        // カリキュラム全体のデータ更新も必要ならここで行う
      }
    } catch (err) {
      console.error('コンテンツ進捗更新中のエラー:', err);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // タブ切り替え時の処理
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'chat' && !isChatOpen) {
      setIsChatOpen(true);
      // チャットが初めて開かれる場合の初期化処理は LearningChat 側で行う
    }
  };

  // ローディング状態に応じて表示を切り替え
  const renderContent = () => {
    switch (loadingState) {
      case LoadingState.IDLE: // 初期状態
        return <LoadingStateComponent />; // 初期ロード表示
      case LoadingState.LOADING:
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <ProgressIndicator
              status={generationStatus.status}
              value={generationStatus.progress}
              estimatedTime={generationStatus.estimatedTime}
              currentStep={generationStatus.step}
              totalSteps={generationStatus.totalSteps}
            />
            <p className="text-muted-foreground mt-4 text-center">
              {generationStatus.step === 1 ? 'モジュールの準備をしています...' :
               generationStatus.step === 2 ? 'あなたの学習履歴を考慮しています...' :
               generationStatus.step === 3 ? 'AIが最適なコンテンツを生成中です...' :
               '最終処理を行っています...'}
            </p>
          </div>
        );

      case LoadingState.ERROR:
  return (
          <ErrorState
            onRetry={() => generateModuleContent(currentModule)} // currentModuleを渡す
            errorType={errorType}
            errorMessage={errorMessage}
          />
        );

      case LoadingState.NO_DATA:
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-medium mb-2">データがありません</p>
            <p className="text-muted-foreground mb-4 text-center">{errorMessage || '表示できるデータが見つかりませんでした。'}</p>
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
          // 通常ここには来ないはずだが、念のためフォールバック
          return (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-medium mb-2">コンテンツ表示エラー</p>
              <p className="text-muted-foreground mb-4">コンテンツの読み込みに問題が発生しました。</p>
              <Button
                variant="outline"
                onClick={() => generateModuleContent(currentModule)} // 再試行
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                再試行
              </Button>
            </div>
          );
        }

        // モジュール詳細がある場合は通常コンテンツを表示
        return (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
            <div className="border-b sticky top-0 bg-background z-10"> {/* ヘッダーを固定 */}
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
                   {/* currentModule.id が存在する場合のみ進捗表示 */}
                   {currentModule?.id && (
                       <>
                           <span className="text-sm font-bold">{progress[currentModule.id] || 0}%</span>
                           <div className="w-32">
                               <Progress
                                   value={progress[currentModule.id] || 0}
                                   className="h-2"
                               />
                           </div>
                       </>
                   )}
                </div>
              </div>
            </div>

            {/* MaterialContent に Props を正しく渡す */}
            <TabsContent value="content" className="flex-1 overflow-auto px-0 w-full">
              {/* MaterialContent に渡す props を修正 */}
              <MaterialContent 
                  moduleDetail={moduleDetail}
                onStartPractice={handleStartPractice}
                  // activeModule, currentModule, toggleSidebar, isSidebarOpen, onSectionChange は不要かも？
                  // MaterialContent の実装に合わせて調整が必要
              />
            </TabsContent>

            {/* LearningChatProvider はページ全体で1回だけ使うべき */}
            <TabsContent value="chat" className="flex-1 overflow-hidden p-0 w-full">
              {/* LearningChat に Props を正しく渡す */}
              {/* <LearningChat
                moduleDetail={moduleDetail}
                // onSessionStart は不要 (LearningChat内で管理)
                onSessionComplete={handleChatComplete} // これは必要
                // 他に必要な Props があれば追加 (sessionType, sectionId など)
              /> */}
            </TabsContent>

            <TabsContent value="resources" className="flex-1 overflow-auto p-6 w-full"> {/* Padding を追加 */}
              {/* ResourceList に Props を正しく渡す */}
              {/* <ResourceList
                resources={moduleDetail.resources || []}
                // moduleId は不要かも？ ResourceList の実装による
               /> */}
            </TabsContent>
          </Tabs>
        );

      default: // 未知の状態
        return (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl font-medium mb-2">予期せぬ状態</p>
            <p className="text-muted-foreground mb-4">ページの読み込み中に問題が発生しました。</p>
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
    // LearningChatProvider をここに移動
    <LearningChatProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />

        <div className="flex-1 flex overflow-hidden">
          <SidebarProvider>
            <div
              className={`bg-background border-r shrink-0 transition-all duration-300 ${
                sidebarOpen ? (isMobile ? 'w-full absolute inset-0 z-50' : 'w-64 md:w-72') : 'w-0 md:w-20' // 閉じた時も少し幅を残す例
              } overflow-y-auto`} // スクロール可能に
            >
              {/* サイドバーの内容は curriculum が読み込まれてから表示 */}
              {curriculum && (
                 <MaterialSidebar
                   activeModule={activeModule} // string | null
                   onModuleChange={handleModuleChange}
                   progress={progress as any} // TODO: Fix type mismatch
                   curriculumModules={curriculum?.modules}
                   isOpen={sidebarOpen} // 開閉状態を渡す
                 />
              )}
              {!curriculum && loadingState === LoadingState.LOADING && (
                 <div className="p-4 text-center text-muted-foreground">カリキュラム読込中...</div>
              )}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden w-full relative bg-background"> {/* flex-col を追加 */}
              {/* サイドバートグルボタン */}
               <Button
                 variant="outline"
                 size="icon" // アイコンボタンに
                 onClick={toggleSidebar}
                 className={`absolute left-4 top-4 z-30 ${isMobile ? 'block' : 'hidden'}`} // モバイルでは常に表示、デスクトップでは hidden に変更
                 aria-label={sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
               >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <ListTree className="h-4 w-4" /> }
               </Button>

              {/* メインコンテンツエリア */}
              <main className="flex-1 overflow-y-auto w-full pb-16"> {/* overflow-y-auto */}
                 {/* コンテンツの左右に適切なパディング/マージンを設定 */}
                 <div className="container mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-6"> 
                      {renderContent()}
                 </div>
              </main>

             {/* AIチャットボタン (Floating) */}
             {!isChatOpen && (
                  <div className="fixed bottom-6 right-6 z-30">
                      <Button
                          onClick={() => {
                              setActiveTab('chat'); // チャットタブをアクティブに
                              setIsChatOpen(true);
                          }}
                          size="lg"
                          className="rounded-full h-14 w-14 shadow-md p-0"
                          aria-label="AIサポートを開く"
                      >
                          <Bot className="h-6 w-6" />
                      </Button>
                  </div>
              )}

            {/* AIチャットパネル (固定) */}
             <div className={`fixed right-0 top-0 bottom-0 transition-transform duration-300 bg-background z-40 border-l overflow-hidden ${
                 isChatOpen ? 'w-full sm:w-96 lg:w-80 translate-x-0' : 'w-full sm:w-96 lg:w-80 translate-x-full' // transform で制御
             }`}>
                 {isChatOpen && moduleDetail && ( // moduleDetail がある場合のみ表示
                     <div className="h-full flex flex-col">
                         <div className="px-4 py-3 border-b flex justify-between items-center bg-muted/20 shrink-0">
                             <h3 className="font-semibold">AI学習サポート</h3>
                             <Button
                                 variant="ghost"
                                 size="icon" // アイコンボタンに
                                 onClick={() => setIsChatOpen(false)}
                                 aria-label="チャットパネルを閉じる"
                             >
                                 <X className="h-4 w-4" />
                             </Button>
                         </div>
                         {/* LearningChatコンポーネントはここに移動 */}
                         {/* <LearningChat
                             moduleDetail={moduleDetail}
                             onSessionComplete={handleChatComplete}
                             // 他に必要なProps (sessionTypeなどはLearningChat内部で管理)
                         /> */}
                     </div>
                 )}
             </div>
          </div>
          </SidebarProvider>
        </div>
        <Footer />
      </div>
    </LearningChatProvider>
  );
};

export default ModuleViewer;
