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
import { AlertCircle, RefreshCw, BookOpen, Loader2, AlertTriangle, Bot, FileText, ListTree, X } from 'lucide-react';
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
            const moduleIndex = curriculumData.modules.findIndex(m => m.id === moduleId);
            if (moduleIndex >= 0) {
              // モジュールにカリキュラムコンテキスト情報を追加
              const enhancedModule = {
                ...curriculumData.modules[moduleIndex],
                curriculum_title: curriculumData.title || '',
                curriculum_description: curriculumData.description || '',
                module_index: moduleIndex,
                total_modules: curriculumData.modules.length,
                // 前後のモジュール情報を追加
                previous_module: moduleIndex > 0 ? {
                  id: curriculumData.modules[moduleIndex - 1].id,
                  title: curriculumData.modules[moduleIndex - 1].title
                } : null,
                next_module: moduleIndex < curriculumData.modules.length - 1 ? {
                  id: curriculumData.modules[moduleIndex + 1].id,
                  title: curriculumData.modules[moduleIndex + 1].title
                } : null
              };
              
              setCurrentModule(enhancedModule);
              console.log('ModuleViewer: 拡張された現在のモジュール情報を設定:', enhancedModule);
            } else {
              // モジュールが見つからない場合は最初のモジュールを選択
              const enhancedFirstModule = {
                ...curriculumData.modules[0],
                curriculum_title: curriculumData.title || '',
                curriculum_description: curriculumData.description || '',
                module_index: 0,
                total_modules: curriculumData.modules.length,
                previous_module: null,
                next_module: curriculumData.modules.length > 1 ? {
                  id: curriculumData.modules[1].id,
                  title: curriculumData.modules[1].title
                } : null
              };
              
              setCurrentModule(enhancedFirstModule);
              console.log('ModuleViewer: 指定されたモジュールが見つからないため最初のモジュールを選択:', enhancedFirstModule);
            }
          } else {
            // モジュールIDが指定されていない場合は最初のモジュールを選択
            const enhancedFirstModule = {
              ...curriculumData.modules[0],
              curriculum_title: curriculumData.title || '',
              curriculum_description: curriculumData.description || '',
              module_index: 0,
              total_modules: curriculumData.modules.length,
              previous_module: null,
              next_module: curriculumData.modules.length > 1 ? {
                id: curriculumData.modules[1].id,
                title: curriculumData.modules[1].title
              } : null
            };
            
            setCurrentModule(enhancedFirstModule);
            console.log('ModuleViewer: モジュールIDが指定されていないため最初のモジュールを選択:', enhancedFirstModule);
          }
          
          // 進捗情報を取得
          try {
            const { data: progressData, error: progressError } = await supabase
              .from('learning_progress')
              .select('*')
              .eq('user_id', user?.id)
              .eq('module_id', currentModule.id)
              .eq('session_type', 'content:1')
              .limit(1);
            
            if (progressData && progressData.length > 0 && !progressError) {
              // 個別のセクションの進捗を更新
              setProgress(prev => ({
                ...prev,
                [currentModule.id]: progressData[0].completion_percentage || 0
              }));
            }
          } catch (progressError) {
            console.error('進捗データ取得エラー:', progressError);
          }
          
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
      
      // ユーザープロファイルデータを取得
      let userProfileData = null;
      if (user) {
        userProfileData = await fetchUserProfileData(user.id);
        console.log('ModuleViewer: ユーザープロファイルデータ:', userProfileData ? 'データあり' : 'データなし');
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
          onProgress: progressCallback,
          userProfile: userProfileData // ユーザープロファイルデータを追加
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
      
      // detailDataとして保存する前にJSONとして処理
      const detailDataForStorage = JSON.parse(JSON.stringify(moduleDetail));

      // 生成されたモジュール詳細をSupabaseに保存
      const { error: saveError } = await supabase
        .from('module_details')
        .insert({
          module_id: currentModule.id,
          user_id: user?.id,
          detail_data: detailDataForStorage,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (saveError) {
        console.error('モジュール詳細の保存エラー:', saveError);
        // 保存に失敗しても、生成されたコンテンツは表示
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
      if (!newProgress[currentModule.id] || newProgress[currentModule.id] < 25) {
        newProgress[currentModule.id] = 25; // モジュール詳細の閲覧で25%進捗
        setProgress(newProgress);
      }
      
      // 進捗情報を作成/更新
      const { error: progressError } = await supabase
        .from('learning_progress')
        .upsert({
          user_id: user?.id,
          module_id: currentModule.id,
          session_type: 'content:1',
          completion_percentage: 0,
          duration_minutes: 0,
          completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (progressError) {
        console.error('進捗データの保存エラー:', progressError);
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
    
    // セッション開始のログを記録
    try {
      if (user && currentModule) {
        supabase
          .from('learning_progress')
          .upsert({
            user_id: user.id,
            module_id: currentModule.id,
            session_type: 'practice',
            completion_percentage: 0,
            duration_minutes: 0,
            completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .then(({ error }) => {
            if (error) console.error('練習セッション記録エラー:', error);
          });
      }
    } catch (error) {
      console.error('練習セッション記録エラー:', error);
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
              status={generationStatus.status}
              value={generationStatus.progress}
              estimatedTime={generationStatus.estimatedTime}
              currentStep={generationStatus.step}
              totalSteps={generationStatus.totalSteps}
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
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        <SidebarProvider>
          <div 
            className={`bg-background border-r shrink-0 transition-all duration-300 ${
              sidebarOpen ? (isMobile ? 'w-full absolute inset-0 z-50' : 'w-64 md:w-72') : 'w-0'
            }`}
          >
            {(sidebarOpen || !isMobile) && (
              <MaterialSidebar 
                activeModule={activeModule}
                onModuleChange={handleModuleChange}
                progress={progress}
                curriculumModules={curriculum?.modules}
              />
            )}
          </div>
          
          <div className="flex-1 overflow-auto w-full pb-16 relative bg-background">
            {!sidebarOpen && !isMobile && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleSidebar} 
                className="absolute left-4 top-4 z-10"
              >
                <ListTree className="h-4 w-4 mr-2" />
                モジュール
              </Button>
            )}
            
            <div className="container mx-auto px-4 py-6 md:px-6 lg:px-8 max-w-5xl">
              {loadingState === LoadingState.LOADING ? (
                <div className="mt-20">
                  {generationStarted ? (
                    <ProgressIndicator 
                      status={generationStatus.status}
                      value={generationStatus.progress}
                      estimatedTime={generationStatus.estimatedTime}
                      currentStep={generationStatus.step}
                      totalSteps={generationStatus.totalSteps}
                    />
                  ) : (
                    <LoadingStateComponent />
                  )}
                </div>
              ) : loadingState === LoadingState.ERROR ? (
                <ErrorState 
                  onRetry={() => generateModuleContent()} 
                  errorType={errorType}
                  errorMessage={errorMessage}
                />
              ) : (
                <div className="relative">
                  {isMobile && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleSidebar} 
                      className="absolute -top-2 right-0 mb-4"
                    >
                      <ListTree className="h-4 w-4 mr-2" />
                      {sidebarOpen ? 'コンテンツ表示' : 'モジュール表示'}
                    </Button>
                  )}
                  
                  <LearningChatProvider>
                    <div className={`transition-all duration-300 ${isChatOpen ? 'mr-0 lg:mr-80' : 'mr-0'}`}>
                      <MaterialContent 
                        activeModule={activeModule}
                        onStartPractice={handleStartPractice}
                        moduleDetail={moduleDetail}
                        currentModule={currentModule}
                        toggleSidebar={toggleSidebar}
                        isSidebarOpen={sidebarOpen}
                        onSectionChange={handleSectionChange}
                      />
                    </div>
                    
                    <div className={`fixed right-0 top-16 bottom-0 transition-all duration-300 bg-background z-20 border-l overflow-hidden ${
                      isChatOpen ? 'w-full sm:w-96 lg:w-80' : 'w-0'
                    }`}>
                      {isChatOpen && (
                        <div className="h-full flex flex-col">
                          <div className="px-4 py-3 border-b flex justify-between items-center bg-muted/20">
                            <h3 className="font-semibold">AI学習サポート</h3>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setIsChatOpen(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <LearningChat 
                            onComplete={handleChatComplete}
                            moduleDetail={moduleDetail}
                            sessionType={chatSessionType}
                            sectionId={currentSectionId}
                          />
                        </div>
                      )}
                    </div>
                  </LearningChatProvider>
                </div>
              )}
            </div>
          </div>
        </SidebarProvider>
      </div>
      
      {!isChatOpen && (
        <div className="fixed bottom-6 right-6">
          <Button 
            onClick={() => setIsChatOpen(true)}
            size="lg"
            className="rounded-full h-14 w-14 shadow-md p-0"
          >
            <Bot className="h-6 w-6" />
            <span className="sr-only">AIサポートを開く</span>
          </Button>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default ModuleViewer;
