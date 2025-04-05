import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getAllProgress, calculateProgressSummary, LearningProgress, calculateActivitySummary, ActivitySummary } from '@/services/progress';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, X, AlertCircle, BookOpen, Award, BarChart3 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// 進捗ダッシュボードコンポーネント
const ProgressDashboard: React.FC = () => {
  const [progressData, setProgressData] = useState<LearningProgress[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadProgressData() {
      try {
        setLoading(true);
        setError(null);
        
        // ユーザーIDを取得
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        
        if (!userId) {
          setError('ユーザー情報が取得できませんでした。ログインしてください。');
          setLoading(false);
          return;
        }
        
        // 進捗データとアクティビティサマリーを取得
        const progress = await getAllProgress(userId);
        const activity = await calculateActivitySummary(userId);
        
        setProgressData(progress);
        setActivitySummary(activity);
      } catch (error) {
        console.error('進捗データ取得エラー:', error);
        setError('進捗データの取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    }
    
    loadProgressData();
  }, []);
  
  // 進捗の概要を計算
  const progressSummary = calculateProgressSummary(progressData);
  
  // モジュールごとにグループ化
  const moduleProgressMap = progressData.reduce((acc, item) => {
    if (!acc[item.moduleId]) {
      acc[item.moduleId] = [];
    }
    acc[item.moduleId].push(item);
    return acc;
  }, {} as Record<string, LearningProgress[]>);
  
  // セッションタイプを日本語に変換
  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'practice': return '練習問題';
      case 'quiz': return 'クイズ';
      case 'review': return '復習';
      case 'feedback': return 'フィードバック';
      default: return type;
    }
  };
  
  // ローディング中の表示
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-[200px] w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
      </div>
    );
  }
  
  // エラー表示
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>エラーが発生しました</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  // データがない場合の表示
  if (progressData.length === 0) {
    return (
      <Alert>
        <BookOpen className="h-4 w-4" />
        <AlertTitle>学習データがありません</AlertTitle>
        <AlertDescription>
          まだ学習を開始していないようです。モジュールを選択して学習を始めてみましょう。
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
        <h2 className="text-2xl font-bold">学習進捗ダッシュボード</h2>
        <div className="flex items-center space-x-2 mt-2 md:mt-0">
          <Badge variant="secondary" className="px-3 py-1">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            学習者レベル: 中級者
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            <Award className="h-3.5 w-3.5 mr-1" />
            累計ポイント: {progressSummary.totalCorrectAnswers * 10}
          </Badge>
        </div>
      </div>
      
      {/* 全体の進捗サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">完了モジュール</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressSummary.completedModules}/{progressSummary.totalModules}
            </div>
            <Progress
              value={progressSummary.completionRate}
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {progressSummary.completionRate.toFixed(1)}% 完了
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">回答正答率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressSummary.overallAccuracy.toFixed(1)}%
            </div>
            <Progress
              value={progressSummary.overallAccuracy}
              className="h-2 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              全{progressSummary.totalQuestionsAnswered}問中{progressSummary.totalCorrectAnswers}問正解
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">合計学習回数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progressData.length}回
            </div>
            <div className="flex space-x-2 mt-2">
              <Badge variant="outline">練習: {progressData.filter(p => p.sessionType === 'practice').length}回</Badge>
              <Badge variant="outline">クイズ: {progressData.filter(p => p.sessionType === 'quiz').length}回</Badge>
              <Badge variant="outline">復習: {progressData.filter(p => p.sessionType === 'review').length}回</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* タブ付きのモジュール詳細 */}
      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules">
            <BookOpen className="h-4 w-4 mr-2" />
            モジュール別
          </TabsTrigger>
          <TabsTrigger value="history">
            <BarChart3 className="h-4 w-4 mr-2" />
            学習履歴
          </TabsTrigger>
          <TabsTrigger value="activity">
            <BarChart3 className="h-4 w-4 mr-2" />
            学習傾向
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Award className="h-4 w-4 mr-2" />
            達成状況
          </TabsTrigger>
        </TabsList>
        
        {/* モジュール別タブ */}
        <TabsContent value="modules">
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(moduleProgressMap).map(([moduleId, modules]) => {
              // モジュールの最高正答率を計算
              const bestAccuracy = Math.max(
                ...modules.map(m => 
                  m.questionsAnswered > 0 
                    ? (m.correctAnswers / m.questionsAnswered) * 100 
                    : 0
                )
              );
              
              // 完了したセッション数
              const completedSessions = modules.filter(m => m.completed).length;
              
              return (
                <Card key={moduleId}>
                  <CardHeader>
                    <CardTitle>モジュール: {moduleId}</CardTitle>
                    <CardDescription>
                      セッション数: {modules.length} (完了: {completedSessions})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>最高正答率:</span>
                        <span className="font-medium">{bestAccuracy.toFixed(1)}%</span>
                      </div>
                      <Progress value={bestAccuracy} className="h-2" />
                      
                      {/* セッションリスト */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">学習セッション</h4>
                        <div className="space-y-2">
                          {modules.map((session, index) => (
                            <div 
                              key={index} 
                              className="flex items-center justify-between p-2 text-sm border rounded-md"
                            >
                              <div className="flex items-center">
                                {session.completed 
                                  ? <Check className="h-4 w-4 text-green-500 mr-2" /> 
                                  : <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
                                }
                                <span>
                                  {getSessionTypeLabel(session.sessionType)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span>
                                  {session.questionsAnswered}/{session.totalQuestions}問完了
                                </span>
                                <span>
                                  正答率: 
                                  {session.questionsAnswered > 0 
                                    ? ((session.correctAnswers / session.questionsAnswered) * 100).toFixed(1) 
                                    : 0}%
                                </span>
                                <Badge variant={session.completed ? "success" : "outline"}>
                                  {session.completed ? "完了" : "進行中"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        {/* 学習履歴タブ */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>回答履歴</CardTitle>
              <CardDescription>
                過去の回答と評価結果
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {progressData
                    .filter(session => session.answerHistory && session.answerHistory.length > 0)
                    .flatMap(session => {
                      if (!session.answerHistory) return [];
                      
                      return session.answerHistory.map((answer, index) => (
                        <div 
                          key={`${session.id}-${index}`}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">問題: {answer.question}</p>
                              <div className="mt-2 space-y-1 text-sm">
                                <p>あなたの回答: {answer.userAnswer}</p>
                                <p>正解: {answer.correctAnswer}</p>
                                {answer.feedback && (
                                  <div className="pl-3 border-l-2 border-primary mt-2">
                                    <p className="text-sm font-medium">フィードバック:</p>
                                    <p className="text-sm text-muted-foreground">{answer.feedback}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={answer.isCorrect ? "success" : "destructive"}>
                                {answer.isCorrect 
                                  ? <Check className="h-3 w-3 mr-1" /> 
                                  : <X className="h-3 w-3 mr-1" />
                                }
                                {answer.isCorrect ? "正解" : "不正解"}
                              </Badge>
                              {answer.score !== undefined && (
                                <div className="text-xs bg-secondary py-1 px-2 rounded-md">
                                  スコア: {answer.score}/100
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <div className="text-xs text-gray-500">
                              {new Date(answer.timestamp).toLocaleString()}
                              <Badge variant="outline" className="ml-2">
                                {getSessionTypeLabel(session.sessionType)}
                              </Badge>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              モジュール: {session.moduleId.split('-')[0]}
                            </Badge>
                          </div>
                        </div>
                      ));
                    })}
                  
                  {progressData
                    .filter(session => !session.answerHistory || session.answerHistory.length === 0)
                    .length === progressData.length && (
                    <div className="text-center py-8 text-gray-500">
                      詳細な回答履歴はまだありません
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 学習傾向タブ */}
        <TabsContent value="activity">
          {activitySummary ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>学習アクティビティ分析</CardTitle>
                  <CardDescription>
                    あなたの学習パターンとおすすめの学習フォーカス
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">学習傾向</h4>
                      <ul className="space-y-2">
                        <li className="flex justify-between items-center text-sm">
                          <span>総学習セッション:</span>
                          <Badge variant="outline">{activitySummary.totalSessions}回</Badge>
                        </li>
                        <li className="flex justify-between items-center text-sm">
                          <span>学習連続日数:</span>
                          <Badge variant="outline">{activitySummary.studyStreak}日</Badge>
                        </li>
                        <li className="flex justify-between items-center text-sm">
                          <span>総学習時間:</span>
                          <Badge variant="outline">{Math.round(activitySummary.totalTimeSpent)}分</Badge>
                        </li>
                        <li className="flex justify-between items-center text-sm">
                          <span>最終学習日:</span>
                          <Badge variant="outline">
                            {new Date(activitySummary.lastActiveDate).toLocaleDateString()}
                          </Badge>
                        </li>
                        <li className="flex justify-between items-center text-sm">
                          <span>成績改善率:</span>
                          <Badge 
                            className={activitySummary.improvementRate >= 0 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}
                          >
                            {activitySummary.improvementRate > 0 ? '+' : ''}
                            {activitySummary.improvementRate.toFixed(1)}%
                          </Badge>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">カテゴリ分析</h4>
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-xs text-muted-foreground mb-1">得意なカテゴリ</h5>
                          <div className="flex flex-wrap gap-2">
                            {activitySummary.strongCategories.length > 0 ? (
                              activitySummary.strongCategories.map((category, index) => (
                                <Badge key={index} className="bg-green-100 text-green-800">
                                  {category}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">まだデータがありません</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-xs text-muted-foreground mb-1">苦手なカテゴリ</h5>
                          <div className="flex flex-wrap gap-2">
                            {activitySummary.weakCategories.length > 0 ? (
                              activitySummary.weakCategories.map((category, index) => (
                                <Badge key={index} className="bg-red-100 text-red-800">
                                  {category}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">まだデータがありません</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>おすすめの学習フォーカス</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activitySummary.recommendedFocus.length > 0 ? (
                      activitySummary.recommendedFocus.map((focus, index) => (
                        <div key={index} className="p-3 border rounded-md bg-muted/20">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                              {index + 1}
                            </div>
                            <div>
                              <h5 className="font-medium">{focus}</h5>
                              <p className="text-sm text-muted-foreground mt-1">
                                {index === 0 
                                  ? 'この分野に最も重点を置いて学習を進めることをお勧めします。' 
                                  : index === 1 
                                    ? '次に優先すべき学習分野です。基礎理解を深めましょう。'
                                    : '時間があればこの分野も復習してみましょう。'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">
                        学習データが不足しています。もっと問題に取り組むと、パーソナライズされたおすすめが表示されます。
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              学習データが不足しています
            </div>
          )}
        </TabsContent>
        
        {/* 達成状況タブ */}
        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>学習達成状況</CardTitle>
              <CardDescription>
                現在の学習進捗と達成状況
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 達成率バー */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">全体の達成率</span>
                    <span className="text-sm font-medium">{progressSummary.completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={progressSummary.completionRate} className="h-2" />
                </div>
                
                {/* 正答率バー */}
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">全体の正答率</span>
                    <span className="text-sm font-medium">{progressSummary.overallAccuracy.toFixed(1)}%</span>
                  </div>
                  <Progress value={progressSummary.overallAccuracy} className="h-2" />
                </div>
                
                {/* 達成バッジ */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <Card className={`border ${progressSummary.completedModules > 0 ? 'border-green-500' : ''}`}>
                    <CardContent className="p-4 text-center">
                      <BookOpen className={`h-8 w-8 mx-auto mb-2 ${progressSummary.completedModules > 0 ? 'text-green-500' : 'text-gray-300'}`} />
                      <h4 className="font-medium">最初のモジュール完了</h4>
                      <p className="text-xs text-gray-500">
                        {progressSummary.completedModules > 0 ? '達成済み' : '未達成'}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className={`border ${progressSummary.overallAccuracy >= 80 ? 'border-green-500' : ''}`}>
                    <CardContent className="p-4 text-center">
                      <Award className={`h-8 w-8 mx-auto mb-2 ${progressSummary.overallAccuracy >= 80 ? 'text-green-500' : 'text-gray-300'}`} />
                      <h4 className="font-medium">正答率80%以上</h4>
                      <p className="text-xs text-gray-500">
                        {progressSummary.overallAccuracy >= 80 ? '達成済み' : '未達成'}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className={`border ${progressData.length >= 5 ? 'border-green-500' : ''}`}>
                    <CardContent className="p-4 text-center">
                      <BarChart3 className={`h-8 w-8 mx-auto mb-2 ${progressData.length >= 5 ? 'text-green-500' : 'text-gray-300'}`} />
                      <h4 className="font-medium">5回以上の学習</h4>
                      <p className="text-xs text-gray-500">
                        {progressData.length >= 5 ? '達成済み' : `${progressData.length}/5回`}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgressDashboard; 