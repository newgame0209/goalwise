
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const SamplePage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('introduction');
  const [progress, setProgress] = useState(30);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // 進捗をランダムに更新（サンプル用）
    const newProgress = Math.min(progress + Math.floor(Math.random() * 20), 100);
    setProgress(newProgress);
    
    toast({
      title: "タブが変更されました",
      description: `${value}タブに移動しました。進捗: ${newProgress}%`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <h1 className="text-3xl font-bold mb-6">データ分析の基礎 - サンプル</h1>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">学習進捗</span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="grid md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>モジュール</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs 
                  value={activeTab} 
                  onValueChange={handleTabChange}
                  className="w-full"
                >
                  <TabsList className="flex flex-col items-stretch h-auto space-y-1">
                    <TabsTrigger value="introduction" className="justify-start">
                      <div className="flex flex-col items-start text-left">
                        <span>はじめに</span>
                        <Progress value={100} className="h-1 w-full mt-1" />
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="theory" className="justify-start">
                      <div className="flex flex-col items-start text-left">
                        <span>理論</span>
                        <Progress value={60} className="h-1 w-full mt-1" />
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="examples" className="justify-start">
                      <div className="flex flex-col items-start text-left">
                        <span>実例</span>
                        <Progress value={30} className="h-1 w-full mt-1" />
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="practice" className="justify-start">
                      <div className="flex flex-col items-start text-left">
                        <span>練習</span>
                        <Progress value={0} className="h-1 w-full mt-1" />
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>
                  {activeTab === 'introduction' && 'はじめに'}
                  {activeTab === 'theory' && 'データ分析の理論'}
                  {activeTab === 'examples' && '実例で学ぶ'}
                  {activeTab === 'practice' && '練習問題'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'introduction' && 'データ分析の基礎を学びましょう'}
                  {activeTab === 'theory' && '統計学の基本概念について'}
                  {activeTab === 'examples' && '実際のデータセットを使った分析例'}
                  {activeTab === 'practice' && 'インタラクティブな練習問題'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabsContent value="introduction" className="mt-0">
                  <div className="prose max-w-none">
                    <p>データ分析は現代のビジネスや研究において不可欠なスキルです。本コースでは、データ分析の基礎から応用までを段階的に学びます。</p>
                    <p>このサンプルモジュールでは、以下の内容を扱います：</p>
                    <ul>
                      <li>データ収集の方法と重要性</li>
                      <li>データクレンジングと前処理</li>
                      <li>基本的な統計分析</li>
                      <li>データの可視化</li>
                    </ul>
                    <p>各モジュールを順番に進めてください。随時小テストや演習問題があります。</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="theory" className="mt-0">
                  <div className="prose max-w-none">
                    <p>データ分析における理論的基礎は統計学に基づいています。以下の概念を理解することが重要です：</p>
                    <h3>記述統計学</h3>
                    <p>データの特性を要約する方法です。主な指標には以下があります：</p>
                    <ul>
                      <li>中心傾向の測定（平均値、中央値、最頻値）</li>
                      <li>分散と標準偏差</li>
                      <li>範囲とパーセンタイル</li>
                    </ul>
                    <h3>推測統計学</h3>
                    <p>サンプルデータから母集団についての推論を行う方法です。主なトピックには：</p>
                    <ul>
                      <li>確率分布（正規分布、二項分布など）</li>
                      <li>信頼区間</li>
                      <li>仮説検定</li>
                    </ul>
                  </div>
                </TabsContent>
                
                <TabsContent value="examples" className="mt-0">
                  <div className="prose max-w-none">
                    <p>実際のデータセットを使った分析例を見ていきましょう。</p>
                    
                    <h3>例1: 売上データの分析</h3>
                    <p>ある小売企業の月次売上データを分析します。</p>
                    <ul>
                      <li>月間売上のトレンド分析</li>
                      <li>季節性の特定</li>
                      <li>予測モデルの構築</li>
                    </ul>
                    
                    <h3>例2: 顧客セグメンテーション</h3>
                    <p>顧客データを使って異なる顧客グループを特定します。</p>
                    <ul>
                      <li>RFM分析（Recency, Frequency, Monetary）</li>
                      <li>クラスタリング技術の適用</li>
                      <li>セグメント別のマーケティング戦略</li>
                    </ul>
                  </div>
                </TabsContent>
                
                <TabsContent value="practice" className="mt-0">
                  <div className="prose max-w-none">
                    <p>このセクションでは、学んだ内容を実践するための演習問題があります。</p>
                    <p>練習問題を解く前に、前のモジュールの内容をよく理解しておいてください。</p>
                    
                    <div className="bg-muted p-4 rounded-lg mt-4">
                      <h3 className="mt-0">練習問題1: 基本統計量の計算</h3>
                      <p>以下のデータセットについて、平均値、中央値、標準偏差を計算してください：</p>
                      <p className="font-mono">データ: 23, 45, 32, 18, 56, 72, 39, 41</p>
                    </div>
                    
                    <div className="mt-6">
                      <Button onClick={() => {
                        toast({
                          title: "インタラクティブセッションを開始します",
                          description: "AIチャットと接続中...",
                        });
                      }}>
                        インタラクティブ演習を開始
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button variant="outline">前へ</Button>
                <Button>次へ</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SamplePage;
