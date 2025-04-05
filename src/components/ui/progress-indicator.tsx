import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { Loader2, ChevronRight, Check, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

export interface ProgressIndicatorProps {
  /**
   * 進行状況を0-100の数値で指定
   */
  value?: number
  /**
   * 現在の処理ステップの説明
   */
  status?: string
  /**
   * 予想される待機時間 (秒)
   */
  estimatedTime?: number
  /**
   * 複数ステップがある場合の現在のステップ番号
   */
  currentStep?: number
  /**
   * 複数ステップがある場合の合計ステップ数
   */
  totalSteps?: number
  /**
   * エラー状態を示すフラグ
   */
  error?: boolean
  /**
   * エラーメッセージ
   */
  errorMessage?: string
  /**
   * 処理が完了したかを示すフラグ
   */
  completed?: boolean
  /**
   * 詳細な進行状況メッセージを表示するかどうか
   */
  showDetails?: boolean
  /**
   * アニメーション付きでプログレスバーを表示するか
   */
  animated?: boolean
  /**
   * CSSクラス名
   */
  className?: string
  /**
   * プログレスバーのバリアント
   */
  variant?: "default" | "success" | "error" | "warning" | "indeterminate"
}

export function ProgressIndicator({
  value = 0,
  status,
  estimatedTime,
  currentStep,
  totalSteps,
  error = false,
  errorMessage,
  completed = false,
  showDetails = true,
  animated = true,
  className,
  variant = "default",
  ...props
}: ProgressIndicatorProps) {
  // 残り時間の計算
  const remainingTime = React.useMemo(() => {
    if (!estimatedTime || completed || error) return null
    
    const remaining = Math.max(0, Math.ceil(estimatedTime * (1 - value / 100)))
    
    if (remaining === 0) return null
    
    if (remaining < 60) {
      return `残り約${remaining}秒`
    } else {
      const minutes = Math.floor(remaining / 60)
      const seconds = remaining % 60
      return `残り約${minutes}分${seconds > 0 ? `${seconds}秒` : ''}`
    }
  }, [estimatedTime, value, completed, error])

  // バリアントに基づくスタイルの決定
  const getVariantStyles = () => {
    if (error) return "bg-destructive"
    if (completed) return "bg-success"
    
    switch (variant) {
      case "success":
        return "bg-success"
      case "error":
        return "bg-destructive"
      case "warning":
        return "bg-warning"
      case "indeterminate":
      case "default":
      default:
        return "bg-primary"
    }
  }

  // ステータスアイコンの決定
  const StatusIcon = () => {
    if (error) return <AlertTriangle className="h-4 w-4 text-destructive" />
    if (completed) return <Check className="h-4 w-4 text-success" />
    if (variant === "indeterminate" || value < 100) {
      return <Loader2 className={cn("h-4 w-4 text-muted-foreground", animated && "animate-spin")} />
    }
    return null
  }

  return (
    <div className={cn("w-full space-y-2", className)} {...props}>
      <div className="flex items-center justify-between">
        {/* ステップ表示 */}
        {totalSteps && currentStep ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <span>ステップ {currentStep}/{totalSteps}</span>
          </div>
        ) : null}
        
        {/* 残り時間の表示 */}
        {remainingTime && (
          <div className="text-sm text-muted-foreground">
            {remainingTime}
          </div>
        )}
      </div>
      
      {/* プログレスバー */}
      <ProgressPrimitive.Root
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        )}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all",
            getVariantStyles(),
            variant === "indeterminate" && animated && "animate-progress-indeterminate"
          )}
          style={{
            transform: variant === "indeterminate" 
              ? "translateX(0)" 
              : `translateX(-${100 - (value || 0)}%)`
          }}
        />
      </ProgressPrimitive.Root>
      
      {/* ステータス情報 */}
      {showDetails && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon />
            <span className="text-sm font-medium">
              {error ? errorMessage || "エラーが発生しました" :
               completed ? "完了しました" : 
               status || "処理中..."}
            </span>
          </div>
          
          {!error && !completed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-medium">{Math.round(value)}%</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>処理の進行状況: {Math.round(value)}%</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  )
}

// 進行状態のアニメーション用のキーフレームをグローバルCSSに追加
if (typeof document !== "undefined") {
  const style = document.createElement("style")
  style.innerHTML = `
    @keyframes progress-indeterminate {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0); }
      100% { transform: translateX(100%); }
    }
    .animate-progress-indeterminate {
      animation: progress-indeterminate 2s ease infinite;
    }
  `
  document.head.appendChild(style)
} 