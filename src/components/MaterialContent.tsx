import { useState } from 'react';
import { PlayCircle, BookOpen, Volume2, ExternalLink, CheckCircle, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModuleDetail } from '@/services/openai';

interface MaterialContentProps {
  activeModule?: string;
  onStartPractice?: () => void;
  moduleDetail?: ModuleDetail | null;
  currentModule?: any;
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onSectionChange?: (sectionId: string) => void;
}

const MaterialContent = ({ activeModule, onStartPractice, moduleDetail, currentModule, toggleSidebar, isSidebarOpen, onSectionChange }: MaterialContentProps) => {
  const [activeContentTab, setActiveContentTab] = useState("content");
  
  // モジュール詳細がまだ生成されていない場合は、デフォルトのコンテンツを表示
  if (!moduleDetail) {
    return <DefaultModuleContent activeModule={activeModule} onStartPractice={onStartPractice} />;
  }
  
  // 難易度を表示するためのバッジ
  const DifficultyBadge = () => {
    const difficulty = currentModule?.difficulty || 'beginner';
    let displayText = '初級レベル';
    
    if (difficulty === 'intermediate') {
      displayText = '中級レベル';
    } else if (difficulty === 'advanced') {
      displayText = '上級レベル';
    }
    
    return <Badge variant="outline">{displayText}</Badge>;
  };
  
  // 生成された詳細コンテンツを表示する要素を作成
  const renderGeneratedContent = () => {
    if (!moduleDetail.content || moduleDetail.content.length === 0) {
      return <p>コンテンツがありません。</p>;
    }
    
    return (
      <div className="space-y-8">
        {moduleDetail.content.map((section, index) => (
          <div 
            key={index} 
            className="prose prose-slate max-w-none"
            id={`section-${section.id || index}`}
            onClick={() => {
              if (onSectionChange && section.id) {
                onSectionChange(section.id);
              } else if (onSectionChange) {
                onSectionChange(`section-${index}`);
              }
            }}
          >
            <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: section.content }} />
            
            {section.examples && section.examples.length > 0 && (
              <div className="bg-muted p-4 rounded-lg my-6">
                <h3 className="text-xl font-medium mb-3">例題</h3>
                {section.examples.map((example, i) => (
                  <div key={i} className="mb-4">
                    <h4 className="font-medium">{example.title}</h4>
                    <div dangerouslySetInnerHTML={{ __html: example.content }} />
                  </div>
                ))}
              </div>
            )}
            
            {section.keyPoints && section.keyPoints.length > 0 && (
              <div className="border rounded-lg p-6 mt-8 bg-muted/50">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  このセクションの要点
                </h3>
                <ul className="space-y-2">
                  {section.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start">
                      <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">✓</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {section.questions && section.questions.length > 0 && (
              <div className="border border-primary/20 rounded-lg p-6 mt-8 bg-primary/5">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2 text-primary" />
                  練習問題
                </h3>
                <ul className="space-y-4">
                  {section.questions.map((q, i) => (
                    <li key={i} className="space-y-2">
                      <p className="font-medium">{q.question}</p>
                      {q.hint && (
                        <p className="text-sm text-muted-foreground italic">ヒント: {q.hint}</p>
                      )}
                    </li>
                  ))}
                </ul>
                <Button onClick={onStartPractice} className="mt-4">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  AIチャットで解答する
                </Button>
              </div>
            )}
            
            {section.summary && (
              <div className="bg-primary/10 p-4 rounded-lg mt-6">
                <h4 className="font-medium mb-2">まとめ</h4>
                <div dangerouslySetInnerHTML={{ __html: section.summary }} />
              </div>
            )}
            
            {index < moduleDetail.content.length - 1 && <Separator className="my-8" />}
          </div>
        ))}
      </div>
    );
  };
  
  // モジュールの要約を生成
  const generateSummary = () => {
    if (!moduleDetail.content || moduleDetail.content.length === 0) {
      return <p>要約がありません。</p>;
    }
    
    // 各セクションの要約を集めて表示
    return (
      <div className="space-y-4">
        {moduleDetail.content.map((section, index) => (
          section.summary && (
            <div key={index}>
              <h3 className="text-lg font-medium mb-2">{section.title}</h3>
              <div dangerouslySetInnerHTML={{ __html: section.summary }} />
              {index < moduleDetail.content.length - 1 && <Separator className="my-4" />}
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-4">{moduleDetail.title}</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          <DifficultyBadge />
          <Badge variant="outline">所要時間: {currentModule?.estimated_duration || '30分'}</Badge>
          <Badge variant="secondary">必須モジュール</Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          {moduleDetail.description}
        </p>

        <div className="relative rounded-xl overflow-hidden aspect-video mb-6">
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80" 
            alt={moduleDetail.title}
            className="w-full h-full object-cover"
          />
          <Button size="sm" variant="secondary" className="absolute bottom-4 right-4">
            <PlayCircle className="mr-2 h-4 w-4" />
            動画を再生
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={activeContentTab} onValueChange={setActiveContentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">コンテンツ</TabsTrigger>
          <TabsTrigger value="summary">要約</TabsTrigger>
          <TabsTrigger value="resources">補足資料</TabsTrigger>
          <TabsTrigger value="notes">ノート</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="mt-6">
          {renderGeneratedContent()}
        </TabsContent>
        
        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>モジュールの要約</CardTitle>
              <CardDescription>
                このモジュールの主要なポイントを簡潔にまとめています
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generateSummary()}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                要約をダウンロード
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">推奨図書</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <BookOpen className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>"Data Science for Business" by Foster Provost & Tom Fawcett</span>
                  </li>
                  <li className="flex items-start">
                    <BookOpen className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>"Storytelling with Data" by Cole Nussbaumer Knaflic</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">オンラインリソース</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <ExternalLink className="h-5 w-5 mr-2 flex-shrink-0" />
                    <a href="#" className="text-primary hover:underline">Kaggle - データサイエンス入門</a>
                  </li>
                  <li className="flex items-start">
                    <ExternalLink className="h-5 w-5 mr-2 flex-shrink-0" />
                    <a href="#" className="text-primary hover:underline">DataCamp - データ分析コース</a>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>ノート</CardTitle>
              <CardDescription>
                このモジュールの学習過程で記録したノートを管理できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="min-h-[200px] w-full border rounded-md p-4 resize-y"
                placeholder="ここにノートを入力してください..."
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">クリア</Button>
              <Button>保存</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-8">
        <h3 className="text-xl font-medium mb-3">次のステップ</h3>
        <p className="mb-4">
          このモジュールの学習が完了したら、AIチャットボットとのインタラクティブなセッションで
          理解度を確認しましょう。その後、次のモジュールに進むことができます。
        </p>
        <Button className="w-full sm:w-auto" onClick={onStartPractice}>
          AIチャットセッションを開始
        </Button>
      </div>
    </div>
  );
};

// デフォルトのモジュールコンテンツ（データが生成されるまでの表示用）
const DefaultModuleContent = ({ activeModule, onStartPractice }: MaterialContentProps) => {
  const [activeContentTab, setActiveContentTab] = useState("content");
  
  // 導入モジュールのコンテンツ
  const IntroductionModule = () => (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-4">データ分析の基礎: はじめに</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline">初級レベル</Badge>
          <Badge variant="outline">所要時間: 30分</Badge>
          <Badge variant="secondary">必須モジュール</Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          このモジュールでは、データ分析の基本概念と、なぜそれが今日のビジネスや研究において不可欠なのかを紹介します。
          データサイエンスの全体像を理解し、これから学ぶ内容の基礎固めをしましょう。
        </p>

        <div className="relative rounded-xl overflow-hidden aspect-video mb-6">
          <img 
            src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80" 
            alt="データ分析の概要"
            className="w-full h-full object-cover"
          />
          <Button size="sm" variant="secondary" className="absolute bottom-4 right-4">
            <PlayCircle className="mr-2 h-4 w-4" />
            動画を再生
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={activeContentTab} onValueChange={setActiveContentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">コンテンツ</TabsTrigger>
          <TabsTrigger value="summary">要約</TabsTrigger>
          <TabsTrigger value="resources">補足資料</TabsTrigger>
          <TabsTrigger value="notes">ノート</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="mt-6">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-semibold mb-4">データ分析とは何か</h2>
            <p>
              データ分析とは、生データを検査、クレンジング、変換、モデル化して、有用な情報を発見し、結論を導き、
              意思決定をサポートするプロセスです。ビジネスインテリジェンス、科学研究、社会科学など、
              さまざまな分野で重要な役割を果たしています。
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">データ分析の主要なステップ</h3>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>データ収集</strong>: 必要なデータを様々なソースから収集します。
                これには、構造化データ（データベースなど）と非構造化データ（テキスト、画像など）が含まれます。
              </li>
              <li>
                <strong>データクレンジング</strong>: 不完全、不正確、または重複したデータを特定し、修正または削除します。
                これはデータの品質を確保するために不可欠なステップです。
              </li>
              <li>
                <strong>データ変換</strong>: 分析に適した形式にデータを変換します。
                これには、正規化、集約、特徴抽出などが含まれます。
              </li>
              <li>
                <strong>データ分析</strong>: 統計的手法や機械学習アルゴリズムを使用してデータからパターンや洞察を抽出します。
              </li>
              <li>
                <strong>データ可視化と解釈</strong>: グラフやチャートを使用してデータを視覚的に表現し、
                発見された洞察を解釈して行動可能な知見に変換します。
              </li>
            </ol>

            <div className="bg-muted p-4 rounded-lg mt-6">
              <h4 className="font-medium flex items-center">
                <Volume2 className="h-4 w-4 mr-2" />
                音声で聞く
              </h4>
              <p className="text-sm text-muted-foreground mt-2">
                このセクションの内容を音声で聞くことができます。通勤中や移動中の学習に最適です。
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                音声再生を開始
              </Button>
            </div>
            
            <h3 className="text-xl font-medium mt-6 mb-3">データ分析の重要性</h3>
            <p>
              データ分析は以下の理由から重要です：
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>情報に基づいた意思決定を可能にする</li>
              <li>ビジネスプロセスの効率化</li>
              <li>市場トレンドの予測</li>
              <li>顧客行動の理解</li>
              <li>リスク評価と管理</li>
            </ul>
          </div>
          
          <div className="border rounded-lg p-6 mt-8 bg-muted/50">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              このセクションの要点
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">✓</span>
                <span>データ分析は生データから有用な情報を抽出するプロセスである</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">✓</span>
                <span>主要なステップには、収集、クレンジング、変換、分析、可視化がある</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">✓</span>
                <span>データ分析はビジネス意思決定やプロセス最適化に不可欠である</span>
              </li>
            </ul>
          </div>
        </TabsContent>
        
        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>モジュールの要約</CardTitle>
              <CardDescription>
                このモジュールの主要なポイントを簡潔にまとめています
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  データ分析は、生データから意味のある洞察を抽出し、情報に基づいた意思決定を
                  サポートするプロセスです。このプロセスには、データ収集、クレンジング、変換、
                  分析、可視化の5つの主要なステップがあります。
                </p>
                <p>
                  現代のビジネス環境では、データ分析は競争優位性を獲得するための必須ツールとなっています。
                  顧客行動の理解、市場トレンドの予測、リスク管理など、さまざまな目的に活用されています。
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                要約をダウンロード
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">推奨図書</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <BookOpen className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>"Data Science for Business" by Foster Provost & Tom Fawcett</span>
                  </li>
                  <li className="flex items-start">
                    <BookOpen className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>"Storytelling with Data" by Cole Nussbaumer Knaflic</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">オンラインリソース</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <ExternalLink className="h-5 w-5 mr-2 flex-shrink-0" />
                    <a href="#" className="text-primary hover:underline">Kaggle - データサイエンス入門</a>
                  </li>
                  <li className="flex items-start">
                    <ExternalLink className="h-5 w-5 mr-2 flex-shrink-0" />
                    <a href="#" className="text-primary hover:underline">DataCamp - データ分析コース</a>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>学習ノート</CardTitle>
              <CardDescription>
                このモジュールで学んだことをメモして復習に役立てましょう
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea 
                className="w-full h-32 p-2 border rounded-md" 
                placeholder="ここにノートを入力してください..."
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">
                クリア
              </Button>
              <Button>
                保存
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-8">
        <h3 className="text-xl font-medium mb-3">次のステップ</h3>
        <p className="mb-4">
          基本概念を理解したところで、次は具体的な理論と手法について学びましょう。
          「理論」モジュールに進むと、データ分析に使用される主要な統計的手法や
          アルゴリズムについて詳しく学ぶことができます。
        </p>
        <Button className="w-full sm:w-auto">
          理論モジュールへ進む
        </Button>
      </div>
    </div>
  );
  
  // 理論モジュールのコンテンツ（他のモジュールも同様のパターンで実装）
  const TheoryModule = () => (
    <div className="space-y-8 animate-fade-in max-w-full mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-4">データ分析の理論と手法</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline">中級レベル</Badge>
          <Badge variant="outline">所要時間: 1時間</Badge>
          <Badge variant="secondary">必須モジュール</Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          このモジュールでは、データ分析における主要な理論的概念と基本的な統計手法を学びます。
          データから意味のある洞察を得るための数学的基礎と、一般的に使われるアルゴリズムについて理解しましょう。
        </p>
        
        <div className="relative rounded-xl overflow-hidden aspect-video mb-6">
          <img 
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80" 
            alt="データ分析の理論"
            className="w-full h-full object-cover"
          />
          <Button size="sm" variant="secondary" className="absolute bottom-4 right-4">
            <PlayCircle className="mr-2 h-4 w-4" />
            動画を再生
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">コンテンツ</TabsTrigger>
          <TabsTrigger value="summary">要約</TabsTrigger>
          <TabsTrigger value="resources">補足資料</TabsTrigger>
          <TabsTrigger value="notes">ノート</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="mt-6">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-semibold mb-4">統計的思考の基礎</h2>
            <p>
              データ分析の中心にあるのは統計的思考です。統計的思考とは、データの背後にあるパターンや関係性を
              理解するための体系的なアプローチのことです。ここでは、データ分析に欠かせない基本的な統計概念を解説します。
            </p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">記述統計と推測統計</h3>
            <p>
              統計学は大きく「記述統計」と「推測統計」に分けられます：
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>記述統計</strong>: データセットの主要な特性を要約し、視覚化するための手法。
                平均値、中央値、標準偏差などの基本統計量が含まれます。
              </li>
              <li>
                <strong>推測統計</strong>: サンプルデータから母集団全体の特性を推定するための手法。
                仮説検定、信頼区間、回帰分析などが含まれます。
              </li>
            </ul>
            
            <div className="bg-muted p-4 rounded-lg mt-6">
              <h4 className="font-medium">例: Eコマースサイトのデータ分析</h4>
              <p>あるEコマースサイトでは、ユーザーの購買行動データを分析しています：</p>
              <ul className="list-disc pl-6 mt-2">
                <li><strong>記述統計</strong>: 1日あたりの平均訪問者数は5,000人、平均購入金額は￥4,500</li>
                <li><strong>推測統計</strong>: 新しいレコメンデーションシステムを導入した場合、購入率が15〜20%向上すると推定</li>
              </ul>
            </div>
          </div>
          
          <div className="border rounded-lg p-6 mt-8 bg-muted/50">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              このセクションの要点
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">✓</span>
                <span>統計的思考はデータ分析の基礎となる体系的アプローチ</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">✓</span>
                <span>記述統計はデータの特性を要約し、推測統計はサンプルから母集団を推定する</span>
              </li>
              <li className="flex items-start">
                <span className="bg-primary/10 text-primary rounded-full p-1 mr-2">✓</span>
                <span>基本的な統計概念を理解することで、データからより深い洞察を得ることができる</span>
              </li>
            </ul>
          </div>
        </TabsContent>
        
        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>モジュールの要約</CardTitle>
              <CardDescription>
                このモジュールの主要なポイントを簡潔にまとめています
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  データ分析の理論的基礎は統計学に根ざしており、記述統計と推測統計の2つの主要なアプローチがあります。
                  記述統計はデータの特性を要約する手法で、推測統計はサンプルから母集団を推定する手法です。
                </p>
                <p>
                  データ分析プロセスでは、まずデータの基本的な特性を理解し、次に仮説を立てて検証し、
                  最終的にデータに基づいた意思決定を行います。統計的思考を身につけることで、
                  データからより価値のある洞察を得ることができます。
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                要約をダウンロード
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">推奨図書</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <BookOpen className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>"Think Stats" by Allen B. Downey</span>
                  </li>
                  <li className="flex items-start">
                    <BookOpen className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>"Practical Statistics for Data Scientists" by Peter Bruce & Andrew Bruce</span>
                  </li>
                </ul>
            </CardContent>
          </Card>
          
            <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">オンラインリソース</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <ExternalLink className="h-5 w-5 mr-2 flex-shrink-0" />
                    <a href="#" className="text-primary hover:underline">Khan Academy - 統計学コース</a>
                  </li>
                  <li className="flex items-start">
                    <ExternalLink className="h-5 w-5 mr-2 flex-shrink-0" />
                    <a href="#" className="text-primary hover:underline">Coursera - データサイエンスの数学と統計</a>
                  </li>
                </ul>
            </CardContent>
          </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>学習ノート</CardTitle>
              <CardDescription>
                このモジュールで学んだことをメモして復習に役立てましょう
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea 
                className="w-full h-32 p-2 border rounded-md" 
                placeholder="ここにノートを入力してください..."
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">
                クリア
              </Button>
              <Button>
                保存
              </Button>
            </CardFooter>
        </Card>
        </TabsContent>
      </Tabs>
      
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 mt-8">
        <h3 className="text-xl font-medium mb-3">次のステップ</h3>
        <p className="mb-4">
          理論的な基礎を理解したところで、次は実際の例を使って学んだ概念を深めていきましょう。
          「実例」モジュールでは、実際のデータセットを使った分析例を通じて、
          統計手法の実践的な適用方法を学びます。
        </p>
        <Button className="w-full sm:w-auto">
          実例モジュールへ進む
        </Button>
      </div>
    </div>
  );
  
  // アクティブなモジュールに応じてコンテンツを切り替え
    switch (activeModule) {
      case 'introduction':
        return <IntroductionModule />;
      case 'theory':
        return <TheoryModule />;
      case 'examples':
      case 'practice':
      default:
        return <IntroductionModule />;
    }
};

export default MaterialContent;

