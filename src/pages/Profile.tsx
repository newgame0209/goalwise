import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Container } from '@/components/ui/container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileForm from '@/components/Profile/ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ProgressDashboard from '@/components/Dashboard/ProgressDashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, UserCircle } from 'lucide-react';

// プロフィールページコンポーネント
const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  // 現在のユーザー情報を取得
  useEffect(() => {
    async function getUser() {
      try {
        setLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('ログインしていません');
        }
        
        setUser(session.user);
      } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, []);

  // ローディング中の表示
  if (loading) {
    return (
      <Container className="py-10">
        <div className="space-y-4">
          <Skeleton className="h-8 w-[200px]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </Container>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Container className="py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラーが発生しました</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <h1 className="text-3xl font-bold mb-6">マイプロフィール</h1>
      
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="progress">
            学習進捗
          </TabsTrigger>
          <TabsTrigger value="profile">
            <UserCircle className="h-4 w-4 mr-2" />
            プロフィール設定
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress">
          <ProgressDashboard />
        </TabsContent>
        
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>プロフィール情報</CardTitle>
              <CardDescription>
                学習プランのカスタマイズに使用されるプロフィール情報を編集します。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm user={user} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default Profile; 