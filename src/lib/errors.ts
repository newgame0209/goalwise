/**
 * カスタムエラークラスの定義
 * アプリケーション内でのエラーハンドリングを統一するために使用されます
 */

// 基本となるアプリケーションエラークラス
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

// 認証関連のエラー
export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// ネットワーク関連のエラー
export class NetworkError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

// OpenAI API関連のエラー
export class OpenAIError extends AppError {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'OpenAIError';
    this.code = code;
  }
}

// データ検証エラー
export class ValidationError extends AppError {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// コンテンツ生成エラー
export class ContentGenerationError extends AppError {
  source?: string;

  constructor(message: string, source?: string) {
    super(message);
    this.name = 'ContentGenerationError';
    this.source = source;
  }
}

/**
 * エラーの種類に基づいてユーザーフレンドリーなメッセージを生成する関数
 * @param error エラーオブジェクト
 * @returns ユーザーフレンドリーなエラーメッセージ
 */
export const getFriendlyErrorMessage = (error: unknown): string => {
  if (!error) {
    return '不明なエラーが発生しました。';
  }

  // エラーメッセージがある場合はそれを使用
  if (typeof error === 'string') {
    return error;
  }

  // Error型のエラー
  if (error instanceof Error) {
    if (error instanceof AuthenticationError) {
      return `認証エラー: ${error.message}`;
    }
    
    if (error instanceof NetworkError) {
      return `ネットワークエラー: ${error.message}`;
    }
    
    if (error instanceof OpenAIError) {
      if (error.code === 'rate_limit_exceeded') {
        return 'APIリクエスト制限に達しました。しばらく待ってから再試行してください。';
      }
      return `AIサービスエラー: ${error.message}`;
    }
    
    if (error instanceof ValidationError) {
      return `入力データエラー: ${error.message}`;
    }
    
    if (error instanceof ContentGenerationError) {
      return `コンテンツ生成エラー: ${error.message}`;
    }
    
    return error.message;
  }

  // それ以外の場合は文字列化を試みる
  try {
    return JSON.stringify(error);
  } catch {
    return '不明なエラーが発生しました。';
  }
};

/**
 * エラーの種類からUIで表示するエラータイプを決定する関数
 * @param error エラーオブジェクト
 * @returns UIで使用するエラータイプ
 */
export const getErrorType = (
  error: unknown
): 'network' | 'api' | 'auth' | 'validation' | 'content' | 'general' => {
  if (error instanceof NetworkError) {
    return 'network';
  }
  
  if (error instanceof OpenAIError) {
    return 'api';
  }
  
  if (error instanceof AuthenticationError) {
    return 'auth';
  }
  
  if (error instanceof ValidationError) {
    return 'validation';
  }
  
  if (error instanceof ContentGenerationError) {
    return 'content';
  }
  
  // エラーのメッセージ内容から推測
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('auth') || message.includes('token') || message.includes('key')) {
      return 'auth';
    }
    if (message.includes('api') || message.includes('openai') || message.includes('rate limit')) {
      return 'api';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('content') || message.includes('generation')) {
      return 'content';
    }
  }
  
  return 'general';
};

/**
 * OpenAIエラーのハンドリング関数
 * @param error OpenAIエラー
 * @returns エラーメッセージ
 */
export const handleOpenAIError = (error: OpenAIError): string => {
  if (error.code === 'rate_limit_exceeded') {
    return 'APIリクエスト制限に達しました。しばらく待ってから再試行してください。';
  }
  return `AIサービスエラー: ${error.message}`;
};

/**
 * ネットワークエラーのハンドリング関数
 * @param error ネットワークエラー
 * @returns エラーメッセージ
 */
export const handleNetworkError = (error: NetworkError): string => {
  return `ネットワークエラー: ${error.message}`;
};

/**
 * バリデーションエラーのハンドリング関数
 * @param error バリデーションエラー
 * @returns エラーメッセージ
 */
export const handleValidationError = (error: ValidationError): string => {
  const fieldInfo = error.field ? `(${error.field})` : '';
  return `入力データエラー${fieldInfo}: ${error.message}`;
};

/**
 * 認証エラーのハンドリング関数
 * @param error 認証エラー
 * @returns エラーメッセージ
 */
export const handleAuthenticationError = (error: AuthenticationError): string => {
  return `認証エラー: ${error.message}`;
};

/**
 * 任意のエラーからエラーメッセージを取得する関数
 * @param error 任意のエラー
 * @returns エラーメッセージ
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof OpenAIError) return handleOpenAIError(error);
  if (error instanceof NetworkError) return handleNetworkError(error);
  if (error instanceof ValidationError) return handleValidationError(error);
  if (error instanceof AuthenticationError) return handleAuthenticationError(error);
  if (error instanceof ContentGenerationError) return `コンテンツ生成エラー: ${error.message}`;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '不明なエラーが発生しました';
};

/**
 * リトライ可能なエラーかどうかを判定する関数
 * @param error 任意のエラー
 * @returns リトライ可能なエラーかどうか
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof NetworkError) return true;
  if (error instanceof OpenAIError && error.code === 'rate_limit_exceeded') return true;
  if (error instanceof Error && error.message.includes('fetch failed')) return true;
  return false;
}; 