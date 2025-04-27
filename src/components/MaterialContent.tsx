import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PlayCircle, BookOpen, Volume2, ExternalLink, CheckCircle, MessageCircle, Pause, Menu, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ModuleDetail } from '@/services/openai';
import { useToast } from "@/hooks/use-toast";
import { generateSpeech } from '@/services/openai';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [activeTab, setActiveTab] = useState('content');
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [useOpenAIVoice, setUseOpenAIVoice] = useState(true);
  const [voiceType, setVoiceType] = useState('alloy');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthesis = window.speechSynthesis;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const summaryContentRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // コンポーネントマウント時にSpeech APIをセットアップ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // window.speechSynthesis は直接参照するため、状態管理は不要
      
      // Audio要素の作成
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => {
        setCurrentlyPlayingId(null);
      });
    }
    
    return () => {
      // クリーンアップ
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // ページ更新時にタブ状態を保持
  useEffect(() => {
    setActiveTab('content');
  }, [moduleDetail]);
  
  const handleVoiceTypeChange = (value: string) => {
    setVoiceType(value);
  };
  
  // テキストから音声合成を実行する関数
  const speakText = useCallback(async (text: string, sectionId: string) => {
    // 現在再生中の音声があれば停止
    if (currentlyPlayingId) {
      if (utteranceRef.current) {
        speechSynthesis?.cancel();
        utteranceRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      if (currentlyPlayingId === sectionId) {
        setCurrentlyPlayingId(null);
        return;
      }
    }
    
    try {
      if (useOpenAIVoice) {
        setIsGeneratingAudio(true);
        
        // テキストからHTMLタグを除去
        const plainText = text.replace(/<[^>]*>/g, '');
        
        // OpenAIの音声合成APIを使用
        const audioData = await generateSpeech(plainText, voiceType);
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setCurrentlyPlayingId(sectionId);
        }
      } else if (speechSynthesis) {
        // ブラウザの音声合成APIを使用
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // 発話終了イベントを設定
        utterance.onend = () => {
          setCurrentlyPlayingId(null);
          utteranceRef.current = null;
        };
        
        // 音声合成を実行
        speechSynthesis.speak(utterance);
        utteranceRef.current = utterance;
        setCurrentlyPlayingId(sectionId);
      } else {
        toast({
          title: "音声合成エラー",
          description: "お使いのブラウザは音声合成をサポートしていません。",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('音声合成エラー:', error);
      toast({
        title: "音声合成エラー",
        description: "音声の生成中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [speechSynthesis, currentlyPlayingId, useOpenAIVoice, toast, voiceType]);
  
  const handleNextModule = () => {
    if (currentModule?.next_module?.id) {
      navigate(`/module/${currentModule.next_module.id}`);
    }
  };
  
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
        {moduleDetail.content.map((section, index) => {
          const sectionId = `section-${section.id || index}`;
          const isPlaying = currentlyPlayingId === sectionId;
          
          return (
            <div 
              key={index} 
              className="prose prose-slate max-w-none"
              id={sectionId}
              onClick={() => {
                if (onSectionChange && section.id) {
                  onSectionChange(section.id);
                } else if (onSectionChange) {
                  onSectionChange(`section-${index}`);
                }
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold mb-0">{section.title}</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(section.content, sectionId);
                  }}
                  className="ml-2 flex items-center gap-1"
                >
                  {isPlaying ? (
                    <React.Fragment>
                      <Pause className="h-4 w-4" />
                      <span>停止</span>
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      <Volume2 className="h-4 w-4" />
                      <span>読み上げ</span>
                    </React.Fragment>
                  )}
                </Button>
              </div>
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
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium mb-2">まとめ</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        speakText(section.summary, `summary-${sectionId}`);
                      }}
                      className="ml-2 flex items-center gap-1"
                    >
                      {currentlyPlayingId === `summary-${sectionId}` ? (
                        <React.Fragment>
                          <Pause className="h-4 w-4" />
                          <span>停止</span>
                        </React.Fragment>
                      ) : (
                        <React.Fragment>
                          <Volume2 className="h-4 w-4" />
                          <span>読み上げ</span>
                        </React.Fragment>
                      )}
                    </Button>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: section.summary }} />
                </div>
              )}
              
              {index < moduleDetail.content.length - 1 && <Separator className="my-8" />}
            </div>
          );
        })}
      </div>
    );
  };
  
  // モジュールの要約を生成
  const generateSummary = () => {
    if (!moduleDetail?.content || moduleDetail.content.length === 0) {
      return <p>要約がありません。</p>;
    }
    
    return (
      <div className="space-y-6">
        {moduleDetail.content.map((section, index) => (
          <div key={index}>
            <h4 className="font-semibold mb-2">{section.title}</h4>
            {section.keyPoints && section.keyPoints.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {section.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {section.summary || section.content.slice(0, 100).replace(/<[^>]*>/g, '') + (section.content.length > 100 ? '...' : '')}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // PDFダウンロード処理
  const handleDownloadSummary = async () => {
    if (!summaryContentRef.current) {
      toast({
        title: "ダウンロードエラー",
        description: "要約コンテンツが見つかりません。",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    toast({
      title: "PDF生成中",
      description: "要約のPDFを生成しています...",
    });

    try {
      const canvas = await html2canvas(summaryContentRef.current, {
        scale: 2, // 高解像度化
        useCORS: true, // CORS問題を回避（必要な場合）
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p', // portrait (縦向き)
        unit: 'px', // 単位
        format: [canvas.width, canvas.height] // ページサイズをcanvasに合わせる
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${moduleDetail?.title || 'module'}_summary.pdf`); // ファイル名

      toast({
        title: "ダウンロード完了",
        description: "要約のPDFをダウンロードしました。",
      });
    } catch (error) {
      console.error("PDF生成エラー:", error);
      toast({
        title: "ダウンロードエラー",
        description: "PDFの生成中にエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{moduleDetail?.title || 'モジュール'}</h1>
            <DifficultyBadge />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm">音声機能</span>
              <Switch 
                checked={useOpenAIVoice} 
                onCheckedChange={setUseOpenAIVoice}
              />
              {useOpenAIVoice && (
                <Select value={voiceType} onValueChange={handleVoiceTypeChange}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="音声タイプ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">標準</SelectItem>
                    <SelectItem value="echo">エコー</SelectItem>
                    <SelectItem value="fable">ファブル</SelectItem>
                    <SelectItem value="onyx">オニックス</SelectItem>
                    <SelectItem value="nova">ノバ</SelectItem>
                    <SelectItem value="shimmer">シマー</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSidebar}
              className="md:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          <Badge variant="outline">所要時間: {currentModule?.estimated_duration || '30分'}</Badge>
          <Badge variant="secondary">必須モジュール</Badge>
        </div>
        <p className="text-muted-foreground mb-4">
          {moduleDetail.description}
        </p>
        
        <div className="flex items-center mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => speakText(moduleDetail.description || '', 'module-description')}
            className="flex items-center gap-1"
          >
            {currentlyPlayingId === 'module-description' ? (
              <React.Fragment>
                <Pause className="h-4 w-4" />
                <span>音声停止</span>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Volume2 className="h-4 w-4" />
                <span>説明を読み上げ</span>
              </React.Fragment>
            )}
          </Button>
        </div>

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
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
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
            <CardContent ref={summaryContentRef}>
              {generateSummary()}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleDownloadSummary}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    要約をPDFでダウンロード
                  </>
                )}
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
                このモジュールに関する自分のメモを記録できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 h-64 flex items-center justify-center">
                <p className="text-muted-foreground">ノート機能は現在開発中です</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-12 mb-8 flex justify-center z-10 gap-4">
        <Button 
          size="lg" 
          onClick={onStartPractice}
          className="shadow-lg"
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          AIチャットで質問する
        </Button>
        
        <Button
          variant="outline"
          onClick={handleNextModule}
          disabled={!currentModule?.next_module?.id}
        >
          次のモジュールへ
        </Button>
      </div>
    </div>
  );
};

// デフォルトのモジュールコンテンツ（データが生成されるまでの表示用）
const DefaultModuleContent = ({ activeModule, onStartPractice }: MaterialContentProps) => {
  const [activeTab, setActiveTab] = useState('introduction');
  
  // 導入モジュールのコンテンツ
  const IntroductionModule = () => (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
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
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
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
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
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

