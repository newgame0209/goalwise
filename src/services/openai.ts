import { toast } from '@/components/ui/use-toast';
import { AuthenticationError, NetworkError, OpenAIError } from '@/lib/errors';

// OpenAI APIに送信するプロンプトのためのタイプ定義
export interface ContentGenerationPrompt {
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  targetAudience?: string;
  additionalInstructions?: string;
  // プロファイル情報を追加
  profileData?: {
    goal?: string;
    timeframe?: string; 
    studyTime?: string;
    currentLevel?: string;
    learningStyle?: string[];
    motivation?: string;
    challenges?: string;
  };
}

// 生成されたコンテンツのセクションの型定義
export interface ContentSection {
  title: string;
  content: string;
  examples?: Array<{
    title: string;
    content: string;
  }>;
  summary?: string;
  keyPoints?: string[];
  questions?: Array<{
    question: string;
    hint?: string;
  }>;
}

// KPIツリーノードの型定義 - LearningPlanコンポーネントと一致させる
export interface PlanNode {
  id: string;
  title: string;
  description: string;
  children?: PlanNode[];
}

// 生成された教材の型定義
export interface GeneratedMaterial {
  id?: string;
  title: string;
  description: string;
  categories: string[];
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  author: string;
  publishedDate: string;
  content: ContentSection[];
  units: Array<{
    title: string;
    duration: string;
    completed: boolean;
  }>;
  // カリキュラム情報を追加
  curriculum?: {
    title: string;
    description: string;
    nodes: PlanNode[];
  };
}

// 学習用の質問の型定義
export interface LearningQuestion {
  id: string;
  question: string;
  expectedAnswer: string;  // 追加：期待される回答
  answer?: string;
  explanation?: string;
  hint?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;       // 追加：質問のカテゴリー
  tags?: string[];        // 追加：質問に関連するタグ
}

// ユーザー回答の評価結果の型定義
export interface AnswerEvaluation {
  isCorrect: boolean;
  score: number; // 0-100の評価スコア
  feedback: string;
  correctAnswer?: string;
  explanation?: string;
  furtherStudyTips?: string;
  timeSpent?: number;     // 追加：回答にかかった時間
  confidence?: number;    // 追加：ユーザーの自信度
}

// 回答履歴の型定義
export interface AnswerHistoryItem {
  id: string;
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  timestamp: Date | string;
  timeSpent: number;
  confidence?: number;
}

// 学習進捗の型定義
export interface LearningProgress {
  moduleId: string;
  completed: boolean;
  score: number;
  lastAccessed: Date;
  answerHistory: AnswerHistoryItem[];
  timeSpent: number;        // 追加：総学習時間
  retryCount: number;       // 追加：再試行回数
  masteryLevel: number;     // 追加：習熟度（0-100）
  currentSection?: string;  // 追加：現在のセクション
  completedSections: string[]; // 追加：完了したセクション
  lastQuestionId?: string;  // 追加：最後に回答した質問のID
}

// APIキー管理のための環境変数名
const OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key';
const ENCRYPT_SECRET = 'goalwise-learning-app-secret'; // 本番環境では環境変数から取得すべき

// 簡易暗号化関数
const encryptKey = (key: string): string => {
  if (!key) return '';
  
  try {
    // 非常に簡易的な暗号化（本番環境ではより強力な方法を使用すべき）
    return btoa(
      Array.from(key)
        .map((char, i) => 
          String.fromCharCode(char.charCodeAt(0) ^ ENCRYPT_SECRET.charCodeAt(i % ENCRYPT_SECRET.length))
        )
        .join('')
    );
  } catch (e) {
    console.error('暗号化エラー:', e);
    return '';
  }
};

// 復号化関数
const decryptKey = (encryptedKey: string): string => {
  if (!encryptedKey) return '';
  
  try {
    const decoded = atob(encryptedKey);
    return Array.from(decoded)
      .map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ ENCRYPT_SECRET.charCodeAt(i % ENCRYPT_SECRET.length))
      )
      .join('');
  } catch (e) {
    console.error('復号化エラー:', e);
    return '';
  }
};

// APIキーを安全に保存する関数
export const setOpenAIKey = (key: string) => {
  if (typeof window !== 'undefined') {
    const encryptedKey = encryptKey(key);
    localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, encryptedKey);
  }
};

// 保存されたAPIキーを取得する関数
export const getOpenAIKey = (): string => {
  // 環境変数からAPIキーを取得
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error('OpenAI APIキーが環境変数に設定されていません。VITE_OPENAI_API_KEY を確認してください。');
    toast({
      title: 'APIキー未設定',
      description: 'アプリケーションの設定に問題があります。管理者にお問い合わせください。',
      variant: 'destructive',
    });
    // APIキーがない場合は空文字列を返すか、エラーをスローするなど、適切な処理を行う
  return '';
  }
  return apiKey;
};

// プロファイル情報をプロンプトに組み込むヘルパー関数
const createProfileBasedSystemPrompt = (prompt: ContentGenerationPrompt) => {
  const profileData = prompt.profileData || {};
  
  const systemPrompt = `
あなたは優れた教育コンテンツ作成の専門家です。以下のユーザー情報をもとに、学習者に最適な教材コンテンツとカリキュラムを生成してください。

[ユーザー情報]
${profileData.goal ? `- 学習目的・ゴール: ${profileData.goal}` : ''}
${profileData.timeframe ? `- 学習期限: ${profileData.timeframe}` : ''}
${profileData.studyTime ? `- 1日に割ける勉強時間: ${profileData.studyTime}` : ''}
${profileData.currentLevel ? `- 現在のレベル: ${profileData.currentLevel}` : ''}
${profileData.learningStyle?.length ? `- 学習スタイルの好み: ${profileData.learningStyle.join(', ')}` : ''}
${profileData.motivation ? `- 学習者の動機/活用シーン: ${profileData.motivation}` : ''}
${profileData.challenges ? `- 苦手分野や障壁: ${profileData.challenges}` : ''}

教材作成の要件:
- 学習期限に合わせたスケジュールとマイルストーンを設定してください。
- 1日の学習時間に応じて学習内容のボリュームを調整してください。
- 学習者のレベルに合わせて、無理なく理解できるように基礎～応用まで段階的に組み立ててください。
- 学習スタイルの好みを考慮し、学習スタイルにマッチする教材や学習アクティビティを提示してください。
- 苦手分野や障壁を補うための補足説明や対策を盛り込み、つまずきを最小化するようにしてください。
- 適切な練習問題や演習、例題を通じて実践的な理解を深められるようにしてください。
- モジュール全体と各セクションごとに役立つ関連リソースを提供してください。

コンテンツは必ずJSON形式で返してください。マークダウンや装飾は全てHTMLタグを使用してください。

必須フィールドとJSONの構造:
{
  "title": "教材のタイトル",
  "description": "教材の簡潔な説明",
  "categories": ["カテゴリー1", "カテゴリー2"],
  "duration": "学習にかかる時間の目安 (例: '5時間')",
  "difficulty": "難易度 ('beginner', 'intermediate', 'advanced'のいずれか)",
  "author": "著者名",
  "publishedDate": "公開日",
  "content": [
    {
      "id": "セクションのユニークID",
      "title": "セクション1のタイトル",
      "content": "セクションの本文 (HTMLタグを使用)",
      "examples": [
        {
          "title": "例題のタイトル",
          "content": "例題の内容 (HTMLタグを使用)"
        }
      ],
      "summary": "セクションのまとめ (HTMLタグを使用)",
      "keyPoints": ["重要ポイント1", "重要ポイント2"],
      "questions": [
        {
          "question": "練習問題",
          "hint": "ヒント"
        }
      ],
      "resources": [
        {
          "title": "リソースのタイトル",
          "url": "リソースのURL",
          "description": "リソースの説明",
          "type": "リソースの種類 (documentation, tutorial, example, article, video, github, community, book, other)",
          "relevance": 数値で表された関連度 (0-100),
          "tags": ["タグ1", "タグ2"]
        }
      ]
    }
  ],
  "units": [
    {
      "title": "学習単元のタイトル",
      "duration": "単元の学習時間",
      "completed": false
    }
  ],
  "resources": [
    {
      "title": "リソースのタイトル",
      "url": "リソースのURL",
      "description": "リソースの説明",
      "type": "リソースの種類 (documentation, tutorial, example, article, video, github, community, book, other)",
      "relevance": 数値で表された関連度 (0-100),
      "tags": ["タグ1", "タグ2"]
    }
  ],
  "curriculum": {
    "title": "カリキュラムのタイトル",
    "description": "カリキュラムの説明",
    "nodes": [
      {
        "id": "node1",
        "title": "主要目標1",
        "description": "目標の説明",
        "children": [
          {
            "id": "node1-1",
            "title": "サブ目標1-1",
            "description": "サブ目標の説明",
            "children": []
          }
        ]
      }
    ]
  }
}

セクションは3〜5つ作成し、各セクションには例題、まとめ、重要ポイント、練習問題を含めてください。
各セクションと教材全体に関連する有用なリソース（公式ドキュメント、チュートリアル、サンプルコード、記事など）を必ず5-10個提供してください。
リソースには単なるリンクだけでなく、そのリソースの内容や参考にするべき理由なども含めてください。
カリキュラムのノード構造は、KPIツリーやマインドマップとして表示できるよう階層構造にしてください。
日本語で作成してください。`;

  return systemPrompt;
};

// OpenAI APIを使って教材コンテンツを生成する関数
export const generateMaterialContent = async (
  prompt: ContentGenerationPrompt
): Promise<GeneratedMaterial | null> => {
  const apiKey = getOpenAIKey();
  
  if (!apiKey) {
    toast({
      title: 'APIキーが設定されていません',
      description: 'OpenAI APIキーを設定してください',
      variant: 'destructive',
    });
    return null;
  }

  try {
    // プロファイル情報を組み込んだシステムプロンプトを生成
    const systemPrompt = createProfileBasedSystemPrompt(prompt);

    // ユーザープロンプト
    const userPrompt = `
以下の条件で教材コンテンツを作成してください:

タイトル: ${prompt.title}
説明: ${prompt.description}
難易度: ${prompt.difficulty}
${prompt.language ? `言語: ${prompt.language}` : ''}
${prompt.targetAudience ? `対象者: ${prompt.targetAudience}` : ''}
${prompt.additionalInstructions ? `追加指示: ${prompt.additionalInstructions}` : ''}

指定されたJSON形式で教材コンテンツを生成してください。`;

    // OpenAI APIにリクエスト
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '教材の生成に失敗しました');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('APIから有効な応答が返されませんでした');
    }

    // JSON文字列からオブジェクトへのパース
    try {
      const generatedContent = JSON.parse(content) as GeneratedMaterial;
      return generatedContent;
    } catch (parseError) {
      console.error('JSONのパースに失敗しました:', parseError);
      console.log('受信したコンテンツ:', content);
      throw new Error('生成されたコンテンツのパースに失敗しました');
    }
  } catch (error) {
    console.error('教材生成エラー:', error);
    toast({
      title: '教材の生成に失敗しました',
      description: error instanceof Error ? error.message : '不明なエラーが発生しました',
      variant: 'destructive',
    });
    return null;
  }
};

// カリキュラム構造のためのタイプ定義
export interface CurriculumStructure {
  title: string;
  description: string;
  estimated_duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  skills_covered: string[];
  modules: Array<{
    id: string;
    title: string;
    description: string;
    estimated_duration?: string;
    learning_objectives?: string[];
    units: Array<{
      id: string;
      title: string;
      type: UnitType; // 'lesson' | 'exercise' | 'quiz' | 'project'を含むUnitTypeに変更
      content_id?: string;
      completed?: boolean;
      content_summary?: string;
    }>;
  }>;
}

// ModuleSectionインターフェースにリソースフィールドを追加
export interface ModuleSection {
  id?: string;
  title: string;
  content: string;
  examples?: Array<{
    title: string;
    content: string;
  }>;
  summary?: string;
  keyPoints?: string[];
  questions?: Array<{
    question: string;
    hint?: string;
  }>;
  resources?: Array<{
    title?: string;
    url: string;
    description?: string;
    type?: string;
    relevance?: number;
    tags?: string[];
  }>;
}

// ModuleDetailインターフェースを追加
export interface ModuleDetail {
  id: string;
  title: string;
  description: string;
  content: ModuleSection[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives?: string[];
  prerequisites?: string[];
  estimatedDuration?: string;
  category?: string;
  estimatedTime?: number;
  resources?: Array<{
    title?: string;
    url: string;
    description?: string;
    type?: string;
    relevance?: number;
    tags?: string[];
  }>;
}

// カリキュラム生成のためのシステムプロンプト作成関数
const generateCurriculumSystemPrompt = (profileData: any) => {
  return `
あなたは教育カリキュラム設計の専門家です。以下のユーザープロファイルに基づいて、最適な学習カリキュラムを設計してください。

[ユーザー情報]
${profileData.goal ? `- 学習目的・ゴール: ${profileData.goal}` : ''}
${profileData.timeframe ? `- 学習期限: ${profileData.timeframe}` : ''}
${profileData.studyTime ? `- 1日に割ける勉強時間: ${profileData.studyTime}` : ''}
${profileData.currentLevel ? `- 現在のレベル: ${profileData.currentLevel}` : ''}
${profileData.learningStyle?.length ? `- 学習スタイルの好み: ${profileData.learningStyle.join(', ')}` : ''}
${profileData.motivation ? `- 学習者の動機/活用シーン: ${profileData.motivation}` : ''}
${profileData.challenges ? `- 苦手分野や障壁: ${profileData.challenges}` : ''}

カリキュラム設計の要件:
- 学習期限と1日の学習時間に合わせて、現実的なスケジュールを設計してください。
- 現在のレベルに合わせて、無理なく段階的に学習できる構造にしてください。
- 学習者の好みや動機に合わせて、学習内容と教材タイプを最適化してください。
- 苦手分野や障壁に配慮した補足説明やフォローアップを含めてください。
- モジュールとユニットを明確に構造化し、段階的な成長を促す構成にしてください。

カリキュラムは必ず以下のJSON形式で返してください:

{
  "title": "カリキュラムのタイトル",
  "description": "カリキュラムの簡潔な説明",
  "estimated_duration": "予想される学習期間（例：「8週間」）",
  "difficulty": "全体的な難易度（'beginner', 'intermediate', 'advanced'のいずれか）",
  "skills_covered": ["スキル1", "スキル2", ...],
      "modules": [
        {
      "id": "一意のモジュールID",
          "title": "モジュールのタイトル",
          "description": "モジュールの説明",
      "estimated_duration": "予想されるモジュール学習期間（例：「2週間」）",
      "learning_objectives": ["学習目標1", "学習目標2", ...],
      "units": [
        {
          "id": "一意のユニットID",
          "title": "ユニットのタイトル",
          "type": "ユニットタイプ（'lesson', 'exercise', 'quiz', 'project'のいずれか）",
          "content_id": "コンテンツを参照するためのID",
          "completed": false
        },
        ...
      ]
    },
    ...
  ]
}

必ずJSONのみを返してください。マークダウンや説明文は不要です。`;
};

// プロファイルデータに基づいてカリキュラム構造を生成する関数
export const generateCurriculumStructure = async (profileData: any): Promise<CurriculumStructure | null> => {
  console.log('カリキュラム生成リクエスト送信中...');
  
  try {
    // プロファイルデータをログに出力して確認
    console.log('プロファイルデータ:', JSON.stringify(profileData, null, 2));
    
    // プロファイルデータがない場合はダミーデータを使用
    if (!profileData || Object.keys(profileData).length === 0) {
      console.warn('プロファイルデータが空です。デフォルト値を使用します。');
      profileData = {
        goal: "HTML/CSSでポートフォリオサイトを作成する",
        timeframe: "3months",
        studyTime: "about_1hour",
        currentLevel: "beginner",
        learningStyle: ["visual", "text"],
        motivation: "Webデザインの基礎を学び、自分のポートフォリオサイトを作りたい",
        challenges: "テキストを読んでるだけだと中々頭に入らない"
      };
    }
    
    // OpenAI APIリクエスト用のプロンプト
    const prompt = `
以下のユーザープロファイルに基づいて、パーソナライズされた学習カリキュラムを作成してください。
レスポンスは必ず有効なJSONフォーマットで、下記のCurriculumStructure形式に従ってください。

ユーザープロファイル:
${JSON.stringify(profileData, null, 2)}

CurriculumStructure形式:
{
  "title": "カリキュラムのタイトル",
  "description": "カリキュラムの説明",
  "estimated_duration": "予想学習期間（例: '12週間'）",
  "difficulty": "難易度（beginner, intermediate, advancedのいずれか）",
  "skills_covered": ["スキル1", "スキル2", ...],
  "modules": [
    {
      "id": "module-1",
      "title": "モジュール1のタイトル",
      "description": "モジュールの説明",
      "units": [
        {
          "id": "unit-1-1",
          "title": "ユニット1のタイトル",
          "type": "ユニットタイプ（'lesson', 'exercise', 'quiz', 'project'のいずれか）",
          "content_summary": "ユニットの内容概要"
        }
      ]
    }
  ]
}

カリキュラムの内容:
1. 目標: ${profileData.goal || 'Web開発の基礎を学ぶ'}
2. 学習期間: ${profileData.timeframe || '3ヶ月'}
3. 1日の学習時間: ${profileData.studyTime || '1時間程度'}
4. 現在のレベル: ${profileData.currentLevel || '初心者'}
5. 学習スタイル: ${Array.isArray(profileData.learningStyle) ? profileData.learningStyle.join(', ') : 'ビジュアル学習、テキスト学習'}

重要: レスポンスは必ず上記のJSON形式に厳密に従って作成し、コメントや説明文を含めないでください。
`;

    // OpenAI APIの呼び出し
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getOpenAIKey()}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'あなたは教育カリキュラムを設計する専門家です。指定されたJSONフォーマットに厳密に従ってカリキュラムを生成してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" } // JSON形式の応答を明示的に要求
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI APIエラー:', errorData);
      throw new Error(`OpenAI APIエラー: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const responseData = await response.json();
    console.log('カリキュラム構造生成完了');
    
    try {
      let curriculumData;
      if (typeof responseData.choices[0].message.content === 'string') {
        // 文字列からJSONをパース
        curriculumData = JSON.parse(responseData.choices[0].message.content);
      } else {
        // 既にオブジェクトの場合はそのまま使用
        curriculumData = responseData.choices[0].message.content;
      }
      
      // JSONデータの検証
      if (!curriculumData.title || !curriculumData.modules || !Array.isArray(curriculumData.modules)) {
        console.error('生成されたカリキュラムデータが不正です:', curriculumData);
        throw new Error('カリキュラムデータの形式が不正です');
      }
      
      // モジュールIDの検証と追加（ない場合）
      curriculumData.modules.forEach((module: any, moduleIndex: number) => {
        if (!module.id) {
          module.id = `module-${moduleIndex + 1}`;
        }
        
        if (module.units && Array.isArray(module.units)) {
          module.units.forEach((unit: any, unitIndex: number) => {
            if (!unit.id) {
              unit.id = `unit-${moduleIndex + 1}-${unitIndex + 1}`;
            }
          });
        } else {
          module.units = [];
        }
      });
      
      return curriculumData as CurriculumStructure;
    } catch (parseError) {
      console.error('JSONのパースに失敗しました:', parseError);
      console.error('受信したコンテンツ:', responseData.choices[0].message.content);
      
      // フォールバックカリキュラムを返す
      return generateFallbackCurriculum(profileData);
    }
  } catch (error) {
    console.error('カリキュラム構造生成エラー:', error);
    
    // エラー発生時もフォールバックカリキュラムを返す
    return generateFallbackCurriculum(profileData);
  }
};

// フォールバックカリキュラムの生成
const generateFallbackCurriculum = (profileData: any): CurriculumStructure => {
  console.log('フォールバックカリキュラムを生成します');
  
  // ユーザーの学習目標を取得（大文字小文字を区別せず検索）
  const goal = profileData.goal || '';
  const goalLower = goal.toLowerCase();
  
  // 学習スタイルを取得
  const learningStyle = Array.isArray(profileData.learningStyle) 
    ? profileData.learningStyle.includes('visual') ? 'ビジュアル' : 'テキスト' 
    : 'ビジュアル';
    
  // レベルを取得
  const level = profileData.currentLevel === 'beginner' ? '初心者' 
    : profileData.currentLevel === 'intermediate' ? '中級者' 
    : profileData.currentLevel === 'advanced' ? '上級者' 
    : '初心者';
    
  // 目標に基づいてカリキュラムを生成
  if (goalLower.includes('react native') || goalLower.includes('スマホアプリ')) {
    return {
      title: `React Nativeでスマホアプリ開発を学ぶカリキュラム`,
      description: `${level}向けにReact Nativeの基礎から応用までを学び、実際にスマホアプリを開発するスキルを身につけます。`,
      estimated_duration: "12週間",
      difficulty: (profileData.currentLevel || "beginner") as "beginner" | "intermediate" | "advanced",
      skills_covered: ["JavaScript", "React", "React Native", "モバイルUI/UX", "API連携"],
      modules: [
        {
          id: "module-1",
          title: "JavaScriptとReact基礎",
          description: "React Nativeの基盤となるJavaScriptとReactの基礎を学びます。",
          units: [
            {
              id: "unit-1-1",
              title: "JavaScriptの基本構文と機能",
              type: "lesson" as UnitType,
              content_summary: "モダンJavaScriptの文法、関数、非同期処理について学習します。"
            },
            {
              id: "unit-1-2",
              title: "Reactの基本概念",
              type: "exercise" as UnitType,
              content_summary: "コンポーネント、Props、Stateなど、Reactの基本概念を演習を通じて学びます。"
            }
          ]
        },
        {
          id: "module-2",
          title: "React Native入門",
          description: "React Nativeの基本構造と主要コンポーネントを学びます。",
          units: [
            {
              id: "unit-2-1",
              title: "React Nativeの環境構築",
              type: "exercise" as UnitType,
              content_summary: "開発環境のセットアップとプロジェクト作成について学びます。"
            },
            {
              id: "unit-2-2",
              title: "基本コンポーネントと画面設計",
              type: "exercise" as UnitType,
              content_summary: "View, Text, Imageなどの基本コンポーネントとレイアウト設計を実践します。"
            }
          ]
        },
        {
          id: "module-3",
          title: "状態管理とナビゲーション",
          description: "React Nativeアプリの状態管理と画面遷移を実装します。",
          units: [
            {
              id: "unit-3-1",
              title: "React Navigation",
              type: "exercise" as UnitType,
              content_summary: "アプリ内の画面遷移とナビゲーション構造を実装します。"
            },
            {
              id: "unit-3-2",
              title: "状態管理ライブラリの活用",
              type: "lesson" as UnitType,
              content_summary: "ReduxやContext APIを使った状態管理の実装方法を学びます。"
            }
          ]
        },
        {
          id: "module-4",
          title: "APIとの連携",
          description: "外部APIとの連携方法を学びます。",
          units: [
            {
              id: "unit-4-1",
              title: "Fetch APIとAxios",
              type: "exercise" as UnitType,
              content_summary: "REST APIとの通信方法を実装します。"
            },
            {
              id: "unit-4-2",
              title: "非同期処理とデータキャッシュ",
              type: "exercise" as UnitType,
              content_summary: "非同期データの取得と効率的な管理方法を学びます。"
        }
      ]
    },
    {
          id: "module-5",
          title: "実践プロジェクト",
          description: "学んだスキルを活かして実際のアプリを開発します。",
          units: [
            {
              id: "unit-5-1",
              title: "アプリの設計と計画",
              type: "project" as UnitType,
              content_summary: "自分のアプリアイデアを企画し、設計します。"
            },
            {
              id: "unit-5-2",
              title: "アプリ開発と実装",
              type: "project" as UnitType,
              content_summary: "設計に基づいてアプリを実装します。"
            },
            {
              id: "unit-5-3",
              title: "デバッグとリファクタリング",
              type: "exercise" as UnitType,
              content_summary: "アプリの動作を確認し、コードを最適化します。"
            }
          ]
        }
      ]
    };
  } else if (goalLower.includes('flutter') || goalLower.includes('dart')) {
    return {
      title: `Flutterでクロスプラットフォームアプリ開発を学ぶカリキュラム`,
      description: `${level}向けにFlutterとDartを使用して、iOSとAndroid両方で動作するアプリ開発を学びます。`,
      estimated_duration: "12週間",
      difficulty: (profileData.currentLevel || "beginner") as "beginner" | "intermediate" | "advanced",
      skills_covered: ["Dart", "Flutter", "UI/UXデザイン", "状態管理", "API連携"],
      modules: [
        // Flutterに関する詳細モジュール（省略）
        {
          id: "module-1",
          title: "Dart言語入門",
          description: "Flutterの基盤となるDart言語の基礎を学びます。",
          units: [
            {
              id: "unit-1-1",
              title: "Dartの基本文法",
              type: "lesson" as UnitType,
              content_summary: "変数、制御構造、関数などDartの基本を学びます。"
            }
          ]
        },
        {
          id: "module-2",
          title: "Flutter基礎",
          description: "Flutterの基本概念とウィジェットについて学びます。",
          units: [
            {
              id: "unit-2-1",
              title: "Flutterの環境構築",
              type: "exercise" as UnitType,
              content_summary: "開発環境のセットアップと最初のアプリ作成。"
            }
          ]
        }
      ]
    };
  } else if (goalLower.includes('web') || goalLower.includes('frontend')) {
    return {
      title: `モダンフロントエンド開発を学ぶカリキュラム`,
      description: `${level}向けにHTML、CSS、JavaScriptからReactまでのフロントエンド開発技術を学びます。`,
      estimated_duration: "12週間",
      difficulty: (profileData.currentLevel || "beginner") as "beginner" | "intermediate" | "advanced",
      skills_covered: ["HTML", "CSS", "JavaScript", "React", "レスポンシブデザイン"],
      modules: [
        // Webフロントエンド開発に関するモジュール（省略）
        {
          id: "module-1",
          title: "HTML基礎",
          description: "HTMLの基礎を学び、ウェブページの構造を理解する。",
          units: [
            {
              id: "unit-1-1",
              title: "HTMLタグの基礎",
              type: "lesson" as UnitType,
              content_summary: "HTMLの基本的なタグと要素について学習します。"
            }
          ]
        }
      ]
    };
  } else {
    // デフォルトのカリキュラム（一般的なプログラミング入門）
    return {
      title: `${goalLower ? goal : 'プログラミング基礎'}を学ぶカリキュラム`,
      description: `${level}向けに${learningStyle}的な教材を活用して、${goalLower ? goal : 'プログラミングの基礎'}を学びます。`,
      estimated_duration: "12週間",
      difficulty: (profileData.currentLevel || "beginner") as "beginner" | "intermediate" | "advanced",
      skills_covered: ["プログラミング基礎", "問題解決", "アルゴリズム", "データ構造"],
      modules: [
        {
          id: "module-1",
          title: "プログラミング入門",
          description: "プログラミングの基本概念と考え方を学びます。",
          units: [
            {
              id: "unit-1-1",
              title: "プログラミングの基礎概念",
              type: "lesson" as UnitType,
              content_summary: "変数、データ型、制御構造などの基本を学びます。"
            }
          ]
        }
        // その他のモジュール（省略）
      ]
    };
  }
};

// ユーザープロファイル情報を考慮したシステムプロンプトの生成
const createPersonalizedPrompt = (module: any, profileData: any) => {
  if (!profileData) {
    return SYSTEM_PROMPT_MODULE_DETAIL; // プロファイルがない場合は既存プロンプトを使用
  }
  
  // パーソナライズされたプロンプトを生成
  return `
あなたは経験豊富な教材開発者です。以下のユーザープロファイルとモジュール情報に基づいて、
ユーザーにパーソナライズされた教材コンテンツを作成してください。

【ユーザープロファイル】
学習目的: ${profileData.goal || '不明'}
現在のスキルレベル: ${profileData.level || '初級者'}
興味のある分野: ${Array.isArray(profileData.interests) ? profileData.interests.join(', ') : '不明'}
学習スタイル: ${Array.isArray(profileData.learningStyle) ? profileData.learningStyle.join(', ') : '不明'}
学習に割ける時間: ${profileData.timeCommitment || '不明'}
苦手な分野/課題: ${profileData.challenges || '特になし'}

上記のプロファイルを考慮したカスタマイズポイント:
1. ${profileData.level || '初級者'}レベルに適した説明の詳しさと例示
2. ${profileData.goal || '学習'}に関連する実用的で具体的な例
3. ${Array.isArray(profileData.interests) && profileData.interests.length > 0 
     ? profileData.interests.join('と') + 'に関連した例や応用' 
     : '実践的な例や応用'}
4. ${profileData.timeCommitment === 'low' 
     ? '短時間で効率的に学べるよう、簡潔かつ要点を絞ったコンテンツ' 
     : profileData.timeCommitment === 'high' 
       ? '深く詳細な学習ができる充実したコンテンツ' 
       : 'バランスの取れた学習コンテンツ'}
5. ${profileData.challenges ? profileData.challenges + 'に配慮した丁寧な説明' : '基本概念の丁寧な説明'}

教材コンテンツは、以下の要素を含む必要があります:
1.  **概要説明(content)**: モジュールの主要な概念やトピックを詳細に解説します。コード例や図解も適宜含めてください。
2.  **具体例(examples)**: 理解を助けるための具体的なコード例やシナリオを複数提示してください。
3.  **要約(summary)**: モジュールの重要なポイントを簡潔にまとめてください。
4.  **キーポイント(keyPoints)**: 学習者が記憶すべき重要な用語や概念をリストアップしてください。
5.  **練習問題(questions)**: 理解度を確認するための練習問題をいくつか作成してください。ヒントも添えてください。
6.  **関連リソース(resources)**: さらに学習を深めるための高品質な外部リソース（ドキュメント、チュートリアル、記事など）を複数紹介してください。URL、タイトル、簡単な説明を含めてください。

レスポンスは必ず以下のJSON形式に従ってください:
{
  "title": "モジュールのタイトル",
  "description": "モジュールの詳細な説明",
  "learningObjectives": ["学習目標1", "学習目標2"],
  "prerequisites": ["前提知識1", "前提知識2"],
  "estimatedDuration": "学習時間の目安 (例: '2時間')",
  "difficulty": "難易度 ('beginner', 'intermediate', 'advanced')",
  "category": "カテゴリ",
  "content": [
    {
      "id": "section-1",
      "title": "セクション1のタイトル",
      "content": "セクション1の本文 (HTML形式可)",
      "examples": [
        {"title": "例1", "content": "例1の内容 (コードブロック等)"}
      ],
      "summary": "セクション1の要約",
      "keyPoints": ["キーポイント1", "キーポイント2"],
      "questions": [
        {"question": "練習問題1", "hint": "ヒント1"}
      ],
      "resources": [
        {"title": "リソース1", "url": "URL", "description": "説明"}
      ]
    }
    // ... 他のセクション ...
  ]
}

マークダウンや説明文は含めず、JSONオブジェクトのみを返してください。
`;
};

// モジュール詳細情報を生成するための関数
export const generateModuleDetail = async (
  curriculumModule: any,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onProgress?: (status: string, progress: number, estimatedTime?: number) => void;
    userProfile?: any; // ユーザープロファイル情報を追加
  } = {}
): Promise<ModuleDetail> => {
  const { maxRetries = 3 } = options;
  let { retryDelay = 1000 } = options;
  const { onProgress, userProfile } = options;
  let retries = 0;
  
  // 進捗状況を報告するヘルパー関数
  const updateProgress = (status: string, progress: number, estimatedTime?: number) => {
    if (onProgress) {
      onProgress(status, progress, estimatedTime);
    }
  };
  
  // 開始を通知
  updateProgress("モジュール詳細の生成を準備中...", 5, 120); // 120秒目安

  while (retries <= maxRetries) {
    try {
      updateProgress("AIエンジンに接続中...", 10, 115);
      
      // OpenAI APIのパラメータを設定
      const params = {
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: createPersonalizedPrompt(curriculumModule, userProfile) 
          },
          {
            role: "user",
            content: JSON.stringify({
              moduleTitle: curriculumModule.title,
              moduleDescription: curriculumModule.description,
              learningGoals: curriculumModule.learning_objectives || [],
              moduleId: curriculumModule.id,
              // 必要に応じて追加のメタデータを含める
              difficulty: curriculumModule.difficulty || "intermediate",
              // カリキュラム全体のコンテキスト情報を追加
              curriculumContext: {
                title: curriculumModule.curriculum_title || '',
                description: curriculumModule.curriculum_description || '',
                modulePosition: curriculumModule.module_index || 0,
                totalModules: curriculumModule.total_modules || 1,
                previousModule: curriculumModule.previous_module || null,
                nextModule: curriculumModule.next_module || null
              }
            })
          }
        ],
        temperature: 0.6, // 創造性と具体性のバランス
        max_tokens: 4000, // 長いコンテンツに対応
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        response_format: { type: "json_object" }
      };
      
      updateProgress("モジュール内容を生成中...", 25, 90);
      
      // APIリクエストの開始時間を記録
      const startTime = Date.now();
      
      // OpenAI APIを呼び出し
      const result = await fetchChatCompletion(params.messages, {
        model: params.model,
        temperature: params.temperature,
        maxTokens: params.max_tokens,
        responseFormat: params.response_format,
        maxRetries: 0, // fetchChatCompletion側でリトライ
        timeout: 120000 // 2分のタイムアウト設定
      });
      
      // 処理にかかった時間を計算
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      updateProgress("生成されたコンテンツを処理中...", 75, Math.max(20, elapsedTime * 0.2));
      
      // APIレスポンスをパース
      if (result && typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          
          // 基本的な検証を行う
          if (!parsed.title || !parsed.description || !parsed.content || !Array.isArray(parsed.content)) {
            console.error('モジュール詳細のレスポンスにデータが不足しています:', parsed);
            throw new Error('モジュール詳細のレスポンスにデータが不足しています');
          }
          
          updateProgress("コンテンツの最終調整中...", 90, 10);
          
          // IDと生成日時を追加
          const moduleDetail: ModuleDetail = {
            ...parsed,
            id: curriculumModule.id || `gen_${Date.now()}`,
            // 他に必要なデフォルト値や変換があればここで行う
            // generatedAt: new Date().toISOString() // 必要なら追加
          };
          
          // TODO: より詳細な検証ロジック (例: 各セクションの内容確認など)
          
          updateProgress("モジュール詳細の生成が完了しました", 100, 0);
          console.log("生成されたモジュール詳細:", moduleDetail);
          return moduleDetail;

        } catch (parseError) {
          console.error('APIレスポンスのJSONパースに失敗しました:', parseError);
          console.error('受信したコンテンツ:', result);
          throw new Error('APIレスポンスのJSONパースに失敗しました');
        }
      } else {
        console.error('APIレスポンスが空または不正な形式です');
        throw new Error('APIレスポンスが空または不正な形式です');
      }
    } catch (error) {
        retries++;
        console.error(`モジュール詳細の生成エラー (リトライ ${retries}/${maxRetries}):`, error);
        
        // 最大リトライ回数に達した場合
        if (retries > maxRetries) {
          updateProgress("モジュール詳細の生成に失敗しました", 100, 0);
          throw error;
        }
        
        // リトライの前に遅延
        const delay = retryDelay * Math.pow(1.5, retries); // 指数バックオフ
        updateProgress(`エラーが発生しました。リトライ中 (${retries}/${maxRetries})...`, 
          15 + (retries * 10), delay / 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // リトライごとに遅延を増加
        retryDelay = delay;
    }
  }
  
  // ここには到達しないはずだが、TypeScriptの型チェックを満たすために追加
  throw new Error('モジュール詳細の生成に失敗しました');
};

// ユーザーの回答を評価する関数
export const evaluateUserAnswer = async (
  question: LearningQuestion,
  userAnswer: string
): Promise<AnswerEvaluation> => {
  const apiKey = getOpenAIKey();
  
  if (!apiKey) {
    toast({
      title: 'APIキーが設定されていません',
      description: 'OpenAI APIキーを設定してください',
      variant: 'destructive',
    });
    return {
      isCorrect: false,
      score: 0,
      feedback: 'APIキーが設定されていないため、回答を評価できません。',
    };
  }

  try {
    // システムプロンプト
    const systemPrompt = `
あなたは教育内容の評価を行う専門家です。学習者の回答を評価し、フィードバックを提供してください。

公平かつ正確に評価を行い、建設的なフィードバックを提供することが重要です。
評価は単に正誤だけでなく、理解度や深さも考慮してください。
部分的に正しい回答や、異なるアプローチでも正しい回答は適切に評価してください。

評価結果は以下のJSON形式で返してください:

{
  "isCorrect": true/false,
  "score": 0-100の数値,
  "feedback": "回答に対するフィードバック",
  "correctAnswer": "正解または模範解答",
  "explanation": "解答の詳細な説明",
  "furtherStudyTips": "さらなる学習のためのアドバイス"
}

必ずJSONのみを返してください。マークダウンや説明文は不要です。`;

    // ユーザープロンプト
    const userPrompt = `
以下の質問と回答を評価してください：

質問: ${question.question}
${question.hint ? `ヒント: ${question.hint}` : ''}
模範解答: ${question.answer || ''}
${question.explanation ? `解説: ${question.explanation}` : ''}

学習者の回答:
${userAnswer}

指定されたJSON形式で評価結果を返してください。`;

    console.log(`回答評価リクエスト送信中... (${question.id})`);
    
    // OpenAI APIにリクエスト
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // より客観的な評価のために低めの温度設定
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || '回答評価に失敗しました');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('APIから有効な応答が返されませんでした');
    }

    // JSON文字列からオブジェクトへのパース
    try {
      console.log(`回答評価完了 (${question.id})`);
      return JSON.parse(content) as AnswerEvaluation;
    } catch (parseError) {
      console.error('JSONのパースに失敗しました:', parseError);
      console.log('受信したコンテンツ:', content);
      throw new Error('評価結果のパースに失敗しました');
    }
  } catch (error) {
    console.error('回答評価エラー:', error);
    toast({
      title: '回答評価エラー',
      description: error instanceof Error ? error.message : '不明なエラーが発生しました',
      variant: 'destructive',
    });
    return {
      isCorrect: false,
      score: 0,
      feedback: 'エラーが発生したため、回答を正確に評価できませんでした。もう一度お試しください。',
    };
  }
};

// 会話履歴のメッセージの型定義
export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

// 会話応答生成のオプション
export interface ConversationOptions {
  moduleDetail?: ModuleDetail;
  userProfile?: any;
  maxTokens?: number;
  temperature?: number;
  contextLength?: number;
  includeReferences?: boolean;
}

/**
 * 会話履歴を考慮した応答を生成する関数
 * @param messages 会話履歴のメッセージ配列
 * @param options 応答生成のオプション
 * @returns 生成された応答テキスト
 */
export const generateConversationalResponse = async (
  messages: ChatHistoryMessage[],
  options: ConversationOptions = {}
): Promise<string> => {
  console.log('Generating conversational response with options:', options);
  
  try {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }

    // モジュールの詳細情報がある場合はシステムメッセージに追加
    const systemMessage: ChatHistoryMessage = {
      role: 'system',
      content: `あなたは学習支援AIアシスタントです。ユーザーの質問に対して、簡潔で分かりやすい回答を提供してください。`
    };
    
    if (options.moduleDetail) {
      const { title, description, content } = options.moduleDetail;
      const contentSummary = content.map(section => 
        `${section.title}: ${section.content.substring(0, 100)}...`
      ).join('\n');
      
      systemMessage.content = `
あなたは学習支援AIアシスタントです。以下の教材内容に基づいて、ユーザーの質問に回答してください。

教材タイトル: ${title}
教材説明: ${description}
教材内容の概要:
${contentSummary}

ユーザーの質問に対して、上記の教材内容に基づいて簡潔で分かりやすい回答を提供してください。
教材の内容に含まれていない情報については、「教材の範囲を超える内容です」と伝えてください。
`;
    }
    
    // ユーザープロファイルがある場合は学習レベルを考慮
    if (options.userProfile) {
      const { currentLevel, learningStyle } = options.userProfile;
      
      if (currentLevel || learningStyle) {
        systemMessage.content += `\n
${currentLevel ? `ユーザーの学習レベル: ${currentLevel}` : ''}
${learningStyle ? `ユーザーの学習スタイル: ${learningStyle.join(', ')}` : ''}

ユーザーの学習レベルと学習スタイルに合わせて回答を調整してください。
`;
      }
    }
    
    // 会話履歴の前処理
    let processedMessages = [systemMessage];
    
    // コンテキスト長の制限がある場合は、直近のメッセージを優先
    const contextLength = options.contextLength || 10;
    if (messages.length > contextLength) {
      processedMessages = [...processedMessages, ...messages.slice(-contextLength)];
    } else {
      processedMessages = [...processedMessages, ...messages];
    }
    
    // OpenAI APIリクエスト
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: processedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API エラー: ${error.error?.message || 'レスポンスの取得に失敗しました'}`);
    }
    
    const result = await response.json();
    const generatedText = result.choices[0]?.message?.content || '';
    
    // 関連参照を含める場合
    if (options.includeReferences && options.moduleDetail) {
      const relevantReferences = findRelevantReferences(
        messages[messages.length - 1].content,
        options.moduleDetail
      );
      
      if (relevantReferences.length > 0) {
        const referencesText = formatReferences(relevantReferences);
        return `${generatedText}\n\n参考情報:\n${referencesText}`;
      }
    }
    
    return generatedText;
  } catch (error) {
    console.error('Error generating conversational response:', error);
    if (error instanceof Error) {
      throw new Error(`会話応答の生成に失敗しました: ${error.message}`);
    }
    throw new Error('会話応答の生成に失敗しました');
  }
};

/**
 * モジュール内容から関連する参照情報を検索する関数
 * @param query ユーザーのクエリ
 * @param moduleDetail モジュールの詳細情報
 * @returns 関連する参照情報の配列
 */
const findRelevantReferences = (query: string, moduleDetail: ModuleDetail) => {
  // モジュール全体のリソース
  const moduleResources = moduleDetail.resources || [];
  
  // 各セクションのリソース
  const sectionResources = moduleDetail.content
    .flatMap(section => section.resources || [])
    .filter(Boolean);
  
  // すべてのリソースを結合
  const allResources = [...moduleResources, ...sectionResources];
  
  // クエリに関連するリソースをフィルタリング
  // ここでは単純なキーワードマッチングを使用
  // 実際の実装では、より高度なセマンティックマッチングを使用することが望ましい
  const keywords = query.toLowerCase().split(/\s+/);
  
  return allResources
    .filter(resource => {
      const resourceText = `${resource.title} ${resource.description} ${resource.tags?.join(' ') || ''}`.toLowerCase();
      return keywords.some(keyword => resourceText.includes(keyword));
    })
    .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
    .slice(0, 3); // 上位3件に制限
};

/**
 * 参照情報を整形する関数
 * @param references 参照情報の配列
 * @returns 整形された参照テキスト
 */
const formatReferences = (references: any[]) => {
  return references.map(ref => 
    `- ${ref.title}: ${ref.description} ${ref.url ? `[${ref.url}]` : ''}`
  ).join('\n');
};

/**
 * モジュール内容に基づいた詳細な説明を生成する関数
 * @param topic 説明するトピック
 * @param moduleDetail モジュールの詳細情報
 * @param options 生成オプション
 * @returns 生成された詳細説明
 */
export const generateDetailedExplanation = async (
  topic: string,
  moduleDetail: ModuleDetail,
  options: {
    detailLevel?: 'basic' | 'intermediate' | 'advanced';
    includeExamples?: boolean;
    includeCode?: boolean;
    maxLength?: number;
    userProfile?: any;
  } = {}
): Promise<{
  explanation: string;
  examples?: Array<{ title: string; content: string }>;
  relatedTopics?: string[];
  resources?: any[];
}> => {
  console.log(`Generating detailed explanation for topic: ${topic}`);
  
  try {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }
    
    // トピックに関連する情報をモジュールから抽出
    const relevantSections = findRelevantSections(topic, moduleDetail);
    
    // 詳細レベルの設定
    const detailLevel = options.detailLevel || 'intermediate';
    
    // システムプロンプトの構築
    const systemPrompt = `
あなたは優れた教育コンテンツの専門家です。以下の教材内容に基づいて、特定のトピックについての詳細な説明を提供してください。

教材タイトル: ${moduleDetail.title}
教材説明: ${moduleDetail.description}

説明するトピック: ${topic}

詳細レベル: ${detailLevel}
例を含める: ${options.includeExamples ? 'はい' : 'いいえ'}
コードを含める: ${options.includeCode ? 'はい' : 'いいえ'}

以下の関連セクションの情報を活用してください:
${relevantSections.map(section => `
## ${section.title}
${section.content.substring(0, 500)}...
`).join('\n')}

${options.userProfile ? `
ユーザー情報:
- 学習レベル: ${options.userProfile.currentLevel || '未指定'}
- 学習スタイル: ${options.userProfile.learningStyle?.join(', ') || '未指定'}
- 学習目的: ${options.userProfile.goal || '未指定'}

上記のユーザー情報に合わせて説明を調整してください。
` : ''}

トピックについての詳細な説明を提供してください。以下のJSON形式で回答してください:

{
  "explanation": "トピックの詳細な説明",
  "examples": [
    {"title": "例のタイトル", "content": "例の内容"}
  ],
  "relatedTopics": ["関連トピック1", "関連トピック2"],
          "resources": [
    {"title": "リソースのタイトル", "url": "URL", "description": "説明"}
  ]
}

説明は明確で簡潔にし、技術的な専門用語を使用する場合は必ず説明を加えてください。
`;
    
    // OpenAI APIリクエスト
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `「${topic}」について詳しく説明してください。` }
        ],
        max_tokens: options.maxLength || 1000,
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API エラー: ${error.error?.message || 'レスポンスの取得に失敗しました'}`);
    }
    
    const result = await response.json();
    const generatedResponse = result.choices[0]?.message?.content || '';
    
    try {
      // JSONレスポンスの解析
      const parsedResponse = JSON.parse(generatedResponse);
      return {
        explanation: parsedResponse.explanation || '',
        examples: parsedResponse.examples || [],
        relatedTopics: parsedResponse.relatedTopics || [],
        resources: parsedResponse.resources || []
      };
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      // JSONの解析に失敗した場合は、テキストをそのまま返す
      return {
        explanation: generatedResponse,
        examples: [],
        relatedTopics: [],
        resources: []
      };
    }
  } catch (error) {
    console.error('Error generating detailed explanation:', error);
    if (error instanceof Error) {
      throw new Error(`詳細説明の生成に失敗しました: ${error.message}`);
    }
    throw new Error('詳細説明の生成に失敗しました');
  }
};

/**
 * トピックに関連するセクションをモジュールから検索する関数
 * @param topic 検索するトピック
 * @param moduleDetail モジュールの詳細情報
 * @returns 関連するセクションの配列
 */
const findRelevantSections = (topic: string, moduleDetail: ModuleDetail) => {
  const keywords = topic.toLowerCase().split(/\s+/);
  
  // モジュールの全セクションから関連するものをフィルタリング
  return moduleDetail.content
    .filter(section => {
      const sectionText = `${section.title} ${section.content}`.toLowerCase();
      return keywords.some(keyword => sectionText.includes(keyword));
    })
    .slice(0, 3); // 上位3件に制限
};

/**
 * ユーザーの理解度に合わせて説明レベルを調整する関数
 * @param explanation 元の説明テキスト
 * @param userLevel ユーザーの理解レベル
 * @param options 調整オプション
 * @returns 調整された説明テキスト
 */
export const adjustExplanationLevel = async (
  explanation: string,
  userLevel: 'beginner' | 'intermediate' | 'advanced',
  options: {
    simplifyTerms?: boolean;
    includeBackground?: boolean;
    focusOnPractical?: boolean;
  } = {}
): Promise<string> => {
  console.log(`Adjusting explanation for user level: ${userLevel}`);
  
  try {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      throw new Error('OpenAI APIキーが設定されていません');
    }
    
    // ユーザーレベルに応じたプロンプト作成
    let levelPrompt = '';
    
    if (userLevel === 'beginner') {
      levelPrompt = `
以下の説明は、プログラミングの初心者向けに調整してください。
- 専門用語は極力避け、使用する場合は必ず簡単な言葉で説明を加えてください。
- 複雑な概念は簡単な比喩や例えを使って説明してください。
- 基本的な背景知識を提供してください。
- ステップバイステップの説明を心がけてください。
- 実践的な例を多く含めてください。
`;
    } else if (userLevel === 'intermediate') {
      levelPrompt = `
以下の説明は、プログラミングの中級者向けに調整してください。
- 専門用語は適度に使用し、必要に応じて説明を加えてください。
- やや複雑な概念も説明に含めても構いませんが、理解しやすい例を添えてください。
- 基本的な知識は前提とし、より深い洞察を提供してください。
- 実践的な応用例と理論的背景のバランスを取ってください。
`;
    } else if (userLevel === 'advanced') {
      levelPrompt = `
以下の説明は、プログラミングの上級者向けに調整してください。
- 専門用語や高度な概念を躊躇せずに使用してください。
- 深い技術的な詳細と理論的背景を提供してください。
- 高度な最適化テクニックや設計パターンにも触れてください。
- エッジケースや性能考慮事項についても言及してください。
- 実装の選択肢と各アプローチのトレードオフを説明してください。
`;
    }
    
    // オプションに基づく追加指示
    let additionalInstructions = '';
    
    if (options.simplifyTerms) {
      additionalInstructions += '- 専門用語を可能な限り簡略化し、平易な言葉で言い換えてください。\n';
    }
    
    if (options.includeBackground) {
      additionalInstructions += '- トピックの背景情報や基礎知識を含めてください。\n';
    }
    
    if (options.focusOnPractical) {
      additionalInstructions += '- 理論よりも実践的な応用例に重点を置いてください。\n';
    }
    
    // システムプロンプトの構築
    const systemPrompt = `
あなたは優れた教育コンテンツの編集者です。以下の説明文をユーザーの理解レベルに合わせて調整してください。

${levelPrompt}

追加の指示:
${additionalInstructions}

元の説明文を変更する際は、以下の点に注意してください:
- 内容の正確性を保ちながら、表現を調整してください。
- 説明の流れや論理的構造を維持してください。
- 重要な情報は削除せず、必要に応じて言い換えてください。
- 文章量はあまり増やさないようにしてください。
`;
    
    // OpenAI APIリクエスト
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: explanation }
        ],
        max_tokens: 1500,
        temperature: 0.4
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API エラー: ${error.error?.message || 'レスポンスの取得に失敗しました'}`);
    }
    
    const result = await response.json();
    return result.choices[0]?.message?.content || explanation;
  } catch (error) {
    console.error('Error adjusting explanation level:', error);
    if (error instanceof Error) {
      throw new Error(`説明レベルの調整に失敗しました: ${error.message}`);
    }
    throw new Error('説明レベルの調整に失敗しました');
  }
};

/**
 * ユーザーの理解度を判定する関数
 * @param userResponses ユーザーの回答履歴
 * @param moduleDetail モジュールの詳細情報
 * @returns 推定されたユーザーの理解レベル
 */
export const estimateUserUnderstandingLevel = (
  userResponses: AnswerHistoryItem[],
  moduleDetail: ModuleDetail
): 'beginner' | 'intermediate' | 'advanced' => {
  // 正答率の計算
  const correctAnswers = userResponses.filter(item => item.isCorrect).length;
  const totalAnswers = userResponses.length;
  const correctRatio = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;
  
  // 回答時間の平均（秒）
  const avgTimeSpent = userResponses.reduce((sum, item) => sum + item.timeSpent, 0) / (totalAnswers || 1);
  
  // 回答の複雑さスコア（0-10）
  // この実装は簡略化されています。実際の実装ではより複雑な分析が必要かもしれません。
  const complexityScore = userResponses.reduce((sum, item) => {
    // 長い回答ほど複雑と見なす（単純な例）
    const length = item.userAnswer.length;
    return sum + Math.min(length / 100, 10);
  }, 0) / (totalAnswers || 1);
  
  // モジュールの難易度
  const moduleDifficulty = moduleDetail.difficulty || 'intermediate';
  
  // 各要素に基づいてレベルを判定
  if (correctRatio >= 0.8 && avgTimeSpent < 60 && complexityScore > 5) {
    return 'advanced';
  } else if (correctRatio >= 0.6 && avgTimeSpent < 120) {
    return 'intermediate';
  } else {
    return 'beginner';
  }
};

/**
 * OpenAI Chat Completionを実行する共通関数
 * @param messages チャットメッセージの配列
 * @param options オプションパラメータ
 * @returns 生成されたテキスト
 */
export const fetchChatCompletion = async (
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: string };
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number; // タイムアウト時間（ミリ秒）
  } = {}
): Promise<string> => {
  const apiKey = getOpenAIKey();
  
  if (!apiKey) {
    throw new AuthenticationError('OpenAI APIキーが設定されていません');
  }

  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;
  const timeout = options.timeout ?? 120000; // デフォルトタイムアウト: 2分

  let lastError: Error | null = null;
  let retries = 0;

  while (retries <= maxRetries) {
    try {
      // 初回以外はリトライメッセージをログに記録
      if (retries > 0) {
        console.log(`OpenAI API リクエストのリトライ ${retries}/${maxRetries}...`);
      }

      // タイムアウト処理付きのfetchリクエスト
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        console.log('OpenAI APIリクエスト送信開始:', {
          model: options.model || 'gpt-4o',
          messageCount: messages.length,
          timeout: `${timeout/1000}秒`
        });
        
        // OpenAI APIリクエスト
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: options.model || 'gpt-4o',
            messages: messages,
            max_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
            response_format: options.responseFormat,
          }),
          signal: controller.signal
        });
        
        // タイムアウトタイマーをクリア
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('OpenAI API Error:', errorData);
          
          // エラーコードに基づいて適切なエラーを生成
          if (response.status === 401) {
            throw new AuthenticationError('APIキーが無効か認証に失敗しました');
          } else if (response.status === 429) {
            throw new OpenAIError('APIレート制限を超えました。しばらく待ってから再試行してください', 'rate_limit_exceeded');
          } else if (response.status >= 500) {
            throw new NetworkError(`OpenAI APIサーバーエラー: ${errorData.error?.message || '不明なエラー'}`);
          } else {
            throw new OpenAIError(`OpenAI APIエラー: ${errorData.error?.message || 'レスポンスの取得に失敗しました'}`, errorData.error?.code);
          }
        }
        
        const result = await response.json();
        console.log('OpenAI APIリクエスト成功:', {
          model: options.model || 'gpt-4o',
          tokens: result.usage?.total_tokens || '不明',
          responseLength: result.choices?.[0]?.message?.content?.length || 0
        });
        
        return result.choices[0]?.message?.content || '';
      } catch (fetchError) {
        // AbortControllerによるタイムアウトの場合
        if (fetchError.name === 'AbortError') {
          throw new Error(`OpenAI APIリクエストがタイムアウトしました (${timeout/1000}秒)`);
        }
        throw fetchError;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error(`Error in fetchChatCompletion (attempt ${retries + 1}/${maxRetries + 1}):`, error);
      
      lastError = error instanceof Error ? error : new Error(String(error));

      // リトライ可能なエラーかどうか判断
      const shouldRetry = 
        (error instanceof NetworkError) || 
        (error instanceof OpenAIError && error.code === 'rate_limit_exceeded') ||
        (error instanceof Error && error.message.includes('fetch failed')) ||
        // タイムアウトエラーもリトライ対象に含める
        (error instanceof Error && error.message.includes('タイムアウト'));

      // 最大リトライ回数に達した、またはリトライできないエラーの場合
      if (retries >= maxRetries || !shouldRetry) {
        break;
      }
      
      // リトライ前に待機（指数バックオフを適用）
      const delay = retryDelay * Math.pow(2, retries);
      console.log(`${delay}ms後にリトライします...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retries++;
    }
  }

  // すべてのリトライが失敗した場合
  if (lastError instanceof Error) {
    if (lastError instanceof OpenAIError || lastError instanceof NetworkError || lastError instanceof AuthenticationError) {
      throw lastError;
    }
    throw new OpenAIError(`チャット応答の生成に失敗しました: ${lastError.message}`);
  }
  
  throw new OpenAIError('チャット応答の生成に失敗しました');
};

// コード部分に対する詳細説明の生成
const generateCodeExplanation = async (code: string, level: string = 'intermediate'): Promise<string> => {
  try {
    // システムメッセージの構築
    const systemMessage = `あなたはプログラミング教育のエキスパートです。
    以下のコードについて、${level}レベルの学習者向けに詳細な説明を生成してください。
    コードの各部分の役割と、なぜそのように書かれているかを説明してください。
    専門用語は必要に応じて噛み砕いて説明し、コードの流れがわかるようにしてください。`;
    
    const messages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `以下のコードを説明してください:\n\`\`\`\n${code}\n\`\`\`` }
    ];
    
    const response = await fetchChatCompletion(messages);
    return response;
  } catch (error) {
    console.error('コード説明生成エラー:', error);
    return '申し訳ありませんが、コードの説明を生成できませんでした。';
  }
};

// unitのtype型を定義
export type UnitType = "lesson" | "exercise" | "quiz" | "project";

// 質問生成のためのシステムプロンプト
const SYSTEM_PROMPT_QUESTIONS = `
あなたは教育的な質問を作成する専門家です。提供された教材内容に基づいて、学習者の理解度を確認するための効果的な質問を作成してください。

質問は以下の要素を含む必要があります:
- 質問文 (question)
- 期待される回答 (expectedAnswer)
- ヒント (hint)
- カテゴリ (category)
- タグ (tags)

レスポンスは以下のJSON形式に従ってください:

{
  "questions": [
    {
      "question": "質問文",
      "expectedAnswer": "期待される回答または解説",
      "hint": "回答を導くためのヒント",
      "category": "質問のカテゴリ (例: 基本概念, 実装方法, ベストプラクティス)",
      "tags": ["関連タグ1", "関連タグ2"]
    }
    // ... 他の質問 ...
  ]
}

マークダウンや説明文は含めず、JSONオブジェクトのみを返してください。
`;

// 質問生成のためのユーザープロンプトテンプレート
const PROMPT_GENERATE_QUESTIONS = `
以下の教材内容に基づいて、{{QUESTION_TYPE}}タイプの質問を{{QUESTION_COUNT}}個、難易度{{DIFFICULTY}}で作成してください。

教材タイトル: {{MODULE_TITLE}}
教材説明: {{MODULE_DESCRIPTION}}

教材内容:
{{MODULE_CONTENT}}

指定されたJSON形式で質問リストを返してください。
`;

// モジュール詳細取得の共通処理
export const generateLearningQuestions = async (
  moduleDetail: ModuleDetail,
  type: string = 'practice',
  count: number = 5,
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onProgress?: (status: string, progress: number, estimatedTime?: number) => void;
  } = {}
): Promise<LearningQuestion[]> => {
  const { maxRetries = 2 } = options;
  let { retryDelay = 1000 } = options;
  const { onProgress } = options;
  let retries = 0;
  
  // 進捗状況を報告
  const updateProgress = (status: string, progress: number, estimatedTime?: number) => {
    if (onProgress) {
      onProgress(status, progress, estimatedTime);
    }
  };
  
  updateProgress("学習問題の生成を準備中...", 5, 60);
  
  // 質問生成のためのプロンプトを作成
  const prompt = PROMPT_GENERATE_QUESTIONS
    .replace('{{MODULE_TITLE}}', moduleDetail.title)
    .replace('{{MODULE_DESCRIPTION}}', moduleDetail.description)
    .replace('{{MODULE_CONTENT}}', moduleDetail.content.map(section => 
      `${section.title}:\n${section.content}`
    ).join('\n\n'))
    .replace('{{QUESTION_TYPE}}', type)
    .replace('{{QUESTION_COUNT}}', count.toString())
    .replace('{{DIFFICULTY}}', difficulty);
  
  while (retries <= maxRetries) {
    try {
      updateProgress("AIエンジンに接続中...", 15, 60);
      
      // OpenAI APIのパラメータを設定
      const params = {
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT_QUESTIONS },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        presence_penalty: 0.2,
        frequency_penalty: 0.5,
        response_format: { type: "json_object" }
      };
      
      updateProgress("問題を生成中...", 30, 60);
      
      // APIリクエストの開始時間を記録
      const startTime = Date.now();
      
      // OpenAI APIを呼び出し
      const result = await fetchChatCompletion(params.messages, {
        model: params.model,
        temperature: params.temperature,
        maxTokens: params.max_tokens,
        responseFormat: params.response_format,
        maxRetries: 0, // fetchChatCompletion側でリトライ
        timeout: 120000 // 2分のタイムアウト設定
      });
      
      // 処理にかかった時間を計算
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      updateProgress("生成された問題を処理中...", 70, Math.max(15, elapsedTime * 0.2));
      
      // APIレスポンスをパース
      if (result && typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          
          // 基本的な検証を行う
          if (!parsed.questions || !Array.isArray(parsed.questions)) {
            console.error('質問生成のレスポンスにデータが不足しています:', parsed);
            throw new Error('質問生成のレスポンスにデータが不足しています');
          }
          
          updateProgress("問題の最終調整中...", 90, 10);
          
          // 質問にIDを追加
          const questions: LearningQuestion[] = parsed.questions.map((q: any, index: number) => ({
            ...q,
            id: `${moduleDetail.id}-q${index + 1}`,
            // moduleId: moduleDetail.id, // 不要なら削除
            type,
            difficulty
          }));
          
          updateProgress("問題の生成が完了しました", 100, 0);
          return questions;
        } catch (parseError) {
          console.error('APIレスポンスのJSONパースに失敗しました:', parseError);
          throw new Error('APIレスポンスのJSONパースに失敗しました');
        }
      } else {
        console.error('APIレスポンスが空または不正な形式です');
        throw new Error('APIレスポンスが空または不正な形式です');
      }
    } catch (error) {
      retries++;
      console.error(`質問生成エラー (リトライ ${retries}/${maxRetries}):`, error);
      
      // 最大リトライ回数に達した場合
      if (retries > maxRetries) {
        updateProgress("問題の生成に失敗しました", 100, 0);
        throw error;
      }
      
      // リトライの前に遅延
      const delay = retryDelay * Math.pow(1.5, retries);
      updateProgress(`エラーが発生しました。リトライ中 (${retries}/${maxRetries})...`, 
        20 + (retries * 10), delay / 1000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // リトライごとに遅延を増加
      retryDelay = delay;
    }
  }
  
  // ここには到達しないはずだが、TypeScriptの型チェックを満たすために追加
  throw new Error('質問の生成に失敗しました');
};

// モジュール詳細情報を生成するためのデフォルトシステムプロンプト
const SYSTEM_PROMPT_MODULE_DETAIL = `
あなたは経験豊富な教材開発者です。与えられたモジュール情報に基づいて、学習者にとって魅力的で理解しやすい詳細な教材コンテンツを作成してください。

教材コンテンツは、以下の要素を含む必要があります:
1.  **概要説明(content)**: モジュールの主要な概念やトピックを詳細に解説します。コード例や図解も適宜含めてください。
2.  **具体例(examples)**: 理解を助けるための具体的なコード例やシナリオを複数提示してください。
3.  **要約(summary)**: モジュールの重要なポイントを簡潔にまとめてください。
4.  **キーポイント(keyPoints)**: 学習者が記憶すべき重要な用語や概念をリストアップしてください。
5.  **練習問題(questions)**: 理解度を確認するための練習問題をいくつか作成してください。ヒントも添えてください。
6.  **関連リソース(resources)**: さらに学習を深めるための高品質な外部リソース（ドキュメント、チュートリアル、記事など）を複数紹介してください。URL、タイトル、簡単な説明を含めてください。

レスポンスは必ず以下のJSON形式に従ってください:
{
  "title": "モジュールのタイトル",
  "description": "モジュールの詳細な説明",
  "learningObjectives": ["学習目標1", "学習目標2"],
  "prerequisites": ["前提知識1", "前提知識2"],
  "estimatedDuration": "学習時間の目安 (例: '2時間')",
  "difficulty": "難易度 ('beginner', 'intermediate', 'advanced')",
  "category": "カテゴリ",
  "content": [
    {
      "id": "section-1",
      "title": "セクション1のタイトル",
      "content": "セクション1の本文 (HTML形式可)",
      "examples": [
        {"title": "例1", "content": "例1の内容 (コードブロック等)"}
      ],
      "summary": "セクション1の要約",
      "keyPoints": ["キーポイント1", "キーポイント2"],
      "questions": [
        {"question": "練習問題1", "hint": "ヒント1"}
      ],
      "resources": [
        {"title": "リソース1", "url": "URL", "description": "説明"}
      ]
    }
    // ... 他のセクション ...
  ]
}

マークダウンや説明文は含めず、JSONオブジェクトのみを返してください。
`;

// Text-to-Speech APIを使用して音声を生成する関数
export const generateSpeech = async (text: string, voice: string = 'alloy'): Promise<ArrayBuffer> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('APIキーが設定されていません。');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice, // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
        input: text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API エラー: ${response.status} ${errorBody}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('音声生成エラー:', error);
    throw error;
  }
};
