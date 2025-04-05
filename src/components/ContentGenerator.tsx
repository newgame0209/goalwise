import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ContentGenerationPrompt, generateMaterialContent, setOpenAIKey, getOpenAIKey, GeneratedMaterial } from '@/services/openai';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface ContentGeneratorProps {
  onContentGenerated: (material: GeneratedMaterial) => void;
}

// プロファイルデータの型定義
interface UserProfileData {
  goal?: string;
  timeframe?: string;
  studyTime?: string;
  currentLevel?: string;
  learningStyle?: string[];
  motivation?: string;
  challenges?: string;
}

const ContentGenerator = ({ onContentGenerated }: ContentGeneratorProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [useProfileData, setUseProfileData] = useState(true);
  
  const [prompt, setPrompt] = useState<ContentGenerationPrompt>({
    title: '',
    description: '',
    difficulty: 'beginner',
    language: '',
    targetAudience: '',
    additionalInstructions: ''
  });

  // コンポーネントマウント時にAPIキーを設定
  useEffect(() => {
    const savedApiKey = getOpenAIKey();
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      // APIキーがない場合はトースト通知を表示
      toast({
        title: 'OpenAI APIキーが設定されていません',
        description: 'コンテンツの生成にはAPIキーが必要です',
        variant: 'destructive',
      });
    }
    
    // 現在のユーザーとプロファイルデータを取得
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('profile_data')
          .eq('id', user.id)
          .single();
          
        if (!error && data?.profile_data) {
          const profileAnswers = (data.profile_data as any).answers || [];
          
          // プロファイル回答からプロファイルデータを構築
          const extractedProfileData: UserProfileData = {};
          
          profileAnswers.forEach((answer: { question: string, answer: string }) => {
            // 質問に応じてプロファイルデータに追加
            if (answer.question.includes('学習目的') || answer.question.includes('ゴール')) {
              extractedProfileData.goal = answer.answer;
            } else if (answer.question.includes('期限')) {
              extractedProfileData.timeframe = answer.answer;
            } else if (answer.question.includes('勉強時間')) {
              extractedProfileData.studyTime = answer.answer;
            } else if (answer.question.includes('レベル')) {
              extractedProfileData.currentLevel = answer.answer;
            } else if (answer.question.includes('学習スタイル')) {
              extractedProfileData.learningStyle = [answer.answer];
            } else if (answer.question.includes('動機') || answer.question.includes('活用シーン')) {
              extractedProfileData.motivation = answer.answer;
            } else if (answer.question.includes('苦手') || answer.question.includes('障壁')) {
              extractedProfileData.challenges = answer.answer;
            }
          });
          
          setProfileData(extractedProfileData);
          console.log('プロファイルデータを読み込みました:', extractedProfileData);
        }
      }
    };
    
    getCurrentUser();
  }, [toast]);

  const handleInputChange = (field: keyof ContentGenerationPrompt, value: string) => {
    setPrompt(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDifficultyChange = (value: string) => {
    setPrompt(prev => ({
      ...prev,
      difficulty: value as 'beginner' | 'intermediate' | 'advanced'
    }));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    setOpenAIKey(key);
  };

  const handleSubmit = async () => {
    if (!apiKey) {
      toast({
        title: 'APIキーが必要です',
        description: 'OpenAI APIキーを入力してください',
        variant: 'destructive'
      });
      return;
    }

    if (!prompt.title || !prompt.description) {
      toast({
        title: '入力が不足しています',
        description: 'タイトルと説明は必須です',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // プロファイルデータを含める場合はプロンプトに追加
      const finalPrompt = {
        ...prompt,
        profileData: useProfileData && profileData ? profileData : undefined
      };

      const generatedMaterial = await generateMaterialContent(finalPrompt);
      if (generatedMaterial) {
        onContentGenerated(generatedMaterial);
        toast({
          title: 'コンテンツの生成に成功しました',
          description: '生成された教材コンテンツが適用されました',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full mb-8">
      <CardHeader>
        <CardTitle>教材コンテンツの自動生成</CardTitle>
        <CardDescription>
          OpenAI APIを使用して教材コンテンツを生成します。以下の情報を入力してください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">OpenAI APIキー</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={handleApiKeyChange}
          />
          <p className="text-xs text-muted-foreground">
            APIキーはローカルストレージに保存されます。セキュリティのため、本番環境ではバックエンドで処理することをお勧めします。
          </p>
        </div>

        {profileData && Object.keys(profileData).length > 0 && (
          <div className="flex items-center space-x-2 my-4 p-3 border rounded-md bg-muted/50">
            <Checkbox 
              id="useProfileData" 
              checked={useProfileData} 
              onCheckedChange={(checked) => setUseProfileData(checked as boolean)}
            />
            <Label htmlFor="useProfileData" className="text-sm">
              プロファイリングデータを教材生成に使用する
            </Label>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">タイトル</Label>
          <Input
            id="title"
            placeholder="例: JavaScriptの基礎入門"
            value={prompt.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">説明</Label>
          <Textarea
            id="description"
            placeholder="例: プログラミング初心者のためのJavaScript基礎コース。変数、関数、制御構造などの基本概念を学びます。"
            value={prompt.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty">難易度</Label>
          <Select 
            value={prompt.difficulty} 
            onValueChange={handleDifficultyChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="難易度を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">初級</SelectItem>
              <SelectItem value="intermediate">中級</SelectItem>
              <SelectItem value="advanced">上級</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">言語/技術（任意）</Label>
          <Input
            id="language"
            placeholder="例: JavaScript, Python, React"
            value={prompt.language}
            onChange={(e) => handleInputChange('language', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetAudience">対象者（任意）</Label>
          <Input
            id="targetAudience"
            placeholder="例: プログラミング初心者、ビジネスマン"
            value={prompt.targetAudience}
            onChange={(e) => handleInputChange('targetAudience', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalInstructions">追加指示（任意）</Label>
          <Textarea
            id="additionalInstructions"
            placeholder="例: 実践的な例をたくさん含めてください。"
            value={prompt.additionalInstructions}
            onChange={(e) => handleInputChange('additionalInstructions', e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="w-full"
        >
          {loading ? '生成中...' : 'コンテンツを生成'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ContentGenerator;
