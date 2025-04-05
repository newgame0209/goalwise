import React from "react";
import { AlertCircle, Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface ErrorMessageProps {
  title?: string;
  message: string;
  variant?: "error" | "warning" | "info";
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  showToast?: boolean;
}

export function ErrorMessage({
  title,
  message,
  variant = "error",
  onRetry,
  retryLabel = "再試行",
  onDismiss,
  dismissLabel = "閉じる",
  showToast = false,
}: ErrorMessageProps) {
  // トースト表示
  React.useEffect(() => {
    if (showToast) {
      toast({
        title: title || getDefaultTitle(variant),
        description: message,
        variant: variant === "error" ? "destructive" : "default",
      });
    }
  }, [message, showToast, title, variant]);

  return (
    <Alert variant={variant === "error" ? "destructive" : variant === "warning" ? "default" : "secondary"}>
      {getIcon(variant)}
      <AlertTitle>{title || getDefaultTitle(variant)}</AlertTitle>
      <AlertDescription className="whitespace-pre-wrap">
        {message}
        
        {(onRetry || onDismiss) && (
          <div className="flex gap-2 mt-4">
            {onRetry && (
              <Button
                size="sm"
                variant={variant === "error" ? "outline" : "default"}
                onClick={onRetry}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {retryLabel}
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
              >
                {dismissLabel}
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

// バリアントに基づいてアイコンを取得する関数
function getIcon(variant: "error" | "warning" | "info") {
  switch (variant) {
    case "error":
      return <AlertCircle className="h-4 w-4" />;
    case "warning":
      return <AlertCircle className="h-4 w-4" />;
    case "info":
      return <Info className="h-4 w-4" />;
  }
}

// バリアントに基づいてデフォルトのタイトルを取得する関数
function getDefaultTitle(variant: "error" | "warning" | "info") {
  switch (variant) {
    case "error":
      return "エラーが発生しました";
    case "warning":
      return "警告";
    case "info":
      return "お知らせ";
  }
} 