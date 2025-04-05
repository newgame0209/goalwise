import { useState, useEffect, useRef } from 'react';
import { useParams, NavLink, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Clock, BarChart, ChevronLeft, ChevronRight, 
  BookOpen, User, Calendar, Award, CheckCircle2,
  BookmarkIcon, ListChecks, Bookmark, FileText, CheckCircle, Info,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContentGenerator from '@/components/ContentGenerator';
import { GeneratedMaterial } from '@/services/openai';

const MaterialDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('');
  const [showGenerator, setShowGenerator] = useState(false);
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  
  useEffect(() => {
    // In a real app, fetch the material by ID from an API
    const fetchMaterial = () => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const foundMaterial = materialsData.find(m => m.id === id);
        setMaterial(foundMaterial || null);
        setLoading(false);
      }, 600);
    };
    
    fetchMaterial();
  }, [id]);

  useEffect(() => {
    // Setup intersection observer for section highlighting
    if (!material) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.2 }
    );

    // Register all section elements
    Object.keys(sectionRefs.current).forEach((id) => {
      if (sectionRefs.current[id]) {
        observer.observe(sectionRefs.current[id]!);
      }
    });

    return () => {
      Object.keys(sectionRefs.current).forEach((id) => {
        if (sectionRefs.current[id]) {
          observer.unobserve(sectionRefs.current[id]!);
        }
      });
    };
  }, [material, sectionRefs]);
  
  // Handle previous/next navigation
  const currentIndex = materialsData.findIndex(m => m.id === id);
  const prevMaterial = currentIndex > 0 ? materialsData[currentIndex - 1] : null;
  const nextMaterial = currentIndex < materialsData.length - 1 ? materialsData[currentIndex + 1] : null;
  
  // Scroll to section function
  const scrollToSection = (sectionId: string) => {
    if (sectionRefs.current[sectionId]) {
      sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  // Handle content generation callback
  const handleContentGenerated = (generatedMaterial: GeneratedMaterial) => {
    // 既存のmaterialのIDとその他の属性を保持しながら、生成されたコンテンツで更新
    const updatedMaterial = {
      ...material,
      ...generatedMaterial,
      id: material.id, // 元のIDを保持
      image: material.image, // 元の画像を保持
      progress: material.progress // 進捗状況を保持
    };
    
    setMaterial(updatedMaterial);
    setShowGenerator(false);
    
    // 生成されたコンテンツをローカルに一時保存（実際のアプリではAPIを使用）
    const updatedMaterialsData = materialsData.map(m => 
      m.id === id ? updatedMaterial : m
    );
    
    // ローカルストレージに保存（デモ用）
    try {
      localStorage.setItem('materialsData', JSON.stringify(updatedMaterialsData));
    } catch (e) {
      console.warn('ローカルストレージに保存できませんでした', e);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 w-28 bg-secondary rounded mb-4"></div>
            <div className="h-12 w-64 bg-secondary rounded"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!material) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-4">教材が見つかりませんでした</h2>
          <Button asChild>
            <NavLink to="/materials">教材一覧に戻る</NavLink>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }
  
  const { 
    title, description, image, content, categories, duration, 
    progress, difficulty, author, publishedDate, units 
  } = material;
  
  const difficultyColor = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-blue-100 text-blue-800',
    advanced: 'bg-purple-100 text-purple-800'
  };
  
  const difficultyText = {
    beginner: '初級',
    intermediate: '中級',
    advanced: '上級'
  };
  
  const handleUpdateProgress = (newProgress: number) => {
    // In a real app, this would update the progress via API
    console.log(`Updating progress to ${newProgress}%`);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Back navigation */}
          <div className="mb-6 animate-fade-in">
            <Button variant="ghost" size="sm" asChild className="group">
              <NavLink to="/materials" className="flex items-center text-muted-foreground">
                <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                教材一覧に戻る
              </NavLink>
            </Button>
          </div>
          
          {/* Material header */}
          <div className="mb-10 animate-slide-down">
            <div className="flex flex-wrap gap-2 mb-3">
              {categories.map((category: string, index: number) => (
                <Badge key={index} variant="secondary">
                  {category}
                </Badge>
              ))}
              <Badge 
                className={`${difficultyColor[difficulty as keyof typeof difficultyColor]}`}
              >
                {difficultyText[difficulty as keyof typeof difficultyText]}
              </Badge>
            </div>
            
            <div className="flex justify-between items-start">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h1>
              
              {/* AIコンテンツ生成ボタン（管理者用） */}
              <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">AIコンテンツ生成</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <ContentGenerator onContentGenerated={handleContentGenerated} />
                </DialogContent>
              </Dialog>
            </div>
            
            <p className="text-xl text-muted-foreground mb-6">{description}</p>
            
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                <span>{duration}</span>
              </div>
              <div className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>{author}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{publishedDate}</span>
              </div>
              <div className="flex items-center">
                <Award className="mr-2 h-4 w-4" />
                <span>50スキルポイント</span>
              </div>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 animate-fade-in">
              {/* Material image */}
              <div className="mb-8 rounded-xl overflow-hidden">
                <img 
                  src={image} 
                  alt={title} 
                  className="w-full h-auto object-cover"
                />
              </div>
              
              {/* Material content tabs */}
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="content">内容</TabsTrigger>
                  <TabsTrigger value="overview">概要</TabsTrigger>
                  <TabsTrigger value="resources">リソース</TabsTrigger>
                </TabsList>
                
                <TabsContent value="content" className="mt-0 space-y-8">
                  {/* Table of Contents - visible on mobile, sticky at top */}
                  <div className="lg:hidden mb-6">
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center w-full justify-between p-3 rounded-lg bg-muted text-muted-foreground font-medium">
                        <div className="flex items-center">
                          <ListChecks className="h-4 w-4 mr-2" />
                          目次
                        </div>
                        <ChevronRight className="h-4 w-4 transition-transform ui-open:rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 pb-4 px-3">
                        <nav className="space-y-1">
                          {content.map((section: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => scrollToSection(`section-${idx}`)}
                              className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
                                activeSection === `section-${idx}` 
                                  ? 'bg-primary/10 text-primary font-medium' 
                                  : 'hover:bg-muted'
                              }`}
                            >
                              {section.title}
                            </button>
                          ))}
                        </nav>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {content.map((section: any, idx: number) => (
                    <div 
                      key={idx} 
                      id={`section-${idx}`}
                      ref={(el) => (sectionRefs.current[`section-${idx}`] = el)}
                      className="animate-slide-up scroll-mt-24" 
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                          <span className="text-sm font-bold">{idx + 1}</span>
                        </div>
                        <h2 className="text-2xl font-semibold">{section.title}</h2>
                      </div>
                      
                      {/* Main Content */}
                      <div className="prose max-w-none mb-6" dangerouslySetInnerHTML={{ __html: section.content }} />
                      
                      {/* Examples Section */}
                      {section.examples && section.examples.length > 0 && (
                        <div className="mt-6 mb-6">
                          <div className="flex items-center mb-3">
                            <FileText className="h-5 w-5 text-primary mr-2" />
                            <h3 className="text-lg font-medium">例題</h3>
                          </div>
                          <div className="space-y-4">
                            {section.examples.map((example: any, exIdx: number) => (
                              <div key={exIdx} className="bg-muted/50 rounded-lg p-4 border border-border">
                                <div className="font-medium mb-2">例 {exIdx + 1}: {example.title}</div>
                                <div className="text-sm" dangerouslySetInnerHTML={{ __html: example.content }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Summary Section */}
                      {section.summary && (
                        <div className="mt-8 bg-primary/5 border border-primary/10 rounded-lg p-4">
                          <div className="flex items-center mb-2">
                            <CheckCircle className="h-5 w-5 text-primary mr-2" />
                            <h3 className="font-medium text-primary">まとめ</h3>
                          </div>
                          <div className="text-sm" dangerouslySetInnerHTML={{ __html: section.summary }} />
                        </div>
                      )}
                      
                      {/* Key Points */}
                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-medium mb-3">重要ポイント</h3>
                          <ul className="space-y-2">
                            {section.keyPoints.map((point: string, kpIdx: number) => (
                              <li key={kpIdx} className="flex items-start">
                                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Practice Questions if available */}
                      {section.questions && section.questions.length > 0 && (
                        <div className="mt-8">
                          <Accordion type="single" collapsible className="border rounded-lg">
                            <AccordionItem value="questions" className="border-none">
                              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                                <div className="flex items-center text-primary">
                                  <Info className="h-5 w-5 mr-2" />
                                  <span className="font-medium">練習問題</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-4">
                                  {section.questions.map((q: any, qIdx: number) => (
                                    <div key={qIdx} className="bg-muted/50 p-3 rounded border border-border">
                                      <p className="font-medium mb-2">質問 {qIdx + 1}: {q.question}</p>
                                      <p className="text-sm text-muted-foreground">{q.hint && `ヒント: ${q.hint}`}</p>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      )}
                      
                      {/* Section separator */}
                      {idx < content.length - 1 && <Separator className="mt-10" />}
                    </div>
                  ))}
                </TabsContent>
                
                <TabsContent value="overview" className="mt-0">
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-3">このコースについて</h2>
                      <p className="text-muted-foreground">
                        このコースでは、{description.toLowerCase()} 詳細なハンズオン演習と実践的なプロジェクトを通じて、実務で役立つスキルを身につけることができます。
                      </p>
                    </div>
                    
                    <div>
                      <h2 className="text-xl font-semibold mb-3">学習目標</h2>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>基本的な概念と理論を理解する</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>実践的なスキルを身につける</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>実際のプロジェクトに応用する方法を学ぶ</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>業界のベストプラクティスを理解する</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h2 className="text-xl font-semibold mb-3">前提条件</h2>
                      <p className="text-muted-foreground">
                        このコースは初級者向けに設計されていますが、基本的なコンピュータスキルがあることが望ましいです。特定の技術的な知識は必要ありません。
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="resources" className="mt-0">
                  <div className="animate-fade-in space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-3">ダウンロード可能なリソース</h2>
                      <ul className="space-y-3">
                        <li className="flex items-center">
                          <div className="bg-primary/10 text-primary p-2 rounded mr-3">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <span>コース資料.pdf</span>
                          <Button variant="ghost" size="sm" className="ml-auto">
                            ダウンロード
                          </Button>
                        </li>
                        <li className="flex items-center">
                          <div className="bg-primary/10 text-primary p-2 rounded mr-3">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <span>演習問題集.pdf</span>
                          <Button variant="ghost" size="sm" className="ml-auto">
                            ダウンロード
                          </Button>
                        </li>
                        <li className="flex items-center">
                          <div className="bg-primary/10 text-primary p-2 rounded mr-3">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <span>サンプルコード.zip</span>
                          <Button variant="ghost" size="sm" className="ml-auto">
                            ダウンロード
                          </Button>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h2 className="text-xl font-semibold mb-3">外部リンク</h2>
                      <ul className="space-y-2">
                        <li>
                          <a 
                            href="#" 
                            className="text-primary hover:underline flex items-center"
                          >
                            公式ドキュメント
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </a>
                        </li>
                        <li>
                          <a 
                            href="#" 
                            className="text-primary hover:underline flex items-center"
                          >
                            コミュニティフォーラム
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </a>
                        </li>
                        <li>
                          <a 
                            href="#" 
                            className="text-primary hover:underline flex items-center"
                          >
                            関連チュートリアル
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Sidebar */}
            <div className="animate-fade-in">
              {/* Progress card */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">進捗状況</div>
                    <div className="text-primary font-medium">{progress}%</div>
                  </div>
                  <Progress value={progress} className="h-2 mb-6" />
                  <Button 
                    className="w-full button-hover"
                    onClick={() => handleUpdateProgress(Math.min(progress + 10, 100))}
                  >
                    {progress < 100 ? '続きから学習する' : '復習する'}
                  </Button>
                </CardContent>
              </Card>
              
              {/* Table of Contents - visible only on desktop */}
              <Card className="mb-6 hidden lg:block sticky top-24">
                <CardContent className="pt-6">
                  <h3 className="font-medium text-lg mb-4 flex items-center">
                    <ListChecks className="h-4 w-4 mr-2" />
                    目次
                  </h3>
                  <nav className="space-y-2">
                    {content.map((section: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => scrollToSection(`section-${idx}`)}
                        className={`w-full text-left p-2 text-sm rounded transition-colors flex items-center ${
                          activeSection === `section-${idx}` 
                            ? 'bg-primary/10 text-primary font-medium' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center mr-2">
                          <span className="text-xs">{idx + 1}</span>
                        </div>
                        <span className="truncate">{section.title}</span>
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
              
              {/* Units card */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium text-lg mb-4 flex items-center">
                    <BookmarkIcon className="h-4 w-4 mr-2" />
                    単元一覧
                  </h3>
                  <div className="space-y-4">
                    {units.map((unit: any, idx: number) => (
                      <div key={idx}>
                        <div className="flex items-start">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center mr-3 mt-0.5 ${
                            unit.completed ? 'bg-primary text-white border-primary' : 'border-muted-foreground'
                          }`}>
                            {unit.completed ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">{idx + 1}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{unit.title}</div>
                            <div className="text-sm text-muted-foreground">{unit.duration}</div>
                          </div>
                        </div>
                        {idx < units.length - 1 && (
                          <div className="ml-3 pl-3 mt-2 mb-2 border-l-2 border-muted h-4"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Navigation between materials */}
              <div className="mt-6 flex items-center justify-between">
                {prevMaterial ? (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/materials/${prevMaterial.id}`)} className="flex items-center">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    前の教材
                  </Button>
                ) : (
                  <div></div>
                )}
                
                {nextMaterial && (
                  <Button variant="outline" size="sm" onClick={() => navigate(`/materials/${nextMaterial.id}`)} className="flex items-center ml-auto">
                    次の教材
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// 最初に実行されるとき、ローカルストレージからデータを取得（デモ用）
let materialsData = [];
try {
  const savedData = localStorage.getItem('materialsData');
  materialsData = savedData ? JSON.parse(savedData) : [
    {
      id: "1",
      title: "プログラミングの基礎 - JavaScript入門",
      description: "プログラミング初心者のためのJavaScript基礎コース。変数、関数、制御構造などの基本概念を学びます。",
      image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80",
      categories: ["プログラミング", "JavaScript"],
      duration: "5時間",
      progress: 75,
      difficulty: "beginner",
      author: "山田 太郎",
      publishedDate: "2023年4月15日",
      content: [
        {
          title: "JavaScriptとは",
          content: `
            <p>JavaScriptは、Webページに動的な機能を追加するためのプログラミング言語です。HTMLとCSSと組み合わせて使用され、現代のWeb開発における重要なコンポーネントとなっています。</p>
            <p>1995年にNetscape Communicatorブラウザ用に開発されたJavaScriptは、現在ではあらゆるWebブラウザ、サーバー、モバイルアプリ、IoTデバイスなど幅広いプラットフォームで実行されています。</p>
            <p>JavaScriptの主な特徴：</p>
            <ul>
              <li><strong>クライアントサイド言語</strong>：ブラウザ上で動作します</li>
              <li><strong>インタープリタ言語</strong>：実行時に解釈されます</li>
              <li><strong>動的型付け</strong>：変数の型は実行時に決定されます</li>
              <li><strong>オブジェクト指向</strong>：プロトタイプベースのオブジェクト指向をサポートします</li>
            </ul>
          `,
          examples: [
            {
              title: "シンプルなJavaScriptの例",
              content: `
                <pre><code>// ブラウザの開発者コンソールに「Hello, World!」と表示する
console.log("Hello, World!");</code></pre>
              `
            }
          ],
          summary: `
            <p>JavaScriptは、Webページに対話性を持たせるための言語として始まり、現在では世界で最も広く使われているプログラミング言語の一つに成長しました。ブラウザでの動作を基本としながらも、Node.jsなどの環境により、サーバーサイド開発にも利用できるようになっています。</p>
          `,
          keyPoints: [
            "JavaScriptはWebブラウザで実行される言語です",
            "HTMLとCSSと組み合わせて使用されます",
            "現代のWeb開発に不可欠な要素です",
            "Node.jsを使用してサーバーサイドでも実行できます"
          ],
          questions: [
            {
              question: "JavaScriptの主な用途は何ですか？",
              hint: "Webページに関連した機能について考えてみましょう"
            },
            {
              question: "JavaScriptとJavaの関係性について説明してください",
              hint: "名前は似ていますが、両者は別の言語です"
            }
          ]
        },
        {
          title: "変数とデータ型",
          content: `
            <p>JavaScriptでは、<code>var</code>、<code>let</code>、<code>const</code>を使用して変数や定数を宣言します。</p>
            <h3>変数宣言</h3>
            <p>JavaScriptには変数を宣言する3つの方法があります：</p>
            <ul>
              <li><code>var</code>：古い宣言方法で、関数スコープを持ちます</li>
              <li><code>let</code>：ES6で導入された、ブロックスコープを持つ変数宣言</li>
              <li><code>const</code>：再代入できない定数を宣言します</li>
            </ul>
            <h3>データ型</h3>
            <p>JavaScriptには以下の基本的なデータ型があります：</p>
            <ul>
              <li><strong>文字列（String）</strong>：テキストデータ</li>
              <li><strong>数値（Number）</strong>：整数や小数点数値</li>
              <li><strong>真偽値（Boolean）</strong>：trueまたはfalse</li>
              <li><strong>未定義（Undefined）</strong>：値が割り当てられていない変数</li>
              <li><strong>Null</strong>：意図的に「値がない」ことを表す</li>
              <li><strong>オブジェクト（Object）</strong>：複数の値を持つデータ構造</li>
              <li><strong>シンボル（Symbol）</strong>：ES6で導入された一意の値</li>
            </ul>
          `,
          examples: [
            {
              title: "変数宣言の例",
              content: `
                <pre><code>// let を使った変数宣言
let message = "こんにちは";
message = "Hello"; // 再代入可能

// const を使った定数宣言
const PI = 3.14159;
// PI = 3; // エラー！constは再代入できません</code></pre>
              `
            },
            {
              title: "データ型の例",
              content: `
                <pre><code>// 文字列
let name = "鈴木";

// 数値
let age = 25;
let price = 19.99;

// 真偽値
let isActive = true;

// 配列（オブジェクトの一種）
let colors = ["赤", "青", "緑"];

// オブジェクト
let person = {
  name: "鈴木",
  age: 25,
  isStudent: false
};</code></pre>
              `
            }
          ],
          summary: `
            <p>JavaScriptでは、<code>let</code>と<code>const</code>を使って変数を宣言することをお勧めします（<code>var</code>は古い方法です）。JavaScriptは動的型付け言語なので、変数の型は自動的に判断されます。様々なデータ型を理解することで、より効果的なコードを書くことができます。</p>
          `,
          keyPoints: [
            "変数宣言には基本的に let と const を使用します",
            "const で宣言した変数は再代入できません",
            "JavaScriptは動的型付け言語です",
            "typeof 演算子でデータ型を調べることができます"
          ],
          questions: [
            {
              question: "let と const の主な違いは何ですか？",
              hint: "値の再代入に関する違いを考えてみましょう"
            },
            {
              question: "JavaScript のプリミティブ型とは何ですか？例を挙げてください",
              hint: "オブジェクト以外の基本的なデータ型を考えてみましょう"
            }
          ]
        },
        {
          title: "関数と制御構造",
          content: `
            <h3>関数の定義と呼び出し</h3>
            <p>関数は、再利用可能なコードブロックです。JavaScriptでは、関数を以下の方法で定義できます：</p>
            <ol>
              <li><strong>関数宣言</strong>：<code>function</code>キーワードを使用</li>
              <li><strong>関数式</strong>：変数に関数を代入</li>
              <li><strong>アロー関数</strong>：ES6で導入された簡潔な構文</li>
            </ol>
            <h3>条件文</h3>
            <p>条件に基づいて異なるコードを実行するには、条件文を使用します：</p>
            <ul>
              <li><code>if...else</code>文</li>
              <li><code>switch</code>文</li>
              <li>三項演算子</li>
            </ul>
            <h3>ループ</h3>
            <p>繰り返し処理を行うには、ループ構造を使用します：</p>
            <ul>
              <li><code>for</code>ループ</li>
              <li><code>while</code>ループ</li>
              <li><code>do...while</code>ループ</li>
              <li><code>for...of</code>ループ（イテラブルオブジェクト用）</li>
              <li><code>for...in</code>ループ（オブジェクトのプロパティ用）</li>
            </ul>
          `,
          examples: [
            {
              title: "関数の例",
              content: `
                <pre><code>// 関数宣言
function greet(name) {
  return "こんにちは、" + name + "さん！";
}

// 関数呼び出し
let greeting = greet("太郎");
console.log(greeting); // "こんにちは、太郎さん！"

// アロー関数
const add = (a, b) => a + b;
console.log(add(5, 3)); // 8</code></pre>
              `
            },
            {
              title: "条件文の例",
              content: `
                <pre><code>let hour = 10;

// if-else文
if (hour < 12) {
  console.log("おはようございます");
} else if (hour < 18) {
  console.log("こんにちは");
} else {
  console.log("こんばんは");
}

// switch文
let day = "月曜日";
switch (day) {
  case "月曜日":
    console.log("週の始まりです");
    break;
  case "金曜日":
    console.log("週末です");
    break;
  default:
    console.log("平日です");
}</code></pre>
              `
            },
            {
              title: "ループの例",
              content: `
                <pre><code>// forループ
for (let i = 0; i < 5; i++) {
  console.log(i); // 0, 1, 2, 3, 4
}

// 配列のループ処理
const fruits = ["りんご", "バナナ", "オレンジ"];

// for...ofループ
for (const fruit of fruits) {
  console.log(fruit);
}

// forEach メソッド
fruits.forEach((fruit, index) => {
  console.log(\`\${index}: \${fruit}\`);
});</code></pre>
              `
            }
          ],
          summary: `
            <p>関数は、コードの再利用性と整理に役立ちます。条件文とループを使用することで、プログラムのフローを制御し、データを効率的に処理することができます。アロー関数や<code>for...of</code>ループなどのモダンなJavaScript機能を活用すると、より簡潔で読みやすいコードを書くことができます。</p>
          `,
          keyPoints: [
            "関数は再利用可能なコードブロックです",
            "アロー関数はより簡潔な構文を提供します",
            "条件文は異なる条件に基づいてコードを実行します",
            "ループは繰り返し処理を行うための構造です"
          ],
          questions: [
            {
              question: "アロー関数と通常の関数宣言の違いを説明してください",
              hint: "構文の違いだけでなく、thisの動作についても考えてみましょう"
            },
            {
              question: "次のコードの出力結果を予測してください：for (let i = 0; i < 3; i++) { console.log(i); }",
              hint: "ループの初期値と終了条件を確認しましょう"
            }
          ]
        }
      ],
      units: [
        { title: "JavaScriptの基本", duration: "45分", completed: true },
        { title: "変数とデータ型", duration: "30分", completed: true },
        { title: "関数の基礎", duration: "60分", completed: true },
        { title: "配列とオブジェクト", duration: "45分", completed: false },
        { title: "DOM操作入門", duration: "60分", completed: false }
      ]
    },
    {
      id: "2",
      title: "データ分析の始め方 - Pythonによる実践",
      description: "Pythonを使ったデータ分析の基礎を学ぶコース。Pandas、NumPy、Matplotlibなどのライブラリを用いたデータ処理と可視化を習得します。",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80",
      categories: ["データ分析", "Python"],
      duration: "8時間",
      progress: 40,
      difficulty: "intermediate",
      author: "鈴木 花子",
      publishedDate: "2023年5月20日",
      content: [
        {
          title: "Pythonデータ分析の基礎",
          content: `
            <p>データ分析は、データから意味のある情報や傾向を抽出するプロセスです。Pythonは、その豊富なライブラリとシンプルな構文により、データ分析に最適なプログラミング言語の一つとなっています。</p>
            <p>本講座では、Pythonを使用したデータ分析の基本的な手法について学びます。</p>
            <h3>Pandasの導入</h3>
            <p>Pandasは、データ操作と分析のための強力なライブラリです。データフレームという概念を通じて、表形式のデータを効率的に処理できます。</p>
          `,
          examples: [
            {
              title: "Pandasの基本操作",
              content: `
                <pre><code>import pandas as pd

# CSVファイルの読み込み
df = pd.read_csv('data.csv')

# データの先頭5行を確認
print(df.head())

# 基本的な統計情報
print(df.describe())</code></pre>
              `
            }
          ],
          summary: `
            <p>Pythonデータ分析では、Pandasを中心に、NumPyによる数値計算、Matplotlibによるデータ可視化などの様々なライブラリを組み合わせて使用します。これらのツールを活用することで、複雑なデータ分析タスクも効率的に実行できるようになります。</p>
          `,
          keyPoints: [
            "Pythonは豊富なライブラリによりデータ分析に適しています",
            "Pandasはデータフレームによる表形式データ処理を可能にします",
            "データ分析の一般的なワークフローには、データ収集、クリーニング、分析、可視化が含まれます",
            "実践的なデータスキルには継続的な学習が必要です"
          ],
          questions: [
            {
              question: "Pandasにおけるデータフレームとは何ですか？",
              hint: "表形式データに関連した概念です"
            }
          ]
        },
        {
          title: "データの可視化",
          content: `
            <h3>Matplotlibを使った基本的なグラフ作成</h3>
            <p>Matplotlibは、Pythonのデータ可視化ライブラリの中で最も基本的なものです。様々な種類のグラフを作成できます。</p>
            <p>データを視覚化することで、パターン、トレンド、異常値などを容易に識別できるようになります。</p>
          `,
          examples: [
            {
              title: "基本的な線グラフの作成",
              content: `
                <pre><code>import matplotlib.pyplot as plt

# 簡単な線グラフ
plt.plot([1, 2, 3, 4], [1, 4, 9, 16])
plt.xlabel('x軸')
plt.ylabel('y軸')
plt.title('サンプルグラフ')
plt.show()</code></pre>
              `
            }
          ],
          summary: `
            <p>データ可視化は、データ分析の重要な部分です。適切なグラフを選択し、データの特性を効果的に伝えることが重要です。Matplotlibの基本を理解すれば、より高度な可視化ライブラリであるSeabornやPlotlyにも容易に移行できます。</p>
          `,
          keyPoints: [
            "適切な可視化はデータの理解を深めます",
            "Matplotlibは基本的なグラフ作成に適しています",
            "Seabornはより高度な統計可視化に役立ちます",
            "目的に合わせたグラフタイプの選択が重要です"
          ],
          questions: [
            {
              question: "データの傾向を示すのに最適なグラフの種類は何ですか？",
              hint: "時間経過に伴う変化を表示することを考えてみましょう"
            }
          ]
        }
      ],
      units: [
        { title: "Python基礎復習", duration: "30分", completed: true },
        { title: "Pandasの基本操作", duration: "60分", completed: true },
        { title: "データクリーニング", duration: "45分", completed: false },
        { title: "Matplotlibによる可視化", duration: "60分", completed: false },
        { title: "Seabornによる統計的可視化", duration: "45分", completed: false },
        { title: "実践的なデータ分析プロジェクト", duration: "90分", completed: false }
      ]
    },
    {
      id: "3",
      title: "英語ビジネス会話 - 中級レベル",
      description: "ビジネスシーンで使える実践的な英会話を学ぶコース。会議、プレゼンテーション、交渉などのシーンで役立つフレーズと表現を習得します。",
      image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80",
      categories: ["語学", "ビジネス英語"],
      duration: "10時間",
      progress: 30,
      difficulty: "intermediate",
      author: "ジョン・スミス",
      publishedDate: "2023年3月10日",
      content: [
        {
          title: "ビジネスミーティングでの英語表現",
          content: `
            <p>ビジネスミーティングでは、適切な表現を使って自分の意見を明確に伝えることが重要です。このセクションでは、会議中によく使われる英語表現を学びます。</p>
            <h3>ミーティングの開始</h3>
            <ul>
              <li>"Let's get started." (始めましょう)</li>
              <li>"Thank you all for coming today." (本日はお集まりいただきありがとうございます)</li>
              <li>"The purpose of this meeting is to..." (この会議の目的は...です)</li>
            </ul>
            <h3>意見を述べる</h3>
            <ul>
              <li>"In my opinion..." (私の意見では...)</li>
              <li>"I believe that..." (私は...だと思います)</li>
              <li>"From my perspective..." (私の視点からすると...)</li>
            </ul>
          `,
          examples: [
            {
              title: "ミーティング開始の例",
              content: `
                <p><strong>例文:</strong></p>
                <p>"Good morning everyone. Thank you all for coming today. Let's get started. The purpose of this meeting is to discuss our marketing strategy for the next quarter. We have a lot to cover, so I'd like to begin with a brief overview of our current situation."</p>
                <p><strong>日本語訳:</strong></p>
                <p>「おはようございます。本日はお集まりいただきありがとうございます。始めましょう。この会議の目的は、来四半期のマーケティング戦略について話し合うことです。議題がたくさんありますので、まず現状の概要について簡単に説明したいと思います。」</p>
              `
            }
          ],
          summary: `
            <p>ビジネスミーティングでは、会議の構造を理解し、適切なフレーズを使用することが重要です。開始、議論、意見交換、合意形成、そして閉会という流れに沿って、それぞれの場面で相応しい表現を使いましょう。定型表現を覚えることで、自信を持って会議に参加できるようになります。</p>
          `,
          keyPoints: [
            "会議の開始には適切な挨拶と目的の説明が重要です",
            "意見を述べる際は明確かつ簡潔に表現しましょう",
            "相手の意見への同意や反対の表現方法を学びましょう",
            "質問や確認のフレーズも準備しておくと便利です"
          ],
          questions: [
            {
              question: "ミーティング中に反対意見を丁寧に表現するための適切なフレーズは何ですか？",
              hint: "直接的��否定を避けた表現を考えてみましょう"
            }
          ]
        }
      ],
      units: [
        { title: "ビジネスでの自己紹介", duration: "30分", completed: true },
        { title: "ミーティングでの表現", duration: "45分", completed: true },
        { title: "電話とメールのコミュニケーション", duration: "60分", completed: false },
        { title: "プレゼンテーションスキル", duration: "60分", completed: false },
        { title: "交渉とディスカッション", duration: "45分", completed: false },
        { title: "異文化コミュニケーション", duration: "45分", completed: false }
      ]
    }
  ];
} catch (e) {
  materialsData = [
    {
      id: "1",
      title: "プログラミングの基礎 - JavaScript入門",
      description: "プログラミング初心者のためのJavaScript基礎コース。変数、関数、制御構造などの基本概念を学びます。",
      image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80",
      categories: ["プログラミング", "JavaScript"],
      duration: "5時間",
      progress: 75,
      difficulty: "beginner",
      author: "山田 太郎",
      publishedDate: "2023年4月15日",
      content: [
        {
          title: "JavaScriptとは",
          content: `
            <p>JavaScriptは、Webページに動的な機能を追加するためのプログラミング言語です。HTMLとCSSと組み合わせて使用され、現代のWeb開発における重要なコンポーネントとなっています。</p>
            <p>1995年にNetscape Communicatorブラウザ用に開発されたJavaScriptは、現在ではあらゆるWebブラウザ、サーバー、モバイルアプリ、IoTデバイスなど幅広いプラットフォームで実行されています。</p>
            <p>JavaScriptの主な特徴：</p>
            <ul>
              <li><strong>クライアントサイド言語</strong>：ブラウザ上で動作します</li>
              <li><strong>インタープリタ言語</strong>：実行時に解釈されます</li>
              <li><strong>動的型付け</strong>：変数の型は実行時に決定されます</li>
              <li><strong>オブジェクト指向</strong>：プロトタイプベースのオブジェクト指向をサポートします</li>
            </ul>
          `,
          examples: [
            {
              title: "シンプルなJavaScriptの例",
              content: `
                <pre><code>// ブラウザの開発者コンソールに「Hello, World!」と表示する
console.log("Hello, World!");</code></pre>
              `
            }
          ],
          summary: `
            <p>JavaScriptは、Webページに対話性を持たせるための言語として始まり、現在では世界で最も広く使われているプログラミング言語の一つに成長しました。ブラウザでの動作を基本としながらも、Node.jsなどの環境により、サーバーサイド開発にも利用できるようになっています。</p>
          `,
          keyPoints: [
            "JavaScriptはWebブラウザで実行される言語です",
            "HTMLとCSSと組み合わせて使用されます",
            "現代のWeb開発に不可欠な要素です",
            "Node.jsを使用してサーバーサイドでも実行できます"
          ],
          questions: [
            {
              question: "JavaScriptの主な用途は何ですか？",
              hint: "Webページに関連した機能について考えてみましょう"
            },
            {
              question: "JavaScriptとJavaの関係性について説明してください",
              hint: "名前は似ていますが、両者は別の言語です"
            }
          ]
        },
        {
          title: "変数とデータ型",
          content: `
            <p>JavaScriptでは、<code>var</code>、<code>let</code>、<code>const</code>を使用して変数や定数を宣言します。</p>
            <h3>変数宣言</h3>
            <p>JavaScriptには変数を宣言する3つの方法があります：</p>
            <ul>
              <li><code>var</code>：古い宣言方法で、関数スコープを持ちます</li>
              <li><code>let</code>：ES6で導入された、ブロックスコープを持つ変数宣言</li>
              <li><code>const</code>：再代入できない定数を宣言します</li>
            </ul>
            <h3>データ型</h3>
            <p>JavaScriptには以下の基本的なデータ型があります：</p>
            <ul>
              <li><strong>文字列（String）</strong>：テキストデータ</li>
              <li><strong>数値（Number）</strong>：整数や小数点数値</li>
              <li><strong>真偽値（Boolean）</strong>：trueまたはfalse</li>
              <li><strong>未定義（Undefined）</strong>：値が割り当てられていない変数</li>
              <li><strong>Null</strong>：意図的に「値がない」ことを表す</li>
              <li><strong>オブジェクト（Object）</strong>：複数の値を持つデータ構造</li>
              <li><strong>シンボル（Symbol）</strong>：ES6で導入された一意の値</li>
            </ul>
          `,
          examples: [
            {
              title: "変数宣言の例",
              content: `
                <pre><code>// let を使った変数宣言
let message = "こんにちは";
message = "Hello"; // 再代入可能

// const を使った定数宣言
const PI = 3.14159;
// PI = 3; // エラー！constは再代入できません</code></pre>
              `
            },
            {
              title: "データ型の例",
              content: `
                <pre><code>// 文字列
let name = "鈴木";

// 数値
let age = 25;
let price = 19.99;

// 真偽値
let isActive = true;

// 配列（オブジェクトの一種）
let colors = ["赤", "青", "緑"];

// オブジェクト
let person = {
  name: "鈴木",
  age: 25,
  isStudent: false
};</code></pre>
              `
            }
          ],
          summary: `
            <p>JavaScriptでは、<code>let</code>と<code>const</code>を使って変数を宣言することをお勧めします（<code>var</code>は古い方法です）。JavaScriptは動的型付け言語なので、変数の型は自動的に判断されます。様々なデータ型を理解することで、より効果的なコードを書くことができます。</p>
          `,
          keyPoints: [
            "変数宣言には基本的に let と const を使用します",
            "const で宣言した変数は再代入できません",
            "JavaScriptは動的型付け言語です",
            "typeof 演算子でデータ型を調べることができます"
          ],
          questions: [
            {
              question: "let と const の主な違いは何ですか？",
              hint: "値の再代入に関する違いを考えてみましょう"
            },
            {
              question: "JavaScript のプリミティブ型とは何ですか？例を挙げてください",
              hint: "オブジェクト以外の基本的なデータ型を考えてみましょう"
            }
          ]
        },
        {
          title: "関数と制御構造",
          content: `
            <h3>関数の定義と呼び出し</h3>
            <p>関数は、再利用可能なコードブロックです。JavaScriptでは、関数を以下の方法で定義できます：</p>
            <ol>
              <li><strong>関数宣言</strong>：<code>function</code>キーワードを使用</li>
              <li><strong>関数式</strong>：変数に関数を代入</li>
              <li><strong>アロー関数</strong>：ES6で導入された簡潔な構文</li>
            </ol>
            <h3>条件文</h3>
            <p>条件に基づいて異なるコードを実行するには、条件文を使用します：</p>
            <ul>
              <li><code>if...else</code>文</li>
              <li><code>switch</code>文</li>
              <li>三項演算子</li>
            </ul>
            <h3>ループ</h3>
            <p>繰り返し処理を行うには、ループ構造を使用します：</p>
            <ul>
              <li><code>for</code>ループ</li>
              <li><code>while</code>ループ</li>
              <li><code>do...while</code>ループ</li>
              <li><code>for...of</code>ループ（イテラブルオブジェクト用）</li>
              <li><code>for...in</code>ループ（オブジェクトのプロパティ用）</li>
            </ul>
          `,
          examples: [
            {
              title: "関数の例",
              content: `
                <pre><code>// 関数宣言
function greet(name) {
  return "こんにちは、" + name + "さん！";
}

// 関数呼び出し
let greeting = greet("太郎");
console.log(greeting); // "こんにちは、太郎さん！"

// アロー関数
const add = (a, b) => a + b;
console.log(add(5, 3)); // 8</code></pre>
              `
            },
            {
              title: "条件文の例",
              content: `
                <pre><code>let hour = 10;

// if-else文
if (hour < 12) {
  console.log("おはようございます");
} else if (hour < 18) {
  console.log("こんにちは");
} else {
  console.log("こんばんは");
}

// switch文
let day = "月曜日";
switch (day) {
  case "月曜日":
    console.log("週の始まりです");
    break;
  case "金曜日":
    console.log("週末です");
    break;
  default:
    console.log("平日です");
}</code></pre>
              `
            },
            {
              title: "ループの例",
              content: `
                <pre><code>// forループ
for (let i = 0; i < 5; i++) {
  console.log(i); // 0, 1, 2, 3, 4
}

// 配列のループ処理
const fruits = ["りんご", "バナナ", "オレンジ"];

// for...ofループ
for (const fruit of fruits) {
  console.log(fruit);
}

// forEach メソッド
fruits.forEach((fruit, index) => {
  console.log(\`\${index}: \${fruit}\`);
});</code></pre>
              `
            }
          ],
          summary: `
            <p>関数は、コードの再利用性と整理に役立ちます。条件文とループを使用することで、プログラムのフローを制御し、データを効率的に処理することができます。アロー関数や<code>for...of</code>ループなどのモダンなJavaScript機能を活用すると、より簡潔で読みやすいコードを書くことができます。</p>
          `,
          keyPoints: [
            "関数は再利用可能なコードブロックです",
            "アロー関数はより簡潔な構文を提供します",
            "条件文は異なる条件に基づいてコードを実行します",
            "ループは繰り返し処理を行うための構造です"
          ],
          questions: [
            {
              question: "アロー関数と通常の関数宣言の違いを説明してください",
              hint: "構文の違いだけでなく、thisの動作についても考えてみましょう"
            },
            {
              question: "次のコードの出力結果を予測してください：for (let i = 0; i < 3; i++) { console.log(i); }",
              hint: "ループの初期値と終了条件を確認しましょう"
            }
          ]
        }
      ],
      units: [
        { title: "JavaScriptの基本", duration: "45分", completed: true },
        { title: "変数とデータ型", duration: "30分", completed: true },
        { title: "関数の基礎", duration: "60分", completed: true },
        { title: "配列とオブジェクト", duration: "45分", completed: false },
        { title: "DOM操作入門", duration: "60分", completed: false }
      ]
    },
    {
      id: "2",
      title: "データ分析の始め方 - Pythonによる実践",
      description: "Pythonを使ったデータ分析の基礎を学ぶコース。Pandas、NumPy、Matplotlibなどのライブラリを用いたデータ処理と可視化を習得します。",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80",
      categories: ["データ分析", "Python"],
      duration: "8時間",
      progress: 40,
      difficulty: "intermediate",
      author: "鈴木 花子",
      publishedDate: "2023年5月20日",
      content: [
        {
          title: "Pythonデータ分析の基礎",
          content: `
            <p>データ分析は、データから意味のある情報や傾向を抽出するプロセスです。Pythonは、その豊富なライブラリとシンプルな構文により、データ分析に最適なプログラミング言語の一つとなっています。</p>
            <p>本講座では、Pythonを使用したデータ分析の基本的な手法について学びます。</p>
            <h3>Pandasの導入</h3>
            <p>Pandasは、データ操作と分析のための強力なライブラリです。データフレームという概念を通じて、表形式のデータを効率的に処理できます。</p>
          `,
          examples: [
            {
              title: "Pandasの基本操作",
              content: `
                <pre><code>import pandas as pd

# CSVファイルの読み込み
df = pd.read_csv('data.csv')

# データの先頭5行を確認
print(df.head())

# 基本的な統計情報
print(df.describe())</code></pre>
              `
            }
          ],
          summary: `
            <p>Pythonデータ分析では、Pandasを中心に、NumPyによる数値計算、Matplotlibによるデータ可視化などの様々なライブラリを組み合わせて使用します。これらのツールを活用することで、複雑なデータ分析タスクも効率的に実行できるようになります。</p>
          `,
          keyPoints: [
            "Pythonは豊富なライブラリによりデータ分析に適しています",
            "Pandasはデータフレームによる表形式データ処理を可能にします",
            "データ分析の一般的なワークフローには、データ収集、クリーニング、分析、可視化が含まれます",
            "実践的なデータスキルには継続的な学習が必要です"
          ],
          questions: [
            {
              question: "Pandasにおけるデータフレームとは何ですか？",
              hint: "表形式データに関連した概念です"
            }
          ]
        },
        {
          title: "データの可視化",
          content: `
            <h3>Matplotlibを使った基本的なグラフ作成</h3>
            <p>Matplotlibは、Pythonのデータ可視化ライブラリの中で最も基本的なものです。様々な種類のグラフを作成できます。</p>
            <p>データを視覚化することで、パターン、トレンド、異常値などを容易に識別できるようになります。</p>
          `,
          examples: [
            {
              title: "基本的な線グラフの作成",
              content: `
                <pre><code>import matplotlib.pyplot as plt

# 簡単な線グラフ
plt.plot([1, 2, 3, 4], [1, 4, 9, 16])
plt.xlabel('x軸')
plt.ylabel('y軸')
plt.title('サンプルグラフ')
plt.show()</code></pre>
              `
            }
          ],
          summary: `
            <p>データ可視化は、データ分析の重要な部分です。適切なグラフを選択し、データの特性を効果的に伝えることが重要です。Matplotlibの基本を理解すれば、より高度な可視化ライブラリであるSeabornやPlotlyにも容易に移行できます。</p>
          `,
          keyPoints: [
            "適切な可視化はデータの理解を深めます",
            "Matplotlibは基本的なグラフ作成に適しています",
            "Seabornはより高度な統計可視化に役立ちます",
            "目的に合わせたグラフタイプの選択が重要です"
          ],
          questions: [
            {
              question: "データの傾向を示すのに最適なグラフの種類は何ですか？",
              hint: "時間経過に伴う変化を表示することを考えてみましょう"
            }
          ]
        }
      ],
      units: [
        { title: "Python基礎復習", duration: "30分", completed: true },
        { title: "Pandasの基本操作", duration: "60分", completed: true },
        { title: "データクリーニング", duration: "45分", completed: false },
        { title: "Matplotlibによる可視化", duration: "60分", completed: false },
        { title: "Seabornによる統計的可視化", duration: "45分", completed: false },
        { title: "実践的なデータ分析プロジェクト", duration: "90分", completed: false }
      ]
    },
    {
      id: "3",
      title: "英語ビジネス会話 - 中級レベル",
      description: "ビジネスシーンで使える実践的な英会話を学ぶコース。会議、プレゼンテーション、交渉などのシーンで役立つフレーズと表現を習得します。",
      image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80",
      categories: ["語学", "ビジネス英語"],
      duration: "10時間",
      progress: 30,
      difficulty: "intermediate",
      author: "ジョン・スミス",
      publishedDate: "2023年3月10日",
      content: [
        {
          title: "ビジネスミーティングでの英語表現",
          content: `
            <p>ビジネスミーティングでは、適切な表現を使って自分の意見を明確に伝えることが重要です。このセクションでは、会議中によく使われる英語表現を学びます。</p>
            <h3>ミーティングの開始</h3>
            <ul>
              <li>"Let's get started." (始めましょう)</li>
              <li>"Thank you all for coming today." (本日はお集まりいただきありがとうございます)</li>
              <li>"The purpose of this meeting is to..." (この会議の目的は...です)</li>
            </ul>
            <h3>意見を述べる</h3>
            <ul>
              <li>"In my opinion..." (私の意見では...)</li>
              <li>"I believe that..." (私は...だと思います)</li>
              <li>"From my perspective..." (私の視点からすると...)</li>
            </ul>
          `,
          examples: [
            {
              title: "ミーティング開始の例",
              content: `
                <p><strong>例文:</strong></p>
                <p>"Good morning everyone. Thank you all for coming today. Let's get started. The purpose of this meeting is to discuss our marketing strategy for the next quarter. We have a lot to cover, so I'd like to begin with a brief overview of our current situation."</p>
                <p><strong>日本語訳:</strong></p>
                <p>「おはようございます。本日はお集まりいただきありがとうございます。始めましょう。この会議の目的は、来四半期のマーケティング戦略について話し合うことです。議題がたくさんありますので、まず現状の概要について簡単に説明したいと思います。」</p>
              `
            }
          ],
          summary: `
            <p>ビジネスミーティングでは、会議の構造を理解し、適切なフレーズを使用することが重要です。開始、議論、意見交換、合意形成、そして閉会という流れに沿って、それぞれの場面で相応しい表現を使いましょう。定型表現を覚えることで、自信を持って会議に参加できるようになります。</p>
          `,
          keyPoints: [
            "会議の開始には適切な挨拶と目的の説明が重要です",
            "意見を述べる際は明確かつ簡潔に表現しましょう",
            "相手の意見への同意や反対の表現方法を学びましょう",
            "質問や確認のフレーズも準備しておくと便利です"
          ],
          questions: [
            {
              question: "ミーティング中に反対意見を丁寧に表現するための適切なフレーズは何ですか？",
              hint: "直接的��否定を避けた表現を考えてみましょう"
            }
          ]
        }
      ],
      units: [
        { title: "ビジネスでの自己紹介", duration: "30分", completed: true },
        { title: "ミーティングでの表現", duration: "45分", completed: true },
        { title: "電話とメールのコミュニケーション", duration: "60分", completed: false },
        { title: "プレゼンテーションスキル", duration: "60分", completed: false },
        { title: "交渉とディスカッション", duration: "45分", completed: false },
        { title: "異文化コミュニケーション", duration: "45分", completed: false }
      ]
    }
  ];
}

export default MaterialDetail;
