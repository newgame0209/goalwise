
import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ChatWidget from '@/components/ChatWidget';
import { useChatState } from '@/components/ChatWidget/ChatState';
import { supabase } from '@/integrations/supabase/client';

type ProtectedRouteProps = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { profileCompleted, setProfileCompleted } = useChatState();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkProfileStatus = async () => {
      if (user) {
        try {
          console.log("ユーザー認証済み: プロファイル状態をチェックします");
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('profile_completed')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          console.log("取得したプロファイル完了状態:", profileData?.profile_completed);
          
          // プロファイル完了状態を設定
          setProfileCompleted(profileData?.profile_completed || false);
        } catch (error) {
          console.error('プロファイル状態チェックエラー:', error);
        } finally {
          setCheckingProfile(false);
        }
      } else {
        setCheckingProfile(false);
      }
    };

    checkProfileStatus();
  }, [user, setProfileCompleted]);

  if (loading || checkingProfile) {
    // ローディング中の表示
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (!user) {
    // 認証されていない場合はログインページへリダイレクト
    return <Navigate to="/login" replace />;
  }

  // プロファイルが完了していない場合、かつ現在のパスがプロファイリングページでない場合
  if (!profileCompleted && location.pathname !== '/profiling') {
    console.log("プロファイル未完了: プロファイリングページにリダイレクトします");
    return <Navigate to="/profiling" replace />;
  }

  // プロファイルが完了していて、かつ現在のパスがプロファイリングページの場合
  if (profileCompleted && location.pathname === '/profiling') {
    console.log("プロファイル完了済み: ダッシュボードにリダイレクトします");
    return <Navigate to="/dashboard" replace />;
  }

  // 条件を満たしている場合、保護されたコンテンツを表示
  // プロファイリングページ以外でのみChatWidgetを表示
  return (
    <>
      {children}
      {location.pathname !== '/profiling' && <ChatWidget />}
    </>
  );
};

export default ProtectedRoute;
