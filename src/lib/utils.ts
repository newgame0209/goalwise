import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChatSessionType } from '@/components/LearningChat/LearningChatState';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// セッションタイプに応じたタイトルを取得
export function getSessionTitle(type: ChatSessionType): string {
  switch (type) {
    case 'practice':
      return '練習問題セッション';
    case 'quiz':
      return '理解度チェッククイズ';
    case 'review':
      return '学習内容の復習';
    case 'feedback':
      return '学習進捗フィードバック';
    default:
      return '学習セッション';
  }
}

// セッションタイプに応じたウェルカムメッセージを取得
export function getWelcomeMessage(type: ChatSessionType): string {
  switch (type) {
    case 'practice':
      return 'こんにちは！今日は練習問題に取り組んでいきましょう。学んだ内容を実践することで理解が深まります。準備ができたら、問題を始めます。';
    case 'quiz':
      return 'こんにちは！これから学習内容の理解度を確認するクイズを行います。落ち着いて問題に取り組んでくださいね。';
    case 'review':
      return 'こんにちは！これまでの学習内容を復習していきましょう。効果的な復習は記憶の定着に重要です。';
    case 'feedback':
      return 'こんにちは！これまでの学習進捗について振り返り、フィードバックを行います。学習の成果と今後の方向性について考えていきましょう。';
    default:
      return 'こんにちは！学習セッションへようこそ。何か質問があればいつでも聞いてくださいね。';
  }
}
