import { useEffect, useState, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Book, Calendar, Clock, ArrowUpRight, Rocket, Award, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LearningPlan from '@/components/LearningPlan';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CurriculumStructure } from '@/services/openai';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

// LearningPlanDataの型定義
interface LearningPlanData {
  title: string;
  description: string;
  nodes: PlanNode[];
}

interface PlanNode {
  id: string;
  title: string;
  description: string;
  children?: PlanNode[];
}

// Material型の定義
interface Material {
  id: string;
  title: string;
  category: string;
  progress: number;
  lastAccessed: string;
  image: string;
}

// デフォルトの教材データ
const defaultMaterials: Material[] = [
  {
    id: 'module-1',
    title: 'デフォルト教材',
    category: '学習',
    progress: 0,
    lastAccessed: '最近',
    image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80',
  }
];

// デフォルトの学習プランデータ
const defaultLearningPlan: LearningPlanData = {
  title: 'デフォルト学習プラン',
  description: 'カリキュラムデータが読み込まれるまでお待ちください',
  nodes: [
    {
      id: 'default-node',
      title: '読み込み中...',
      description: 'カリキュラムデータを読み込んでいます',
      children: []
    }
  ]
};

// モック教材データを実際のカリキュラムデータから生成するヘルパー関数
const generateMaterialsFromCurriculum = (curriculum: CurriculumStructure | null) => {
  if (!curriculum) return defaultMaterials;
  
  // モジュールの先頭3つを使用して教材カードを生成
  const materials = curriculum.modules.slice(0, 3).map((module, index) => {
    // ランダムな進捗状況（実際の実装では、ユーザーの進捗データから取得）
    const progress = Math.floor(Math.random() * 80);
    
    return {
      id: module.id,
      title: module.title,
      category: curriculum.skills_covered[0] || "学習",
      progress: progress,
      lastAccessed: ["昨日", "3日前", "1週間前"][index] || "最近",
      image: [
        "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80"
      ][index] || "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80",
    };
  });
  
  return materials.length > 0 ? materials : defaultMaterials;
};

// カリキュラムデータからLearningPlanデータを生成するヘルパー関数
const convertCurriculumToPlanData = (curriculum: CurriculumStructure | null): LearningPlanData => {
  if (!curriculum) return defaultLearningPlan;
  
  // カリキュラムのモジュールをLearningPlanのノードに変換
  const nodes = curriculum.modules.map(module => {
    // ユニットを子ノードに変換
    const children = module.units.map(unit => ({
      id: unit.id,
      title: unit.title,
      description: `タイプ: ${unit.type}`,
      // 必要に応じて子ノードを追加
      children: []
    }));
    
    return {
      id: module.id,
      title: module.title,
      description: module.description,
      children: children
    };
  });
  
  return {
    title: curriculum.title,
    description: curriculum.description,
    nodes: nodes
  };
};

// Mock data for activity chart
const activityData = [
  { day: "5/20", minutes: 10 },
  { day: "5/21", minutes: 25 },
  { day: "5/22", minutes: 45 },
  { day: "5/23", minutes: 30 },
  { day: "5/24", minutes: 60 },
  { day: "5/25", minutes: 40 },
  { day: "5/26", minutes: 55 },
  { day: "5/27", minutes: 75 },
  { day: "5/28", minutes: 50 },
  { day: "5/29", minutes: 65 },
  { day: "5/30", minutes: 90 },
  { day: "5/31", minutes: 70 },
  { day: "6/1", minutes: 85 },
  { day: "6/2", minutes: 50 },
];

// Mock data for progress chart
const progressData = [
  { name: "完了", value: 42, percentage: 42, color: "hsl(var(--primary))" },
  { name: "進行中", value: 28, percentage: 28, color: "hsl(var(--accent))" },
  { name: "未開始", value: 30, percentage: 30, color: "#e0e0e0" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [curriculum, setCurriculum] = useState<CurriculumStructure | null>(null);
  const [learningPlanData, setLearningPlanData] = useState(defaultLearningPlan);
  const [materials, setMaterials] = useState(defaultMaterials);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [hasStartedLearning, setHasStartedLearning] = useState(false);
  const [userStats, setUserStats] = useState({
    totalHours: '0',
    completedMaterials: '0',
    streakDays: '0',
    skillPoints: '0'
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const redirectAttemptRef = useRef(0);
  const lastRedirectTimeRef = useRef<number | null>(null);

  // リダイレクトの制限を管理する関数
  const shouldAllowRedirect = () => {
    const now = Date.now();
    
    // 前回のリダイレクトから3秒以上経過している必要がある
    if (lastRedirectTimeRef.current && now - lastRedirectTimeRef.current < 3000) {
      console.log('リダイレクトの間隔が短すぎます');
      return false;
    }
    
    // リダイレクト回数の制限
    if (redirectAttemptRef.current >= 3) {
      console.log('リダイレクト回数の上限に達しました');
      return false;
    }
    
    // セッションストレージを確認
    if (typeof window !== 'undefined') {
      const redirectingFlag = sessionStorage.getItem('is_redirecting');
      if (redirectingFlag === 'true') {
        console.log('別のコンポーネントでリダイレクト処理中です');
        return false;
      }
    }
    
    return true;
  };

  // リダイレクト状態をセットする
  const setRedirectingState = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('is_redirecting', 'true');
      lastRedirectTimeRef.current = Date.now();
    }
  };

  // リダイレクト状態をクリアする
  const clearRedirectingState = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('is_redirecting');
    }
  };

  // リダイレクト処理を改善
  const safeRedirectToProfiling = () => {
    if (!shouldAllowRedirect()) {
      console.log('リダイレクトが制限されています');
      return;
    }

    redirectAttemptRef.current += 1;
    setRedirectingState();
    setIsRedirecting(true);
    
    // リダイレクト前の状態クリア処理
    console.log('プロファイリングページへリダイレクトします');
    
    setTimeout(() => {
      navigate('/profiling');
    }, 500);
  };

  const fetchUserCurriculum = async () => {
    // 進行中のリクエストがあれば無視
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    setLoading(true);
    let retryCount = 0;
    const maxRetries = 3;
    const sessionKey = `curriculum_fetch_${user.id}`;
    
    // 同一セッション内での重複処理防止
    if (sessionStorage.getItem(sessionKey)) {
      console.log('このセッションで既にデータ取得処理を実行中です');
      isFetchingRef.current = false;
      setLoading(false);
      return;
    }
    
    sessionStorage.setItem(sessionKey, 'true');
    
    try {
      while (retryCount < maxRetries) {
        try {
          console.log(`カリキュラムデータを取得します - ユーザーID: ${user.id} (試行: ${retryCount + 1}/${maxRetries})`);
          
          // プロファイル情報を先に取得
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('profile_completed')
            .eq('id', user.id)
            .single();
            
          if (profileError) {
            console.error('プロファイル情報取得エラー:', profileError);
            throw new Error('プロファイル情報の取得に失敗しました');
          }
          
          // プロファイル未完了の場合はプロファイリングページにリダイレクト
          if (!profileData?.profile_completed) {
            console.log('プロファイル未完了: プロファイリングページにリダイレクトします');
            safeRedirectToProfiling();
            return;
          }
          
          // リダイレクト試行カウンタをリセット
          redirectAttemptRef.current = 0;
          
          // カリキュラムデータの取得 - Supabaseクライアントのメソッドを使用
          const { data: curriculumData, error: curriculumError } = await supabase
            .from('user_curriculum')
            .select('*')
            .eq('user_id', user.id);
            
          if (curriculumError) {
            console.error(`カリキュラムデータ取得エラー:`, curriculumError);
            throw new Error(`APIエラー: ${curriculumError.message}`);
          }
          
          if (!curriculumData || curriculumData.length === 0 || !curriculumData[0].curriculum_data) {
            console.log('カリキュラムデータが見つかりません。リトライします...');
            
            if (retryCount < maxRetries - 1) {
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 指数バックオフ
              continue;
            }
            
            // カリキュラムデータがない場合はプロファイル完了状態をリセット
            const { error: resetError } = await supabase
              .from('profiles')
              .update({ profile_completed: false })
              .eq('id', user.id);
              
            if (!resetError) {
              console.log('プロファイル完了状態をリセットしました');
              localStorage.removeItem(`curriculum_completed_${user.id}`);
            }
            
            // プロファイリングにリダイレクト
            safeRedirectToProfiling();
            return;
          }
          
          console.log('カリキュラムデータを読み込みました:', curriculumData[0]);
          const curriculumStructure = curriculumData[0].curriculum_data as unknown as CurriculumStructure;
          setCurriculum(curriculumStructure);
          
          // カリキュラムデータから学習プランデータを生成
          const planData = convertCurriculumToPlanData(curriculumStructure);
          setLearningPlanData(planData);
          
          // 最近のモジュールデータを設定
          setMaterials(generateMaterialsFromCurriculum(curriculumStructure));
          
          break; // 正常に取得できたらループを終了
        } catch (error) {
          console.error('カリキュラムデータ取得エラー:', error);
          
          if (retryCount < maxRetries - 1) {
            console.log(`カリキュラムデータ取得リトライ (${retryCount + 1}/${maxRetries})`);
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            continue;
          }
          
          // すべてのリトライが失敗した場合
          setErrorMessage('カリキュラムデータの取得に失敗しました。再試行してください。');
        }
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      // セッションストレージから処理中フラグを削除（一定時間後）
      setTimeout(() => {
        sessionStorage.removeItem(sessionKey);
      }, 10000); // 10秒後にフラグをクリア
    }
  };

  useEffect(() => {
    fetchUserCurriculum();
  }, [user, navigate, isRedirecting]);
  
  // isRedirecting状態を元に戻すための処理
  useEffect(() => {
    if (isRedirecting && location.pathname === '/profiling') {
      // プロファイリングページに遷移完了したらリダイレクトフラグをリセット
      setIsRedirecting(false);
      clearRedirectingState();
    }
  }, [location.pathname, isRedirecting]);
  
  // 新規ユーザー向けの初期データ設定
  const setInitialUserData = (curriculumData: CurriculumStructure) => {
    setUserStats({
      totalHours: "0",
      completedMaterials: "0",
      streakDays: "0",
      skillPoints: "0"
    });
    
    // 最初の3つのモジュールをサンプルとして表示
    if (curriculumData.modules && curriculumData.modules.length > 0) {
      const initialModules = curriculumData.modules.slice(0, 3).map((module, index) => ({
        id: module.id,
        title: module.title,
        category: curriculumData.skills_covered[0] || "学習",
        progress: 0,
        lastAccessed: "未開始",
        image: [
          "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80"
        ][index] || "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80",
      }));
      
      setMaterials(initialModules);
    }
  };
  
  // ユーザー名を取得（本来はAuthContextから取得）
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ユーザー';
  
  // 統計データの作成
  const statsData = [
    { 
      label: "総学習時間", 
      value: `${userStats.totalHours}時間`, 
      change: hasStartedLearning ? "12%" : null, 
      icon: <Clock className="h-5 w-5" /> 
    },
    { 
      label: "完了した教材", 
      value: userStats.completedMaterials, 
      change: hasStartedLearning ? "2" : null, 
      icon: <Book className="h-5 w-5" /> 
    },
    { 
      label: "学習継続日数", 
      value: `${userStats.streakDays}日`, 
      change: hasStartedLearning ? "4" : null, 
      icon: <Calendar className="h-5 w-5" /> 
    },
    { 
      label: "獲得スキルポイント", 
      value: userStats.skillPoints, 
      change: hasStartedLearning ? "85" : null, 
      icon: <Award className="h-5 w-5" /> 
    },
  ];
  
  return (
    <div className="min-h-screen flex flex-col w-full">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16 w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl w-full">
          {/* Welcome header */}
          <div className="mb-8 animate-slide-down w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">こんにちは、{userName} さん</h1>
                <p className="text-muted-foreground mt-1">あなたの今日の学習目標と進捗状況を確認しましょう。</p>
              </div>
              {curriculum && (
              <Button className="button-hover self-start" asChild>
                  <NavLink to={hasStartedLearning ? "/materials" : `/modules/${curriculum.modules[0]?.id}`}>
                    {hasStartedLearning ? "続きから学習する" : "学習を始める"}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </NavLink>
              </Button>
              )}
            </div>
          </div>
          
          {/* Stats overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 w-full">
            {statsData.map((stat, index) => (
              <Card key={index} className="animate-fade-in">
                <CardHeader className="pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <div className="bg-primary/10 text-primary p-2 rounded-lg">
                      {stat.icon}
                    </div>
                    <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
                    {stat.change && (
                      <Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-100">
                        +{stat.change}
                        <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* カリキュラム表示セクション */}
          <Card className="col-span-12 mt-8 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">学習プラン</CardTitle>
              <CardDescription>
                あなた専用の学習カリキュラムです。異なる表示方法で確認できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {loading ? (
                <div className="w-full py-20 flex flex-col items-center justify-center">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <p className="mt-4 text-muted-foreground">カリキュラムデータを読み込み中...</p>
                </div>
              ) : learningPlanData ? (
                <LearningPlan planData={learningPlanData} />
              ) : (
                <div className="w-full py-12 text-center">
                  <p>カリキュラムデータを読み込めませんでした。</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Loading state */}
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">カリキュラムデータを読み込み中...</p>
            </div>
          ) : curriculum ? (
            <>
              {hasStartedLearning ? (
                <>
                  {/* Learning progress and charts for users who have started learning */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="lg:col-span-2 animate-fade-in">
              <CardHeader>
                <CardTitle>学習進捗</CardTitle>
                <CardDescription>過去30日間の学習活動</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="day" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}分`} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: 'none' }}
                        formatter={(value) => [`${value}分`, '学習時間']}
                      />
                      <Line
                        type="monotone"
                        dataKey="minutes"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>目標達成状況</CardTitle>
                <CardDescription>現在の進捗状況</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-6">
                  <div className="h-[180px] w-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={progressData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {progressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {progressData.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{item.percentage}%</span>
                      </div>
                      <Progress value={item.percentage} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
                </>
              ) : (
                // 新規ユーザー向けのウェルカムセクション
                <div className="mb-12 w-full">
                  <Card className="animate-fade-in w-full">
                    <CardHeader>
                      <CardTitle>学習を始めましょう！</CardTitle>
                      <CardDescription>あなた専用のカリキュラムが生成されました</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row items-center gap-6 p-6">
                      <div className="bg-primary/10 text-primary p-6 rounded-full">
                        <Rocket className="h-16 w-16" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <p>
                          {userName}さん、あなた専用のカリキュラムの準備ができました。
                          あなたの目標と学習スタイルに合わせて最適化された学習プランで効率的に知識を身につけましょう。
                        </p>
                        <div className="pt-2">
                          <Button size="lg" className="button-hover" asChild>
                            <NavLink to={`/modules/${curriculum.modules[0]?.id}`}>
                              今すぐ学習を始める
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </NavLink>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Learning material section - show for all users with curriculum */}
              {materials.length > 0 && (
                <div className="mb-10 w-full">
                  <div className="flex items-center justify-between mb-6 w-full">
                    <h2 className="text-2xl font-bold">{hasStartedLearning ? "最近の学習教材" : "あなたの教材"}</h2>
              <Button variant="outline" size="sm" asChild>
                <NavLink to="/materials">
                  すべて見る
                  <ChevronRight className="ml-1 h-4 w-4" />
                </NavLink>
              </Button>
            </div>
            
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {materials.map((material, idx) => (
                <Card key={idx} className="overflow-hidden animate-fade-in card-hover">
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={material.image} 
                      alt={material.title} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{material.category}</Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{material.lastAccessed}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-2">{material.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <span>進捗状況</span>
                      <span>{material.progress}%</span>
                    </div>
                    <Progress value={material.progress} className="h-1.5" />
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full button-hover" asChild>
                            <NavLink to={`/modules/${material.id}`}>
                              {material.progress > 0 ? "続きから学習する" : "学習を始める"}
                      </NavLink>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
              )}
            </>
          ) : (
            // カリキュラムがない場合（エラーなど）のフォールバック
            <div className="text-center py-12">
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>カリキュラムが見つかりません</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-6">カリキュラムデータの取得に失敗しました。再読み込みするか、プロファイル設定からやり直してください。</p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={() => window.location.reload()}>
                      再読み込み
                    </Button>
                    <Button variant="outline" asChild>
                      <NavLink to="/profiling">
                        プロファイリングへ
                      </NavLink>
                    </Button>
                  </div>
                </CardContent>
              </Card>
          </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
