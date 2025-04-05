import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Minimize2, Maximize2, Send, X, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ChatMessage from './ChatMessage';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChatState } from './ChatState';
import { Json } from '@/integrations/supabase/types';
import { useForm } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import TypingIndicator from './TypingIndicator';
import { generateCurriculumStructure } from '@/services/openai';
import { toast } from '@/components/ui/use-toast';

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

interface ProfileAnswer {
  question: string;
  answer: string;
}

type ProfileQuestionnaireForm = {
  goal: string;
  timeframe: string;
  studyTime: string;
  currentLevel: string;
  learningStyle: string[];
  motivation: string;
  challenges: string;
};

export default function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const { isOpen, setIsOpen, messages, addMessage, isMinimized, setIsMinimized, profileCompleted, setProfileCompleted } = useChatState();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userNameLoaded, setUserNameLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [generationStep, setGenerationStep] = useState<'INITIAL' | 'SAVING_DATA' | 'GENERATING_CURRICULUM' | 'SAVING_CURRICULUM' | 'COMPLETED' | 'ERROR'>('INITIAL');
  
  const profileForm = useForm<ProfileQuestionnaireForm>({
    defaultValues: {
      goal: '',
      timeframe: '',
      studyTime: '',
      currentLevel: '',
      learningStyle: [],
      motivation: '',
      challenges: '',
    }
  });

  const profileQuestions = [
    {
      id: 'goal' as const,
      type: 'freeform',
      question: 'どのような学習目標をお持ちですか？具体的に教えてください。',
      component: 'textarea',
    },
    {
      id: 'timeframe' as const,
      type: 'select',
      question: '学習にはどのくらいの期間を予定していますか？',
      options: [
        { value: '1month', label: '1か月以内' },
        { value: '3months', label: '3か月以内' },
        { value: '6months', label: '半年～1年' },
        { value: '1year_plus', label: '1年以上かけて' },
      ],
    },
    {
      id: 'studyTime' as const,
      type: 'select',
      question: '1日にどのくらいの時間を学習に充てられますか？',
      options: [
        { value: 'less_than_30min', label: '30分未満' },
        { value: 'about_1hour', label: '1時間程度' },
        { value: 'about_2hours', label: '2時間程度' },
        { value: 'more_than_2hours', label: '2時間以上' },
      ],
    },
    {
      id: 'currentLevel' as const,
      type: 'select',
      question: '現在のレベルを教えてください。',
      options: [
        { value: 'beginner', label: '初心者（全くの未経験）' },
        { value: 'novice', label: '初級（少し触れた程度）' },
        { value: 'intermediate', label: '中級（ある程度理解している）' },
        { value: 'advanced', label: '上級（実務でも使っている）' },
      ],
    },
    {
      id: 'learningStyle' as const,
      type: 'select',
      question: '好みの学習方法はありますか？',
      options: [
        { value: 'text', label: 'テキスト中心' },
        { value: 'video', label: '動画中心' },
        { value: 'exercise', label: '演習問題中心' },
        { value: 'visual', label: '図解やビジュアル多め' },
      ],
    },
    {
      id: 'motivation' as const,
      type: 'freeform',
      question: '学習の動機や、学んだことをどのように活用したいですか？',
      component: 'textarea',
    },
    {
      id: 'challenges' as const,
      type: 'freeform',
      question: '学習において不安や苦手に感じる点はありますか？',
      component: 'textarea',
    },
  ];

  // 無限ループを防ぐためのrefを追加
  const welcomeMessageSentRef = useRef(false);
  const processingTimestampRef = useRef<number | null>(null);

  // Profile completion handling
  const [isProfileCompletionInProgress, setIsProfileCompletionInProgress] = useState(false);

  // セッションストレージから処理状態を確認・保存するヘルパー関数
  const checkAndSetProcessingState = () => {
    if (typeof window === 'undefined' || !user?.id) return false;
    
    const now = Date.now();
    const key = `curriculum_processing_${user.id}`;
    const storedData = sessionStorage.getItem(key);
    
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        const timestamp = data.timestamp;
        
        // 10分以上経過した処理は失効と見なす
        if (now - timestamp > 10 * 60 * 1000) {
          sessionStorage.removeItem(key);
          return false;
        }
        
        // 処理中のフラグがある場合は処理中と見なす
        return true;
      } catch (e) {
        // 不正なJSONの場合はリセット
        sessionStorage.removeItem(key);
        return false;
      }
    }
    
    return false;
  };

  // 処理状態をセットする
  const setProcessingState = () => {
    if (typeof window === 'undefined' || !user?.id) return;
    
    const now = Date.now();
    processingTimestampRef.current = now;
    
    const key = `curriculum_processing_${user.id}`;
    sessionStorage.setItem(key, JSON.stringify({
      timestamp: now,
      userId: user.id
    }));
  };

  // 処理状態をクリアする
  const clearProcessingState = () => {
    if (typeof window === 'undefined' || !user?.id) return;
    
    const key = `curriculum_processing_${user.id}`;
    sessionStorage.removeItem(key);
    processingTimestampRef.current = null;
  };

  useEffect(() => {
    const fetchUserName = async () => {
      if (user) {
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (profileData && profileData.full_name) {
            setUserName(profileData.full_name);
            console.log("プロフィールからユーザー名を設定:", profileData.full_name);
          } else {
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
            setUserName(name);
            console.log("メタデータからユーザー名を設定:", name);
          }
          
          setUserNameLoaded(true);
        } catch (error) {
          console.error('Error fetching user name:', error);
          setUserNameLoaded(true);
        }
      } else {
        setUserNameLoaded(true);
      }
    };

    fetchUserName();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (user && location.pathname === '/profiling' && userNameLoaded) {
        try {
          console.log("プロファイリングページでプロファイルをチェックします");
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('profile_completed')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          console.log("プロファイル完了状態:", profileData?.profile_completed);

          if (profileData && !profileData.profile_completed) {
            console.log("プロファイル未完了: チャットを開きます");
            setIsOpen(true);
            setIsMinimized(false);
            setProfileCompleted(false);
            setIsFullscreen(true);
            
            // プロファイリング質問を一度だけ開始するようにする
            if (!showQuestionForm) {
              setTimeout(() => {
                console.log("プロファイル質問を開始します...");
                startProfileQuestions();
              }, 1500);
            }
          } else if (profileData) {
            setProfileCompleted(profileData.profile_completed);
          }
        } catch (error) {
          console.error('プロファイル状態チェックエラー:', error);
        }
      }
    };

    if (userNameLoaded) {
      checkUserProfile();
    }
  }, [user, location.pathname, setIsOpen, setIsMinimized, setProfileCompleted, userNameLoaded, showQuestionForm]);

  useEffect(() => {
    if (user && location.pathname === '/dashboard' && userNameLoaded && !welcomeMessageSentRef.current) {
      const checkCurriculumGeneration = async () => {
        try {
          const { data: curriculumData, error } = await supabase
            .from('user_curriculum')
            .select('created_at, curriculum_data')
            .eq('user_id', user.id)
            .single();

          if (!error && curriculumData) {
            const creationTime = new Date(curriculumData.created_at);
            const now = new Date();
            const timeDiff = now.getTime() - creationTime.getTime();
            const minutesDiff = Math.floor(timeDiff / 1000 / 60);

            // カリキュラム生成から5分以内の場合、フォローアップメッセージを表示（一度だけ）
            if (minutesDiff <= 5) {
              welcomeMessageSentRef.current = true; // 一度表示したらフラグを立てる
              setIsOpen(true);
              setIsMinimized(false);
              
              setTimeout(() => {
                const welcomeMessage = userName 
                  ? `${userName}さん、カリキュラムの生成が完了しました！学習を始める前に、気になることがありましたらお気軽にご質問ください。`
                  : 'カリキュラムの生成が完了しました！学習を始める前に、気になることがありましたらお気軽にご質問ください。';
                
                addMessage({
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: welcomeMessage,
                  timestamp: new Date(),
                });

                setTimeout(() => {
                  const suggestionMessage = `
以下のような質問にお答えできます：
• カリキュラムの進め方について
• 各モジュールの詳細な内容
• 学習時間の目安
• 効果的な学習方法のアドバイス

どのようなことでもお気軽にどうぞ！`;

                  addMessage({
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: suggestionMessage,
                    timestamp: new Date(),
                  });
                }, 1000);
              }, 500);
            }
          }
        } catch (error) {
          console.error('カリキュラム生成チェックエラー:', error);
        }
      };

      checkCurriculumGeneration();
    }
  }, [user, location.pathname, userNameLoaded, userName]);

  // 処理完了状態を保存するためのローカルストレージキー
  useEffect(() => {
    // ローカルストレージからフラグをチェック
    if (typeof window !== 'undefined') {
      const isCurriculumCompleted = localStorage.getItem(`curriculum_completed_${user?.id}`);
      if (isCurriculumCompleted === 'true') {
        welcomeMessageSentRef.current = true;
      }
    }
  }, [user?.id]);

  const startProfileQuestions = () => {
    if (!userNameLoaded) {
      console.log("ユーザー名がまだロードされていません。プロフィール質問を開始できません。");
      return;
    }

    setTimeout(() => {
      console.log("startProfileQuestions内のユーザー名:", userName);
      
      let greeting = 'こんにちは！goalwiseへようこそ。より良い学習体験を提供するために、いくつか質問させてください。';
      
      if (userName && userName.trim() !== '') {
        greeting = `${userName}さん、goalwiseへようこそ！より良い学習体験を提供するために、いくつか質問させてください。`;
        console.log("パーソナライズされたメッセージを使用:", greeting);
      } else {
        console.log("ユーザー名が空のため、デフォルトの挨拶を使用します");
      }
      
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      });
      
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
        const firstQuestion = profileQuestions[0];
        addMessage({
          id: Date.now().toString(),
          role: 'assistant',
          content: firstQuestion.question,
          timestamp: new Date(),
        });
        setShowQuestionForm(true);
      }, 1500);
    }, 800);
  };

  const handleSubmitQuestion = async (data: any) => {
    const currentQuestion = profileQuestions[currentQuestionIndex];
    let answer = '';
    
    if (currentQuestion.type === 'freeform') {
      answer = data[currentQuestion.id];
    } else if (currentQuestion.type === 'select') {
      if (currentQuestion.id === 'learningStyle') {
        const selectedOptions = currentQuestion.options
          .filter(opt => data[currentQuestion.id].includes(opt.value))
          .map(opt => opt.label);
        answer = selectedOptions.join(', ');
      } else {
        const selectedOption = currentQuestion.options.find(opt => opt.value === data[currentQuestion.id]);
        answer = selectedOption ? selectedOption.label : data[currentQuestion.id];
      }
    }
    
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: answer,
      timestamp: new Date(),
    });
    
    try {
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('profile_data')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        let profileAnswers: ProfileAnswer[] = [];

        if (profileData?.profile_data) {
          const data = profileData.profile_data as any;
          if (data.answers && Array.isArray(data.answers)) {
            profileAnswers = data.answers as ProfileAnswer[];
          }
        }

        profileAnswers.push({ 
          question: currentQuestion.question, 
          answer 
        });

        const updatedProfileData: Record<string, any> = {
          answers: profileAnswers
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ profile_data: updatedProfileData })
          .eq('id', user.id);

        if (updateError) throw updateError;

        setIsTyping(true);

        if (currentQuestionIndex < profileQuestions.length - 1) {
          setTimeout(() => {
            setIsTyping(false);
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
            
            const nextQuestion = profileQuestions[currentQuestionIndex + 1];
            addMessage({
              id: Date.now().toString(),
              role: 'assistant',
              content: nextQuestion.question,
              timestamp: new Date(),
            });
            
            profileForm.resetField(nextQuestion.id as keyof ProfileQuestionnaireForm);
          }, 1000);
        } else {
          setTimeout(() => {
            setIsTyping(false);
            const completionMessage = userName 
              ? `${userName}さん、ありがとうございます！プロファイル情報が保存されました。これから、あなたに最適な学習プランを生成します。少々お待ちください。`
              : 'ありがとうございます！プロファイル情報が保存されました。これから、あなたに最適な学習プランを生成します。少々お待ちください。';
            
            addMessage({
              id: Date.now().toString(),
              role: 'assistant',
              content: completionMessage,
              timestamp: new Date(),
            });
            
            const handleProfileCompletion = async () => {
              // 既に処理中の場合は二重実行を防止
              if (isProfileCompletionInProgress) {
                console.log('プロファイル完了処理は既に実行中です');
                return;
              }
              
              // セッションストレージで処理状態を確認
              if (checkAndSetProcessingState()) {
                console.log('別のタブやウィンドウで処理が実行中です');
                toast({
                  title: '処理中です',
                  description: '別のタブやウィンドウでプロファイル処理が実行中です。しばらくお待ちください。',
                  variant: 'default',
                });
                return;
              }
              
              try {
                // 処理状態をセット
                setProcessingState();
                setIsProfileCompletionInProgress(true);
                setGenerationStep('SAVING_DATA');
                
                // プロファイルデータの取得
                const { data: profileData, error: profileFetchError } = await supabase
                  .from('profiles')
                  .select('profile_data')
                  .eq('id', user?.id)
                  .single();
                  
                if (profileFetchError) {
                  console.error('プロファイルデータ取得エラー:', profileFetchError);
                  throw new Error('プロファイルデータの取得に失敗しました');
                }
                
                // プロファイルデータを抽出
                const extractedProfileData = profileData?.profile_data?.answers
                  ? profileData.profile_data.answers.reduce((acc: any, item: any) => {
                      // 質問文からキーを抽出
                      let key = '';
                      if (item.question.includes('学習目標')) key = 'goal';
                      else if (item.question.includes('学習にはどのくらいの期間')) key = 'timeframe';
                      else if (item.question.includes('1日にどのくらいの時間')) key = 'studyTime';
                      else if (item.question.includes('現在のレベル')) key = 'currentLevel';
                      else if (item.question.includes('好みの学習方法')) key = 'learningStyle';
                      else if (item.question.includes('学習の動機')) key = 'motivation';
                      else if (item.question.includes('学習において不安')) key = 'challenges';
                      
                      if (key) {
                        if (key === 'learningStyle') {
                          // 複数選択の場合、カンマで区切られた値を配列に変換
                          acc[key] = item.answer.split(', ').map((style: string) => {
                            if (style.includes('テキスト')) return 'text';
                            if (style.includes('動画')) return 'video';
                            if (style.includes('演習')) return 'exercise';
                            if (style.includes('ビジュアル') || style.includes('図解')) return 'visual';
                            return style.toLowerCase();
                          });
                        } else {
                          acc[key] = item.answer;
                        }
                      }
                      return acc;
                    }, {})
                  : {};
                  
                console.log('抽出したプロファイルデータ:', extractedProfileData);
                
                // プロファイル完了をマーク
                const { error: profileError } = await supabase
                  .from('profiles')
                  .update({ profile_completed: true })
                  .eq('id', user?.id);
                  
                if (profileError) {
                  console.error('プロファイル完了の設定に失敗しました:', profileError);
                  throw new Error('プロファイル情報の更新に失敗しました');
                }
                
                console.log('プロファイル完了を設定しました、状態を更新します');
                setProfileCompleted(true); // 状態更新を追加
                
                // カリキュラム生成
                setGenerationStep('GENERATING_CURRICULUM');
                
                // コンソールにログを追加して状態を追跡
                console.log('カリキュラム生成を開始します');
                addMessage({
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: 'カリキュラムを生成中です...',
                  timestamp: new Date(),
                });
                
                const curriculumStructure = await generateCurriculumStructure(extractedProfileData);
                
                if (!curriculumStructure) {
                  throw new Error('カリキュラム構造の生成に失敗しました');
                }
                
                console.log('カリキュラム構造を生成しました:', curriculumStructure);
                
                // カリキュラムデータの保存
                setGenerationStep('SAVING_CURRICULUM');
                addMessage({
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: 'カリキュラムを保存中...',
                  timestamp: new Date(),
                });
                
                try {
                  // まず既存のカリキュラムを確認
                  const { data: existingCurriculum, error: existingError } = await supabase
                    .from('user_curriculum')
                    .select('id')
                    .eq('user_id', user?.id);
                    
                  if (existingError) {
                    console.error('既存カリキュラム確認エラー:', existingError);
                    throw existingError;
                  }
                  
                  // カリキュラムデータをJSON形式に変換
                  const jsonCurriculumData = JSON.parse(JSON.stringify(curriculumStructure));
                  
                  if (existingCurriculum && existingCurriculum.length > 0) {
                    // 既存のカリキュラムがある場合は削除してから新規追加（更新の代わり）
                    await supabase
                      .from('user_curriculum')
                      .delete()
                      .eq('user_id', user?.id);
                  }
                  
                  // 新しいカリキュラムを挿入
                  const { error: insertError } = await supabase
                    .from('user_curriculum')
                    .insert([{
                      user_id: user?.id,
                      curriculum_data: jsonCurriculumData,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }]);
                    
                  if (insertError) {
                    console.error('カリキュラム挿入エラー:', insertError);
                    throw insertError;
                  }
                  
                  // 挿入確認
                  const { data: confirmData, error: confirmError } = await supabase
                    .from('user_curriculum')
                    .select('id')
                    .eq('user_id', user?.id)
                    .single();
                    
                  if (confirmError) {
                    console.error('カリキュラム確認エラー:', confirmError);
                    throw new Error('カリキュラムの確認ができませんでした');
                  }
                  
                  if (!confirmData) {
                    throw new Error('カリキュラムの保存に失敗しました（データが見つかりません）');
                  }
                  
                } catch (saveError) {
                  console.error('カリキュラムの保存に失敗しました:', saveError);
                  throw new Error('カリキュラムの保存に失敗しました');
                }
                
                console.log('カリキュラムが正常に保存されました');
                setGenerationStep('COMPLETED');
                
                // 処理完了をローカルストレージに保存
                if (typeof window !== 'undefined' && user?.id) {
                  localStorage.setItem(`curriculum_completed_${user.id}`, 'true');
                }
                
                addMessage({
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: 'カリキュラムの生成が完了しました！ダッシュボードに移動します。',
                  timestamp: new Date(),
                });
                
                // 保存完了後、少し待ってからリダイレクト
                await new Promise(resolve => setTimeout(resolve, 2000));
                navigate('/dashboard');
                
              } catch (error) {
                console.error('プロファイル完了処理でエラーが発生しました:', error);
                setGenerationStep('ERROR');
                toast({
                  title: 'エラーが発生しました',
                  description: error instanceof Error ? error.message : 'プロファイル設定中にエラーが発生しました',
                  variant: 'destructive',
                });
              } finally {
                // 処理状態をクリア
                clearProcessingState();
                setIsProfileCompletionInProgress(false);
              }
            };
            
            handleProfileCompletion();
          }, 1500);
        }
      }
    } catch (error) {
      console.error('プロファイル質問処理エラー:', error);
      setIsTyping(false);
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // 入力をクリアして処理中フラグを立てる
    const userMessage = input;
    setInput('');
    setIsLoading(true);

    const userMessageId = Date.now().toString();
    addMessage({
      id: userMessageId,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    try {
      if (user) {
        setIsTyping(true);
        
        // 非同期処理を正しく実装（setTimeout ではなく、実際の非同期処理として）
        await new Promise<void>(resolve => {
          setTimeout(() => {
            setIsTyping(false);
            
            const currentUserName = userName && userName.trim() !== '' ? userName : null;
            
            let responseContent = '';
            
            if (userMessage.includes('こんにちは') || userMessage.includes('はじめまして')) {
              responseContent = currentUserName 
                ? `こんにちは、${currentUserName}さん！今日はどのようなお手伝いができますか？`
                : `こんにちは！今日はどのようなお手伝いができますか？`;
            } else if (userMessage.includes('ありがとう')) {
              responseContent = currentUserName 
                ? `どういたしまして、${currentUserName}さん。他にご質問があればいつでもどうぞ。`
                : `どういたしまして。他にご質問があればいつでもどうぞ。`;
            } else if (userMessage.includes('学習') || userMessage.includes('勉強')) {
              responseContent = `学習についてのご質問ですね。具体的にどのような内容についてお知りになりたいですか？例えば、学習計画の立て方や、効率的な勉強方法などについてアドバイスできます。`;
            } else {
              responseContent = currentUserName 
                ? `${currentUserName}さん、ありがとうございます。他にご質問やお手伝いできることはありますか？`
                : `ありがとうございます。他に質問やお手伝いできることはありますか？`;
            }
            
            addMessage({
              id: Date.now().toString(),
              role: 'assistant',
              content: responseContent,
              timestamp: new Date(),
            });
            
            resolve();
          }, 1500);
        });
      }
    } catch (error) {
      console.error('Error in chat processing:', error);
      setIsTyping(false);
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: 'すみません、エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else {
      setIsMinimized(!isMinimized);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const closeChat = () => {
    setIsOpen(false);
    setIsFullscreen(false);
  };

  const renderQuestionForm = () => {
    if (!showQuestionForm) return null;
    
    const currentQuestion = profileQuestions[currentQuestionIndex];
    
    return (
      <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(handleSubmitQuestion)} className="space-y-4 py-2">
          {currentQuestion.type === 'freeform' && (
            <FormField
              control={profileForm.control}
              name={currentQuestion.id}
              render={({ field }) => (
                <FormItem>
                  {currentQuestion.component === 'textarea' ? (
                    <Textarea
                      {...field}
                      placeholder="こちらに入力してください..."
                      className="min-h-[80px]"
                    />
                  ) : (
                    <Input
                      {...field}
                      placeholder="こちらに入力してください..."
                    />
                  )}
                </FormItem>
              )}
            />
          )}
          
          {currentQuestion.type === 'select' && currentQuestion.id !== 'learningStyle' && (
            <FormField
              control={profileForm.control}
              name={currentQuestion.id}
              render={({ field }) => (
                <FormItem>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentQuestion.options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}
          
          {currentQuestion.type === 'select' && currentQuestion.id === 'learningStyle' && (
            <FormField
              control={profileForm.control}
              name={currentQuestion.id}
              render={() => (
                <FormItem>
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={option.value}
                          checked={profileForm.watch('learningStyle').includes(option.value)}
                          onCheckedChange={(checked) => {
                            const currentValues = profileForm.getValues('learningStyle') || [];
                            
                            if (checked) {
                              profileForm.setValue('learningStyle', [...currentValues, option.value]);
                            } else {
                              profileForm.setValue(
                                'learningStyle', 
                                currentValues.filter((value) => value !== option.value)
                              );
                            }
                          }}
                        />
                        <label 
                          htmlFor={option.value}
                          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </FormItem>
              )}
            />
          )}
          
          <Button type="submit" className="w-full">次へ</Button>
        </form>
      </Form>
    );
  };

  if (!isOpen) {
    return (
      <Button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg flex items-center justify-center"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  const chatContainerClass = isFullscreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/70'
    : isMinimized
      ? 'fixed bottom-6 right-6 w-14 h-14'
      : 'fixed bottom-6 right-6 w-80 sm:w-96 h-[500px]';

  const chatWindowClass = isFullscreen
    ? 'bg-background border border-border rounded-lg shadow-lg flex flex-col w-[90%] h-[90%] max-w-[800px]'
    : isMinimized
      ? 'w-full h-full flex items-center justify-center bg-background border border-border rounded-full shadow-lg'
      : 'w-full h-full bg-background border border-border rounded-lg shadow-lg flex flex-col';

  return (
    <div className={chatContainerClass}>
      <div className={chatWindowClass}>
        {isMinimized ? (
          <Button 
            variant="ghost" 
            onClick={toggleChat}
            className="w-full h-full flex items-center justify-center"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        ) : (
          <>
            <div className="p-3 border-b flex justify-between items-center bg-primary text-primary-foreground">
              <h3 className="font-medium">AIアシスタント</h3>
              <div className="flex items-center space-x-1">
                {!isFullscreen && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground"
                    onClick={toggleFullscreen}
                    title="全画面表示"
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                )}
                {isFullscreen ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground"
                    onClick={toggleFullscreen}
                    title="縮小表示"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary-foreground"
                    onClick={closeChat}
                    title="閉じる"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {showQuestionForm ? (
              <div className="p-3 border-t">
                {renderQuestionForm()}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
