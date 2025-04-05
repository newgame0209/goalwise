import { Brain, Lightbulb, Target, BookOpen, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import FeatureCard from '@/components/FeatureCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <Navbar />
      
      <main className="flex-grow w-full">
        {/* Hero Section */}
        <Hero />
        
        {/* Features Section */}
        <section className="py-16 md:py-24 w-full">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">効率的に目標達成するための機能</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                goalwiseは、あなたの学習をより効率的で効果的にするための様々な機能を提供します。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={Brain}
                title="AIアシスタント"
                description="AIがあなたの学習スタイルと目標を理解し、最適な学習プランを提案します。"
              />
              <FeatureCard 
                icon={Target}
                title="KPIツリー"
                description="目標を階層的に分解し、進捗を可視化。大きな目標も着実に達成できます。"
              />
              <FeatureCard 
                icon={Lightbulb}
                title="マインドマップ"
                description="知識の関連性を視覚的に理解し、記憶の定着を促進します。"
              />
              <FeatureCard 
                icon={BookOpen}
                title="カスタム教材"
                description="あなたのレベルと目標に合わせた教材を自動生成。効率的な学習をサポートします。"
              />
              <FeatureCard 
                icon={Sparkles}
                title="個別最適化"
                description="学習の進捗に応じて内容を自動調整し、常に最適な難易度を維持します。"
              />
              <FeatureCard 
                icon={Target}
                title="進捗管理"
                description="目標達成までの道のりを可視化し、モチベーションを維持します。"
              />
            </div>
          </div>
        </section>
        
        {/* How it works section */}
        <section className="py-16 md:py-24 bg-secondary/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">どのように機能するか</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                goalwiseは、AIを活用してあなただけの学習体験を実現します。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1">
                <div className="space-y-8">
                  <div className="flex">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-lg">
                      1
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold mb-2">目標設定</h3>
                      <p className="text-muted-foreground">
                        あなたの目標と現在のスキルレベルを入力します。
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-lg">
                      2
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold mb-2">AI分析</h3>
                      <p className="text-muted-foreground">
                        AIがあなたの情報を分析し、最適な学習プランを作成します。
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-lg">
                      3
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold mb-2">カスタム教材</h3>
                      <p className="text-muted-foreground">
                        あなた専用の教材が自動生成され、学習を始めることができます。
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-lg">
                      4
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-semibold mb-2">進捗追跡と最適化</h3>
                      <p className="text-muted-foreground">
                        学習の進捗に応じてAIが内容を最適化し、効率的に目標達成をサポートします。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="order-1 md:order-2">
                <div className="glass rounded-2xl overflow-hidden shadow-glass">
                  <img 
                    src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d" 
                    alt="goalwise学習プラットフォームのデモ画面" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonials section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">ユーザーの声</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                goalwiseを使って目標を達成したユーザーの体験談
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, idx) => (
                <div 
                  key={idx} 
                  className="glass rounded-xl p-6 shadow-subtle card-hover"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="ml-4">
                      <h3 className="font-semibold">{testimonial.name}</h3>
                      <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">"{testimonial.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA section */}
        <section className="py-16 md:py-24 bg-primary/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">あなたの学習を次のレベルへ</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              goalwiseで、効率的に目標を達成しましょう。今すぐ無料で始めることができます。
            </p>
            <Button size="lg" className="button-hover" asChild>
              <Link to="/signup">
                無料で始める
              </Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

// Testimonial data
const testimonials = [
  {
    name: "田中 健太",
    title: "プログラマー",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80",
    quote: "goalwiseを使って3ヶ月でReactの基礎から応用まで習得できました。KPIツリーで学習計画が明確になり、効率的に学習できました。"
  },
  {
    name: "佐藤 美咲",
    title: "マーケター",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80",
    quote: "マーケティングの最新トレンドを学ぶために利用しましたが、AIが私のレベルに合わせて教材を調整してくれるのが素晴らしいです。"
  },
  {
    name: "鈴木 大輔",
    title: "大学生",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80",
    quote: "TOEICの勉強に活用しています。マインドマップで単語の関連性が視覚的に理解でき、短期間でスコアが200点以上アップしました。"
  }
];

export default Index;
