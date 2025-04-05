import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import ChatWidget from '@/components/ChatWidget';
import { useChatState } from '@/components/ChatWidget/ChatState';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Rocket } from 'lucide-react';
import { generateCurriculumStructure, CurriculumStructure } from '@/services/openai';

// プロファイリングステップの定義
enum GenerationStep {
  WAITING = 'waiting',
  CURRICULUM_BASE = 'curriculum_base',
  CURRICULUM_MODULES = 'curriculum_modules',
  SAVING_DATA = 'saving_data',
  COMPLETE = 'complete',
  ERROR = 'error',
  IDLE = 'idle',
  PROFILE_EXTRACTION = 'profile_extraction'
}

export default function Profiling() {
  const { profileCompleted, setIsOpen, setProfileCompleted } = useChatState();
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep>(GenerationStep.WAITING);
  const [generatedCurriculum, setGeneratedCurriculum] = useState<CurriculumStructure | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // チャットウィジェットを自動的に開く
  useEffect(() => {
    // コンポーネントマウント時にチャットを開く
    setTimeout(() => {
      setIsOpen(true);
    }, 300);
  }, [setIsOpen]);

  // プロファイリングが完了したらカリキュラム生成プロセスを開始
  useEffect(() => {
    console.log('プロファイル完了状態の検出:', profileCompleted, '生成状態:', isGenerating);
    
    if (profileCompleted && !isGenerating) {
      console.log('プロファイル完了を検出、カリキュラム生成を開始します');
      setIsGenerating(true);
      setGenerationStep(GenerationStep.CURRICULUM_BASE);
      startCurriculumGeneration();
    }
  }, [profileCompleted]);

  // カリキュラム生成の進行状況を表示するためのタイマー
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    if (isGenerating && generationStep !== GenerationStep.ERROR && generationStep !== GenerationStep.COMPLETE) {
      console.log('生成状態開始: プログレスバーを表示します');
      
      // 各ステップに応じた進捗範囲を設定
      const progressRanges = {
        [GenerationStep.CURRICULUM_BASE]: { min: 0, max: 40 },
        [GenerationStep.CURRICULUM_MODULES]: { min: 40, max: 70 },
        [GenerationStep.SAVING_DATA]: { min: 70, max: 95 },
        [GenerationStep.COMPLETE]: { min: 95, max: 100 }
      };
      
      const currentRange = progressRanges[generationStep] || { min: 0, max: 100 };
      
      timer = setInterval(() => {
        setProgress((prevProgress) => {
          // 現在のステップの最大値を超えないようにする
          if (prevProgress >= currentRange.max) {
            clearInterval(timer);
            return prevProgress;
          }
          return Math.min(prevProgress + 0.5, currentRange.max);
        });
      }, 200);

      return () => {
        clearInterval(timer);
      };
    }
    
    if (generationStep === GenerationStep.COMPLETE) {
      setProgress(100);
    }
    
  }, [isGenerating, generationStep]);

  // 進行状況に応じてステップメッセージを更新
  useEffect(() => {
    if (!isGenerating) return;
    
    if (generationStep === GenerationStep.CURRICULUM_BASE) {
      // setGenerationStepMessage('学習プランの基盤を生成中...');
    } else if (generationStep === GenerationStep.CURRICULUM_MODULES) {
      // setGenerationStepMessage('あなたのプロファイルに合わせて最適化中...');
    } else if (generationStep === GenerationStep.SAVING_DATA) {
      // setGenerationStepMessage('教材とコンテンツを組み立て中...');
    } else if (generationStep === GenerationStep.COMPLETE) {
      // setGenerationStepMessage('完了！ダッシュボードに移動します...');
      
      // 完了したらダッシュボードに移動
      setTimeout(() => {
        console.log('生成完了: ダッシュボードに移動します');
        navigate('/dashboard');
      }, 1500);
    }
  }, [generationStep, navigate, isGenerating]);

  const startCurriculumGeneration = async () => {
    try {
      // 生成が既に進行中の場合は早期リターン
      if (generationStep !== GenerationStep.IDLE && generationStep !== GenerationStep.ERROR) {
        console.log('カリキュラム生成はすでに進行中または完了しています');
        return;
      }
      
      // 既に進行中のセッションがある場合はスキップ
      const sessionKey = `curriculum_gen_${user?.id}`;
      if (sessionStorage.getItem(sessionKey)) {
        console.log('このセッションで既にカリキュラム生成を実行中です');
        return;
      }
      
      // セッションフラグを設定
      sessionStorage.setItem(sessionKey, 'true');
      
      console.log('カリキュラム生成を開始します');
      setGenerationStep(GenerationStep.PROFILE_EXTRACTION);
      
      // プロファイルデータの抽出
      const extractedProfileData: any = {};
      
      // チャットからの回答を使用
      const chatAnswers = profileAnswers || [];
      
      chatAnswers.forEach((answer: { question: string, answer: string }) => {
        // 質問に応じてプロファイルデータに追加
        if (answer.question.includes('学習目標') || answer.question.includes('ゴール')) {
          extractedProfileData.goal = answer.answer;
        } else if (answer.question.includes('期限') || answer.question.includes('期間')) {
          extractedProfileData.timeframe = answer.answer;
        } else if (answer.question.includes('勉強時間') || answer.question.includes('時間')) {
          extractedProfileData.studyTime = answer.answer;
        } else if (answer.question.includes('レベル')) {
          extractedProfileData.currentLevel = answer.answer;
        } else if (answer.question.includes('学習スタイル') || answer.question.includes('学習方法')) {
          extractedProfileData.learningStyle = [answer.answer];
        } else if (answer.question.includes('動機') || answer.question.includes('活用')) {
          extractedProfileData.motivation = answer.answer;
        } else if (answer.question.includes('苦手') || answer.question.includes('障壁') || answer.question.includes('不安')) {
          extractedProfileData.challenges = answer.answer;
        }
      });
      
      console.log('抽出したプロファイルデータ:', extractedProfileData);
      
      // カリキュラム全体構造の生成
      setGenerationStep(GenerationStep.CURRICULUM_BASE);
      const curriculumStructure = await generateCurriculumStructure(extractedProfileData);
      
      if (!curriculumStructure) {
        console.error('カリキュラム構造の生成に失敗しました');
        setGenerationStep(GenerationStep.ERROR);
        throw new Error('カリキュラム構造の生成に失敗しました');
      }
      
      console.log('カリキュラム構造を生成しました:', curriculumStructure);
      setGeneratedCurriculum(curriculumStructure);
      
      // モジュール最適化フェーズへ
      setGenerationStep(GenerationStep.CURRICULUM_MODULES);
      
      // 生成したカリキュラムをSupabaseに保存
      setGenerationStep(GenerationStep.SAVING_DATA);
      
      try {
        // 既存のカリキュラムデータを確認
        const { data: existingCurriculumData, error: checkError } = await supabase
          .from('user_curriculum')
          .select('id')
          .eq('user_id', user?.id);
        
        if (checkError) {
          console.error('既存カリキュラム確認エラー:', checkError);
          throw checkError;
        }
        
        // データ構造の準備（curriculum_dataをJSON型に変換）
        const curriculumDataObject = {
          user_id: user?.id,
          curriculum_data: JSON.parse(JSON.stringify(curriculumStructure)),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        let saveResult;
        
        if (existingCurriculumData && existingCurriculumData.length > 0) {
          // 既存のレコードを削除
          await supabase
            .from('user_curriculum')
            .delete()
            .eq('user_id', user?.id);
          
          // 新しいレコードを挿入
          saveResult = await supabase
            .from('user_curriculum')
            .insert([curriculumDataObject]);
        } else {
          // 新規レコードを作成
          saveResult = await supabase
            .from('user_curriculum')
            .insert([curriculumDataObject]);
        }
        
        if (saveResult.error) {
          console.error('カリキュラム保存エラー:', saveResult.error);
          throw saveResult.error;
        }
        
        console.log('カリキュラムが正常に保存されました');
        
        // プロファイル完了状態を更新
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ profile_completed: true, profile_data: extractedProfileData })
          .eq('id', user?.id);
        
        if (profileUpdateError) {
          console.error('プロファイル状態更新エラー:', profileUpdateError);
          // カリキュラムは保存できているので続行
        } else {
          console.log('プロファイル完了を設定しました');
          setProfileCompleted(true);
        }
        
        // 生成完了
        setGenerationStep(GenerationStep.COMPLETE);
        toast({
          title: "カリキュラム生成完了",
          description: "あなた専用の学習プランの準備ができました！",
        });
        
        // ダッシュボードへリダイレクト
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (saveError) {
        console.error('カリキュラム保存エラー:', saveError);
        setGenerationStep(GenerationStep.ERROR);
        throw saveError;
      } finally {
        // セッションフラグを削除（10秒後）
        setTimeout(() => {
          sessionStorage.removeItem(sessionKey);
        }, 10000);
      }
    } catch (error) {
      console.error('カリキュラム生成エラー:', error);
      setGenerationStep(GenerationStep.ERROR);
      toast({
        title: "エラーが発生しました",
        description: "カリキュラムの生成中にエラーが発生しました。再度お試しください。",
        variant: "destructive",
      });
      
      // セッションフラグを削除
      const sessionKey = `curriculum_gen_${user?.id}`;
      sessionStorage.removeItem(sessionKey);
    }
  };

  // 生成ステップに応じたメッセージを取得
  const getStepMessage = () => {
    switch (generationStep) {
      case GenerationStep.WAITING:
        return "準備中...";
      case GenerationStep.CURRICULUM_BASE:
        return "学習プランの基盤を生成中...";
      case GenerationStep.CURRICULUM_MODULES:
        return "あなたのプロファイルに合わせて最適化中...";
      case GenerationStep.SAVING_DATA:
        return "教材とコンテンツを組み立て中...";
      case GenerationStep.COMPLETE:
        return "完了！ダッシュボードに移動します...";
      case GenerationStep.ERROR:
        return "エラーが発生しました。再試行中...";
      default:
        return "処理中...";
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background p-4">
      <div className="w-full max-w-md mx-auto text-center mb-8">
        {isGenerating ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-center">
              <div className="bg-primary/10 text-primary p-4 rounded-full">
                <Rocket className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">カリキュラムを生成しています</h1>
            <p className="text-muted-foreground">{getStepMessage()}</p>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{Math.round(progress)}% 完了</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">プロファイル設定</h1>
            <p className="text-muted-foreground">
              AIアシスタントがあなたの学習プランを作成するための情報を収集しています。
              すべての質問に回答してください。
            </p>
          </div>
        )}
      </div>
      {!isGenerating && <ChatWidget />}
    </div>
  );
}
