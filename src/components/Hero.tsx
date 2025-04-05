import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Hero = () => {
  return (
    <div className="relative pt-20 pb-16 sm:pt-24 sm:pb-20 md:pt-32 md:pb-24 overflow-hidden w-full">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden -z-10 opacity-50">
        <div className="absolute -top-[30%] -right-[20%] w-[60%] h-[140%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[60%] rounded-full bg-primary/5 blur-3xl" />
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl flex flex-col items-center text-center">
        {/* Small pill/chip above the heading */}
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
          <span>AIを活用した新しい学習体験</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6 animate-slide-down">
          あなただけの<br className="sm:hidden" />
          <span className="text-primary">カスタム学習プラン</span>で<br className="sm:hidden" />
          目標達成を加速
        </h1>
        
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mb-10 animate-slide-up delay-75">
          goalwiseは、AIが個人の目標や学習スタイルに合わせた最適な学習プランを作成。
          効率的に知識を習得し、着実に目標へ近づきます。
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in delay-150">
          <Button size="lg" className="w-full sm:w-auto button-hover" asChild>
            <Link to="/signup">
              無料で始める
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link to="/login">デモを見る</Link>
          </Button>
        </div>
        
        {/* Social proof or stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mt-16 text-center animate-fade-in delay-200">
          <div>
            <p className="text-3xl font-bold">2,000+</p>
            <p className="text-sm text-muted-foreground">ユーザー</p>
          </div>
          <div>
            <p className="text-3xl font-bold">92%</p>
            <p className="text-sm text-muted-foreground">目標達成率</p>
          </div>
          <div>
            <p className="text-3xl font-bold">3倍</p>
            <p className="text-sm text-muted-foreground">学習効率UP</p>
          </div>
          <div>
            <p className="text-3xl font-bold">4.9/5</p>
            <p className="text-sm text-muted-foreground">ユーザー満足度</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
