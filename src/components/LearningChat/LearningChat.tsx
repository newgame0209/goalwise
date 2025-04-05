import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, Bot, User, AlertCircle, CheckCircle2, X, ChevronRight, ChevronLeft, History } from 'lucide-react';
import { useLearningChat, ChatSessionType } from './LearningChatState';
import { ModuleDetail, getOpenAIKey } from '@/services/openai';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from '@/components/ui/dialog';
import { Check, X as XIcon } from 'lucide-react';
import { getSessionTitle } from '@/lib/utils';

// タイピングインジケーターコンポーネント
const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-800">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
};

// チャットメッセージコンポーネント
interface ChatMessageProps {
  content: string;
  sender: 'user' | 'ai';
  isQuestion?: boolean;
  evaluation?: {
    isCorrect: boolean;
    score: number;
    feedback: string;
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ content, sender, isQuestion, evaluation }) => {
  const isAI = sender === 'ai';
  
  return (
    <div className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'} my-2`}>
      <div className={`flex max-w-[80%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className="flex-shrink-0 mt-1">
          <Avatar className={isAI ? 'bg-blue-100' : 'bg-green-100'}>
            <AvatarFallback>{isAI ? <Bot size={18} /> : <User size={18} />}</AvatarFallback>
            <AvatarImage src={isAI ? '/ai-avatar.png' : '/user-avatar.png'} />
          </Avatar>
        </div>
        
        <div className={`mx-2 ${isAI ? 'items-start' : 'items-end'}`}>
          <div className={`px-4 py-2 rounded-lg ${isAI 
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
            : 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100'} ${
            isQuestion ? 'border-l-4 border-blue-500' : ''
          }`}>
            <div className="whitespace-pre-wrap break-words">{content}</div>
          </div>
          
          {evaluation && (
            <div className="mt-2 text-sm">
              <Badge className={evaluation.isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                正解 ✓ {evaluation.score}点
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// APIキーステータスコンポーネント
const ApiKeyStatus = () => {
  const [hasKey, setHasKey] = useState(false);
  
  useEffect(() => {
    const apiKey = getOpenAIKey();
    setHasKey(!!apiKey);
  }, []);
  
  if (hasKey) {
    return (
      <div className="flex items-center text-xs text-green-600 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        <span>API接続完了</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center text-xs text-red-600 gap-1">
      <AlertCircle className="h-3 w-3" />
      <span>APIキー未設定</span>
    </div>
  );
};

// 回答履歴ダイアログコンポーネント
const AnswerHistoryDialog = () => {
  const { state } = useLearningChat();
  const [isOpen, setIsOpen] = useState(false);
  
  const hasAnswerHistory = state.activeSession?.answerHistory && state.activeSession.answerHistory.length > 0;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute top-4 right-16"
          disabled={!hasAnswerHistory}
          title={hasAnswerHistory ? "回答履歴を表示" : "回答履歴がありません"}
        >
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>回答履歴</DialogTitle>
          <DialogDescription>
            このセッションでの回答履歴を確認できます
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-4">
          {hasAnswerHistory ? (
            <div className="space-y-4">
              {state.activeSession.answerHistory.map((item, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="p-3 bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">
                        問題 {index + 1}/{state.activeSession?.answerHistory.length}
                      </div>
                      <Badge className={item.isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {item.isCorrect 
                          ? <Check className="h-3 w-3 mr-1" /> 
                          : <XIcon className="h-3 w-3 mr-1" />
                        }
                        {item.isCorrect ? "正解" : "不正解"}
                        {item.score !== undefined && ` (${item.score}/100)`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">問題:</div>
                        <div className="text-sm ml-1 mt-1">{item.question}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">あなたの回答:</div>
                        <div className="text-sm ml-1 mt-1 p-2 bg-muted rounded-md">{item.userAnswer}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">正解:</div>
                        <div className="text-sm ml-1 mt-1 p-2 bg-primary/10 rounded-md">{item.correctAnswer}</div>
                      </div>
                      {item.feedback && (
                        <div>
                          <div className="text-sm font-medium">フィードバック:</div>
                          <div className="text-sm ml-1 mt-1 p-2 border-l-2 border-primary">{item.feedback}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              回答履歴がありません
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// LearningChatコンポーネント
interface LearningChatProps {
  moduleDetail: ModuleDetail;
  sessionType?: ChatSessionType;
  isOpen?: boolean;
  onClose?: () => void;
}

const LearningChat: React.FC<LearningChatProps> = ({ 
  moduleDetail, 
  sessionType = 'practice',
  isOpen = true,
  onClose
}) => {
  const { 
    state, 
    startSession, 
    sendMessage,
    nextQuestion,
    completeSession 
  } = useLearningChat();
  
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const sessionTypes = ['practice', 'quiz', 'review', 'feedback'] as ChatSessionType[];
  const currentSessionTypeIndex = sessionTypes.indexOf(sessionType);
  
  // APIキーがあるかチェック
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  useEffect(() => {
    setApiKey(getOpenAIKey());
    
    if (!state.activeSession && isOpen && moduleDetail) {
      startSession(sessionType, moduleDetail);
    }
  }, [state.activeSession, isOpen, moduleDetail, startSession, sessionType]);
  
  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.activeSession?.messages]);
  
  // フォーカス
  useEffect(() => {
    if (inputRef.current && isOpen) {
      inputRef.current.focus();
    }
  }, [isOpen, state.isLoading]);
  
  // セッションタイプ切り替え
  const handleSessionTypeChange = (type: ChatSessionType) => {
    if (type !== sessionType) {
      startSession(type, moduleDetail);
    }
  };
  
  // 前のセッションタイプへ
  const handlePreviousSession = () => {
    if (currentSessionTypeIndex > 0) {
      const prevType = sessionTypes[currentSessionTypeIndex - 1];
      handleSessionTypeChange(prevType);
    }
  };
  
  // 次のセッションタイプへ
  const handleNextSession = () => {
    if (currentSessionTypeIndex < sessionTypes.length - 1) {
      const nextType = sessionTypes[currentSessionTypeIndex + 1];
      handleSessionTypeChange(nextType);
    }
  };
  
  const handleSendMessage = () => {
    if (inputValue.trim() && state.activeSession) {
      sendMessage(inputValue.trim(), !!state.activeSession.currentQuestion);
      setInputValue('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // APIキーエラー表示
  const renderApiKeyError = () => {
    if (!apiKey) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>APIキーが設定されていません</AlertTitle>
          <AlertDescription>
            OpenAI APIキーを設定してください。設定がない場合、チャット機能は利用できません。
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };
  
  // メッセージリストを取得
  const messages = state.activeSession?.messages || [];
  
  // クイズモードか判定
  const isQuizMode = state.activeSession?.currentQuestion !== undefined;
  
  // セッションタイトルを取得
  const sessionTitle = state.activeSession 
    ? state.activeSession.title
    : sessionType === 'practice' ? '練習問題' 
    : sessionType === 'quiz' ? '理解度クイズ'
    : sessionType === 'review' ? '復習セッション'
    : 'フィードバック';
  
  // アクティブなセッションがあるか
  const hasActiveSession = !!state.activeSession && !state.activeSession.progress.completed;
  
  return (
    <div className="flex flex-col h-full relative bg-card rounded-lg">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          {sessionTitle}
        </h3>
        <div className="flex items-center gap-2">
          <Tabs value={sessionType} className="hidden md:block">
            <TabsList>
              <TabsTrigger 
                value="practice"
                onClick={() => handleSessionTypeChange('practice')}
                disabled={state.isLoading}
              >
                練習問題
              </TabsTrigger>
              <TabsTrigger 
                value="quiz"
                onClick={() => handleSessionTypeChange('quiz')}
                disabled={state.isLoading}
              >
                クイズ
              </TabsTrigger>
              <TabsTrigger 
                value="review"
                onClick={() => handleSessionTypeChange('review')}
                disabled={state.isLoading}
              >
                復習
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              title="チャットを閉じる"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renderApiKeyError()}
        
        {messages.map((message, index) => (
          <ChatMessage key={message.id} content={message.content} sender={message.sender} isQuestion={message.isQuestion} evaluation={message.evaluation} />
        ))}
        
        {state.isLoading && (
          <div className="flex justify-center p-2">
            <TypingIndicator />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {hasActiveSession && (
        <CardFooter className="border-t p-3 flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isQuizMode ? '回答を入力してください...' : 'メッセージを入力...'}
            className="flex-1 px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={state.isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || state.isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </CardFooter>
      )}
      
      {/* セッション選択ボタン（モバイル用） */}
      <div className="md:hidden absolute bottom-20 right-4 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={() => handlePreviousSession()}
          disabled={state.isLoading || currentSessionTypeIndex <= 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={() => handleNextSession()}
          disabled={state.isLoading || currentSessionTypeIndex >= sessionTypes.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* 回答履歴ダイアログ */}
      <AnswerHistoryDialog />
    </div>
  );
};

export default LearningChat; 