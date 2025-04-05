import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// プロフィールフォームのスキーマ
const profileFormSchema = z.object({
  username: z.string().min(2, {
    message: 'ユーザー名は2文字以上で入力してください',
  }),
  bio: z.string().max(500, {
    message: '自己紹介は500文字以内で入力してください',
  }).optional(),
  currentLevel: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: '学習レベルを選択してください',
  }),
  learningPreferences: z.array(z.string()).optional(),
  studyTimePerWeek: z.string().optional(),
});

// フォームの初期値
const defaultValues = {
  username: '',
  bio: '',
  currentLevel: 'beginner' as const,
  learningPreferences: [],
  studyTimePerWeek: '',
};

// 学習スタイルの選択肢
const learningPreferences = [
  { id: 'visual', label: '視覚的学習' },
  { id: 'audio', label: '聴覚的学習' },
  { id: 'reading', label: 'テキスト中心の学習' },
  { id: 'practice', label: '実践中心の学習' },
];

// プロフィールフォームコンポーネント
const ProfileForm = ({ user }: { user: any }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  });
  
  // プロフィールデータの取得
  const loadProfileData = async () => {
    try {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        throw error;
      }
      
      if (data) {
        // フォームの値を設定
        form.reset({
          username: data.username || '',
          bio: data.bio || '',
          currentLevel: data.current_level || 'beginner',
          learningPreferences: data.learning_preferences || [],
          studyTimePerWeek: data.study_time_per_week || '',
        });
      }
    } catch (error) {
      console.error('プロフィールデータ取得エラー:', error);
      toast({
        title: 'エラー',
        description: 'プロフィールデータの取得に失敗しました',
        variant: 'destructive',
      });
    }
  };
  
  // コンポーネントマウント時にプロフィールデータを取得
  useEffect(() => {
    loadProfileData();
  }, [user]);
  
  // フォーム送信時の処理
  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        throw new Error('ユーザーIDが見つかりません');
      }
      
      // プロフィールデータの更新
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: values.username,
          bio: values.bio,
          current_level: values.currentLevel,
          learning_preferences: values.learningPreferences,
          study_time_per_week: values.studyTimePerWeek,
          updated_at: new Date().toISOString(),
        });
        
      if (error) {
        throw error;
      }
      
      toast({
        title: '更新完了',
        description: 'プロフィールが正常に更新されました',
      });
    } catch (error) {
      console.error('プロフィール更新エラー:', error);
      toast({
        title: 'エラー',
        description: 'プロフィールの更新に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.user_metadata?.avatar_url || ''} />
            <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user?.email}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(user?.created_at).toLocaleDateString()} に登録
            </p>
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ユーザー名</FormLabel>
              <FormControl>
                <Input placeholder="ユーザー名" {...field} />
              </FormControl>
              <FormDescription>
                アプリ内で表示される名前です
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>自己紹介</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="あなたの目標や学習したい内容について教えてください"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="currentLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>現在のスキルレベル</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="レベルを選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="beginner">初心者</SelectItem>
                  <SelectItem value="intermediate">中級者</SelectItem>
                  <SelectItem value="advanced">上級者</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                現在のプログラミングスキルレベルを選択してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="learningPreferences"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel>学習スタイルの好み</FormLabel>
                <FormDescription>
                  あなたに合った学習方法を選択してください
                </FormDescription>
              </div>
              {learningPreferences.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name="learningPreferences"
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className="flex flex-row items-start space-x-3 space-y-0"
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value || [], item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="studyTimePerWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>週あたりの学習時間</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="学習時間を選択" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1-3">1-3時間</SelectItem>
                  <SelectItem value="4-7">4-7時間</SelectItem>
                  <SelectItem value="8-14">8-14時間</SelectItem>
                  <SelectItem value="15+">15時間以上</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                週にどれくらいの時間を学習に割くことができますか？
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isLoading}>
          {isLoading ? '更新中...' : 'プロフィールを更新'}
        </Button>
      </form>
    </Form>
  );
};

export default ProfileForm; 