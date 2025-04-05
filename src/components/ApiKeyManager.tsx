import { useEffect } from 'react';
import { getOpenAIKey } from '@/services/openai';
import { toast } from '@/components/ui/use-toast';

// APIキーの設定状態を管理するコンポーネント
interface ApiKeyManagerProps {
  initialApiKey?: string;
}

const ApiKeyManager = ({ initialApiKey }: ApiKeyManagerProps) => {
  
  useEffect(() => {
    // APIキーの存在確認のみ行う
    const apiKey = getOpenAIKey();
    
    if (apiKey) {
      console.log('OpenAI APIキーが設定されています');
    } else {
      console.warn('OpenAI APIキーが設定されていません');
      toast({
        title: 'APIキーエラー',
        description: 'システム管理者にお問い合わせください',
        variant: 'destructive',
      });
    }
  }, [initialApiKey]);

  // ダイアログやボタンは表示せず、空のコンポーネントを返す
  return null;
};

export default ApiKeyManager; 