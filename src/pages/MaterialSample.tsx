import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MaterialSidebar from '@/components/MaterialSidebar';
import MaterialContent from '@/components/MaterialContent';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CurriculumStructure, generateModuleDetail, ModuleDetail } from '@/services/openai';
import { useSearchParams } from 'react-router-dom';
import { Json } from '@/integrations/supabase/types';

interface ProgressState {
  introduction: number;
  theory: number;
  examples: number;
  practice: number;
  [key: string]: number; // インデックスシグネチャ
}

const ModuleViewer = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const moduleId = searchParams.get('moduleId');
  
  const [activeModule, setActiveModule] = useState('introduction');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [progress, setProgress] = useState<ProgressState>({
    introduction: 100,
    theory: 60,
    examples: 30,
    practice: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [curriculum, setCurriculum] = useState<CurriculumStructure | null>(null);
  const [currentModule, setCurrentModule] = useState<any>(null);
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // カリキュラムデータを取得
  useEffect(() => {
    const fetchCurriculum = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_curriculum')
          .select('curriculum_data')
          .eq('user_id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data && data.curriculum_data) {
          const typedData = data.curriculum_data as unknown as CurriculumStructure;
          setCurriculum(typedData);
          
          // モジュールIDが指定されている場合は該当するモジュールを選択
          if (moduleId) {
            const module = typedData.modules.find(m => m.id === moduleId);
            if (module) {
              setCurrentModule(module);
            } else {
              // モジュールが見つからない場合は最初のモジュールを選択
              setCurrentModule(typedData.modules[0]);
            }
          } else {
            // モジュールIDが指定されていない場合は最初のモジュールを選択
            setCurrentModule(typedData.modules[0]);
          }
        } else {
          setError("カリキュラムデータが見つかりません。");
        }
      } catch (err) {
        console.error('カリキュラム取得エラー:', err);
        setError(err instanceof Error ? err.message : 'カリキュラムの取得中にエラーが発生しました');
        toast({
          title: 'エラー',
          description: err instanceof Error ? err.message : 'カリキュラムの取得中にエラーが発生しました',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchCurriculum();
  }, [user, moduleId, toast]);
  
  // 選択されたモジュールが変更されたら詳細を取得
  useEffect(() => {
    const fetchModuleDetail = async () => {
      // モジュールIDが存在しない場合は処理を中断
      if (!currentModule?.id || !user) return;
      
      try {
        setLoading(true);
        setModuleDetail(null);
        console.log("Fetching module detail for:", currentModule.title);

        // ① 既に生成済みのモジュール詳細があるか Supabase を確認
        const { data: existingDetail, error: fetchDetailError } = await supabase
          .from('module_details')
          .select('detail_data')
          .eq('module_id', currentModule.id)
          .single();

        if (fetchDetailError && fetchDetailError.code !== 'PGRST116') {
          // PGRST116 = データが見つからない (not found) → これは許容
          throw fetchDetailError;
        }

        // 既に存在する場合は API 生成をスキップしてそのまま使用
        if (existingDetail?.detail_data) {
          console.log('既存のモジュール詳細を取得 (再生成せず):', existingDetail.detail_data);
          setModuleDetail(existingDetail.detail_data as unknown as ModuleDetail);
          toast({
            title: 'コンテンツを取得しました',
            description: '以前に生成されたコンテンツを表示しています',
          });
          return; // ここで終了
        }

        // プロファイルデータを取得
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('profile_data')
          .eq('id', user.id)
          .single();
          
        if (profileError) throw profileError;
        
        // プロファイルデータから構造化データを作成
        let extractedProfileData: any = {};
        if (profileData?.profile_data) {
          const profileAnswers = (profileData.profile_data as any).answers || [];
          profileAnswers.forEach((answer: { question: string, answer: string }) => {
            if (answer.question.includes('学習目標') || answer.question.includes('ゴール')) {
              extractedProfileData.goal = answer.answer;
            } else if (answer.question.includes('期限') || answer.question.includes('期間')) {
              extractedProfileData.timeframe = answer.answer;
            } else if (answer.question.includes('勉強時間') || answer.question.includes('時間')) {
              extractedProfileData.studyTime = answer.answer;
            } else if (answer.question.includes('レベル')) {
              extractedProfileData.currentLevel = answer.answer;
            } else if (answer.question.includes('学習スタイル') || answer.question.includes('学習方法')) {
              extractedProfileData.learningStyle = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
            } else if (answer.question.includes('動機') || answer.question.includes('活用')) {
              extractedProfileData.motivation = answer.answer;
            } else if (answer.question.includes('苦手') || answer.question.includes('障壁') || answer.question.includes('不安')) {
              extractedProfileData.challenges = answer.answer;
            }
          });
        }
        
        // モジュール詳細を生成
        const moduleInfo = {
          id: currentModule.id,
          title: currentModule.title,
          description: currentModule.description,
          learning_objectives: currentModule.learning_objectives
        };
        
        console.log("Calling generateModuleDetail with:", moduleInfo);
        toast({
          title: 'モジュール詳細を生成中',
          description: '詳細コンテンツの生成には少し時間がかかります...',
        });
        
        const detail = await generateModuleDetail(moduleInfo, extractedProfileData);
        
        if (detail) {
          setModuleDetail(detail);
          console.log("Module Detail Set:", detail);
          toast({
            title: 'モジュール詳細の生成完了',
            description: '学習を開始できます',
          });

          // ② 生成したモジュール詳細を Supabase に保存 (キャッシュ用途)
          const { error: saveError } = await supabase
            .from('module_details')
            .insert({
              module_id: currentModule.id,
              user_id: user.id,
              detail_data: detail as unknown as Json,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          if (saveError) {
            console.error('モジュール詳細の保存エラー:', saveError);
          }
        } else {
          throw new Error('モジュール詳細の生成に失敗しました (null が返されました)');
        }
      } catch (error) {
        console.error('モジュール詳細取得エラー:', error);
        setError(error instanceof Error ? error.message : 'モジュール詳細の生成に失敗しました');
        toast({
          title: 'コンテンツ生成エラー',
          description: error instanceof Error ? error.message : 'モジュール詳細の生成に失敗しました',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        console.log("Loading state set to false for module detail fetch");
      }
    };
    
    fetchModuleDetail();
  }, [currentModule?.id, user?.id, toast]);

  // モバイル表示時にはサイドバーを閉じる
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
    
    // モバイル表示時には、モジュール選択後にサイドバーを閉じる
    if (isMobile) {
      setSidebarOpen(false);
    }
    
    // 進捗を更新
    if (progress[moduleId] === 0) {
      const newProgress = { ...progress };
      newProgress[moduleId] = 10;
      setProgress(newProgress);
      
      toast({
        title: "進捗が更新されました",
        description: `${moduleId}モジュールの学習を開始しました`,
      });
    }
  };

  const handleStartPractice = () => {
    toast({
      title: "インタラクティブセッションを開始します",
      description: "AIチャットと接続中...",
    });
    
    // 練習モジュールの進捗を更新
    const newProgress = { ...progress };
    newProgress.practice = 20;
    setProgress(newProgress);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex flex-col w-full">
        <Navbar />
        
        <div className="flex flex-1 pt-16">
          {/* モバイル表示時のサイドバートグルボタン */}
          {isMobile && (
            <button 
              onClick={toggleSidebar}
              className="fixed z-20 bottom-4 right-4 bg-primary text-primary-foreground p-3 rounded-full shadow-lg"
              aria-label="目次を開く"
            >
              {sidebarOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>
          )}
          
          <div className={`${sidebarOpen ? 'block' : 'hidden'} ${isMobile ? 'fixed inset-0 z-10 bg-background/95 backdrop-blur-sm' : ''}`}>
            <MaterialSidebar 
              activeModule={activeModule}
              onModuleChange={handleModuleChange}
              progress={progress}
              curriculumModules={curriculum?.modules}
            />
          </div>
          
          <div className="flex-1 container max-w-6xl py-8 px-4 md:px-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                <p className="mt-4 text-muted-foreground">コンテンツを読み込み中...</p>
              </div>
            ) : (
              <MaterialContent 
                activeModule={activeModule} 
                onStartPractice={handleStartPractice}
                moduleDetail={moduleDetail}
                currentModule={currentModule}
              />
            )}
          </div>
        </div>
        
        <Footer />
      </div>
    </SidebarProvider>
  );
};

export default ModuleViewer;
