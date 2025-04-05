import { ModuleDetail, ModuleSection, LearningQuestion } from './openai';

/**
 * モジュール詳細のフォールバックコンテンツを生成する関数
 * 
 * @param moduleInfo モジュール基本情報
 * @returns フォールバックモジュール詳細
 */
export const generateFallbackModuleDetail = (
  moduleInfo: { 
    id: string; 
    title: string; 
    description: string; 
    learning_objectives?: string[];
  }
): ModuleDetail => {
  // 学習目標から簡単なコンテンツを生成
  const objectives = moduleInfo.learning_objectives || ['このモジュールを学ぶ'];
  
  // デフォルトのセクションを作成
  const sections: ModuleSection[] = [
    {
      id: 'intro',
      title: 'はじめに',
      content: `
このセクションでは、${moduleInfo.title}の基本的な概念を学びます。

${moduleInfo.description}

このモジュールの学習目標:
${objectives.map(obj => `- ${obj}`).join('\n')}
      `,
      summary: 'このセクションでは、モジュールの基本概念と学習目標を紹介しました。',
      keyPoints: [
        'コンテンツの生成に一時的な問題が発生しています',
        '基本的な情報のみ表示しています',
        '後ほど再試行することでより詳細なコンテンツが表示されるかもしれません'
      ]
    },
    {
      id: 'temp-content',
      title: '一時的なコンテンツ',
      content: `
申し訳ありませんが、現在このモジュールの詳細コンテンツは利用できません。
これは一時的な問題である可能性があります。

以下の対処法をお試しください:
1. 再読み込みボタンをクリックして、コンテンツの再生成を試みる
2. インターネット接続を確認する
3. しばらく待ってから再度アクセスする
4. 管理者に連絡する

この問題が解決しない場合は、ダッシュボードから別のモジュールを選択するか、後ほど再度お試しください。
      `,
      summary: 'このセクションはフォールバックコンテンツです。',
      keyPoints: [
        'これは一時的なコンテンツです',
        '実際のコンテンツ生成に問題が発生しました',
        '後ほど再試行してください'
      ]
    }
  ];

  // フォールバックモジュール詳細を返す
  return {
    id: moduleInfo.id,
    title: moduleInfo.title,
    description: moduleInfo.description,
    content: sections,
    difficulty: 'beginner',
    learningObjectives: objectives,
    prerequisites: ['特になし'],
    estimatedDuration: '15-30分',
    category: '一般',
    estimatedTime: 20,
    resources: [
      {
        title: 'フォールバックリソース',
        url: 'https://example.com',
        description: '一時的なリソースリンクです。',
        type: 'web',
        relevance: 1,
        tags: ['temporary']
      }
    ]
  };
};

/**
 * 練習問題のフォールバックコンテンツを生成する関数
 * 
 * @param moduleDetail モジュール詳細
 * @returns フォールバック練習問題
 */
export const generateFallbackQuestions = (
  moduleDetail: ModuleDetail
): LearningQuestion[] => {
  // モジュールタイトルから基本的な質問を生成
  const title = moduleDetail.title;
  const objectives = moduleDetail.learningObjectives || [];
  
  // 基本的な質問を作成
  return [
    {
      id: 'fallback-q1',
      question: `${title}の主な目的は何ですか？`,
      expectedAnswer: '特定の答えがありませんが、モジュールの説明に基づいて回答してください。',
      explanation: 'これはフォールバック質問です。コンテンツ生成に問題があったため、基本的な質問のみ表示しています。',
      hint: 'モジュールの説明を読み直してみてください',
      difficulty: 'beginner',
      category: 'general'
    },
    {
      id: 'fallback-q2',
      question: objectives.length > 0 
        ? `「${objectives[0]}」について、あなたの理解を説明してください。`
        : `このトピックについてあなたが知っていることを説明してください。`,
      expectedAnswer: '自由回答形式です。あなたの理解に基づいて回答してください。',
      explanation: 'これはフォールバック質問です。コンテンツ生成に問題があったため、基本的な質問のみ表示しています。',
      difficulty: 'beginner',
      category: 'comprehension'
    },
    {
      id: 'fallback-q3',
      question: 'このモジュールの学習後、どのようにしてこの知識を活用できると思いますか？',
      expectedAnswer: '自由回答形式です。あなたの考えを共有してください。',
      explanation: 'これはフォールバック質問です。コンテンツ生成に問題があったため、基本的な質問のみ表示しています。',
      difficulty: 'beginner',
      category: 'application'
    }
  ];
};

/**
 * チャットメッセージのフォールバックを生成する関数
 * 
 * @param sessionType セッションタイプ
 * @param errorMessage エラーメッセージ
 * @returns フォールバックメッセージ
 */
export const generateFallbackChatMessage = (
  sessionType: string,
  errorMessage?: string
): string => {
  const baseMessage = `
申し訳ありませんが、AI応答の生成中に問題が発生しました。

${errorMessage ? `エラー詳細: ${errorMessage}` : '一時的なシステムエラーが発生しました。'}

以下の対処法をお試しください:
1. もう一度質問を送信する
2. インターネット接続を確認する
3. しばらく待ってから再度試す
4. 別の質問で試してみる

ご不便をおかけして申し訳ありません。
`;

  // セッションタイプに基づいて追加メッセージを付加
  let additionalMessage = '';
  
  switch (sessionType) {
    case 'practice':
      additionalMessage = 'このセッションは練習用ですので、基本的な質問から始めてみてはいかがでしょうか。';
      break;
    case 'quiz':
      additionalMessage = 'クイズセッションでは、モジュール内容に関連する質問に挑戦できます。';
      break;
    case 'review':
      additionalMessage = 'このレビューセッションでは、学習内容の復習ができます。';
      break;
    case 'feedback':
      additionalMessage = 'フィードバックセッションでは、学習プロセスについての振り返りを行えます。';
      break;
  }

  return baseMessage + '\n' + additionalMessage;
};

/**
 * エラータイプに基づいてユーザーフレンドリーなメッセージを生成
 * 
 * @param error エラーオブジェクト
 * @returns ユーザーフレンドリーなエラーメッセージ
 */
export const getFriendlyErrorMessage = (error: any): string => {
  if (!error) {
    return '不明なエラーが発生しました。';
  }

  // エラーメッセージがある場合はそれを使用
  if (typeof error === 'string') {
    return error;
  }

  // エラーオブジェクトからメッセージを抽出
  const message = error.message || '不明なエラーが発生しました。';
  
  // API関連のエラーメッセージを判断
  if (message.includes('API key')) {
    return 'APIキー認証エラー：APIキーが無効か設定されていません。';
  } else if (message.includes('rate limit') || message.includes('quota')) {
    return 'API利用制限に達しました。しばらく待ってから再試行してください。';
  } else if (message.includes('timed out') || message.includes('timeout')) {
    return 'リクエストがタイムアウトしました。サーバーが混雑しているか、ネットワーク接続に問題がある可能性があります。';
  } else if (message.includes('network') || message.includes('connection')) {
    return 'ネットワーク接続エラー：インターネット接続を確認してください。';
  }
  
  // それ以外のエラーはそのまま表示
  return message;
}; 