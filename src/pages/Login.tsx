import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email({
    message: '有効なメールアドレスを入力してください',
  }),
  password: z.string().min(1, {
    message: 'パスワードを入力してください',
  }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginValues) {
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn(values.email, values.password);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="container mx-auto max-w-md py-12 px-4 sm:px-6 lg:px-8 flex-grow flex flex-col justify-center items-center">
        <div className="w-full max-w-md">
          <Button variant="ghost" size="sm" className="mb-6" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              トップページに戻る
            </Link>
          </Button>
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight">ログイン</h2>
            <p className="text-muted-foreground mt-2">
              アカウントにログインして学習を続けましょう
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            variant="outline" 
            className="w-full mb-6" 
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Googleで続ける
          </Button>
          
          <div className="relative mb-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-2 text-xs text-muted-foreground">または</span>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メールアドレス</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>パスワード</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  'ログイン'
                )}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちでないですか？{' '}
              <Link to="/signup" className="font-medium text-primary hover:underline">
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
