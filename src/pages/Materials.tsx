import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MaterialCard from '@/components/MaterialCard';

const Materials = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Filter materials based on search query and selected category
  const filteredMaterials = materialsData.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        material.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? material.categories.includes(selectedCategory) : true;
    return matchesSearch && matchesCategory;
  });
  
  // Get all unique categories
  const allCategories = Array.from(
    new Set(materialsData.flatMap(material => material.categories))
  );
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 animate-slide-down">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">学習教材一覧</h1>
              <p className="text-muted-foreground mt-1">あなたの目標達成に必要な教材をすべて揃えています</p>
            </div>
            
            {/* Search */}
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="教材を検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 min-w-[240px]"
              />
            </div>
          </div>
          
          {/* Filters */}
          <div className="mb-8 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <h2 className="font-medium">フィルター</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCategory && (
                <Badge
                  variant="outline"
                  className="cursor-pointer bg-primary/10 hover:bg-primary/20"
                  onClick={() => setSelectedCategory(null)}
                >
                  すべて表示
                </Badge>
              )}
              {allCategories.map(category => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Materials tabs */}
          <Tabs defaultValue="all" className="w-full animate-fade-in">
            <TabsList className="mb-6">
              <TabsTrigger value="all">すべての教材</TabsTrigger>
              <TabsTrigger value="in-progress">進行中</TabsTrigger>
              <TabsTrigger value="completed">完了</TabsTrigger>
              <TabsTrigger value="not-started">未開始</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              {filteredMaterials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMaterials.map((material) => (
                    <MaterialCard
                      key={material.id}
                      id={material.id}
                      title={material.title}
                      description={material.description}
                      image={material.image}
                      categories={material.categories}
                      duration={material.duration}
                      progress={material.progress}
                      difficulty={material.difficulty}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">検索条件に一致する教材が見つかりませんでした。</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}
                  >
                    フィルターをクリア
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="in-progress" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials
                  .filter(material => material.progress > 0 && material.progress < 100)
                  .map((material) => (
                    <MaterialCard
                      key={material.id}
                      id={material.id}
                      title={material.title}
                      description={material.description}
                      image={material.image}
                      categories={material.categories}
                      duration={material.duration}
                      progress={material.progress}
                      difficulty={material.difficulty}
                    />
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials
                  .filter(material => material.progress === 100)
                  .map((material) => (
                    <MaterialCard
                      key={material.id}
                      id={material.id}
                      title={material.title}
                      description={material.description}
                      image={material.image}
                      categories={material.categories}
                      duration={material.duration}
                      progress={material.progress}
                      difficulty={material.difficulty}
                    />
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="not-started" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials
                  .filter(material => material.progress === 0)
                  .map((material) => (
                    <MaterialCard
                      key={material.id}
                      id={material.id}
                      title={material.title}
                      description={material.description}
                      image={material.image}
                      categories={material.categories}
                      duration={material.duration}
                      progress={material.progress}
                      difficulty={material.difficulty}
                    />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// Mock data for materials
const materialsData = [
  {
    id: "1",
    title: "プログラミングの基礎 - JavaScript入門",
    description: "プログラミング初心者のためのJavaScript基礎コース。変数、関数、制御構造などの基本概念を学びます。",
    image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80",
    categories: ["プログラミング", "JavaScript"],
    duration: "5時間",
    progress: 75,
    difficulty: "beginner" as const
  },
  {
    id: "2",
    title: "データ分析の始め方 - Pythonによる実践",
    description: "Pythonを使ったデータ分析の基礎を学ぶコース。Pandas、NumPy、Matplotlibなどのライブラリを用いたデータ処理と可視化を習得します。",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80",
    categories: ["データ分析", "Python"],
    duration: "8時間",
    progress: 40,
    difficulty: "intermediate" as const
  },
  {
    id: "3",
    title: "英語ビジネス会話 - 中級レベル",
    description: "ビジネスシーンで使える実践的な英会話を学ぶコース。会議、プレゼンテーション、交渉などのシーンで役立つフレーズと表現を習得します。",
    image: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80",
    categories: ["語学", "ビジネス英語"],
    duration: "10時間",
    progress: 30,
    difficulty: "intermediate" as const
  },
  {
    id: "4",
    title: "AIと機械学習の概要",
    description: "人工知能と機械学習の基本概念、歴史、現在のトレンド、そして未来の可能性について学ぶ入門コース。",
    image: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&q=80",
    categories: ["AI", "機械学習"],
    duration: "6時間",
    progress: 10,
    difficulty: "intermediate" as const
  },
  {
    id: "5",
    title: "Webデザインの基礎 - UX/UIの原則",
    description: "ユーザー体験を中心としたWebデザインの基本原則を学ぶコース。情報設計からビジュアルデザインまでを網羅します。",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80",
    categories: ["デザイン", "UX/UI"],
    duration: "7時間",
    progress: 0,
    difficulty: "beginner" as const
  },
  {
    id: "6",
    title: "クラウドコンピューティング入門 - AWSの基礎",
    description: "Amazon Web Servicesを使ったクラウドインフラストラクチャの構築と管理の基礎を学ぶコース。",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80",
    categories: ["クラウド", "AWS"],
    duration: "9時間",
    progress: 0,
    difficulty: "intermediate" as const
  },
  {
    id: "7",
    title: "ブロックチェーン技術と暗号通貨",
    description: "ブロックチェーン技術の仕組みと応用、暗号通貨の原理と市場動向について学ぶ上級コース。",
    image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&q=80",
    categories: ["ブロックチェーン", "フィンテック"],
    duration: "12時間",
    progress: 0,
    difficulty: "advanced" as const
  },
  {
    id: "8",
    title: "リーダーシップとチームマネジメント",
    description: "効果的なリーダーシップの原則とチームマネジメントの手法を学ぶビジネススキルコース。",
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80",
    categories: ["ビジネス", "リーダーシップ"],
    duration: "8時間",
    progress: 100,
    difficulty: "intermediate" as const
  },
  {
    id: "9",
    title: "モバイルアプリ開発 - React Native入門",
    description: "React Nativeを使ったクロスプラットフォームモバイルアプリ開発の基礎を学ぶコース。",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80",
    categories: ["プログラミング", "モバイル開発"],
    duration: "10時間",
    progress: 100,
    difficulty: "intermediate" as const
  },
];

export default Materials;
