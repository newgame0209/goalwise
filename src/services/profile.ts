import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * プロフィールデータからモジュール生成に必要な情報を抽出・整形する関数
 */
export const formatProfileForModuleGeneration = (profileData: any) => {
  if (!profileData) return null;
  
  try {
    // プロファイルがJSON文字列の場合はパース
    const profile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
    
    // 学習目的を見つける
    const goalAnswer = profile.answers?.find((a: any) => 
      a.question.includes('目的') || a.question.includes('ゴール')
    );
    
    // スキルレベルを見つける
    const skillAnswer = profile.answers?.find((a: any) => 
      a.question.includes('スキルレベル') || a.question.includes('経験')
    );
    
    // 学習スタイルを見つける
    const styleAnswer = profile.answers?.find((a: any) => 
      a.question.includes('学習スタイル') || a.question.includes('方法')
    );
    
    // 時間のコミットメントを見つける
    const timeAnswer = profile.answers?.find((a: any) => 
      a.question.includes('時間') || a.question.includes('頻度')
    );
    
    return {
      goal: goalAnswer?.answer || profile.goal || '',
      level: skillAnswer?.answer || (profile.skills?.programming ? 
        (profile.skills.programming > 2 ? '上級者' : 
        (profile.skills.programming > 1 ? '中級者' : '初級者'))
       : '初級者'),
      interests: profile.interests || [],
      learningStyle: styleAnswer?.answer || profile.learningStyle || [],
      timeCommitment: timeAnswer?.answer || profile.timeCommitment || 'medium',
      challenges: profile.challenges || ''
    };
  } catch (e) {
    console.error('プロファイルデータの解析エラー:', e);
    return {};
  }
};

/**
 * ユーザーIDからプロファイルデータを取得する関数
 */
export const fetchUserProfileData = async (userId: string) => {
  try {
    console.log('プロファイルデータ取得開始:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('profile_data, profile_completed')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('プロファイル取得エラー:', error);
      return null;
    }
    
    if (!data || !data.profile_completed) {
      console.log('プロファイルが未完了または存在しません');
      return null;
    }
    
    console.log('プロファイルデータ取得成功');
    return formatProfileForModuleGeneration(data.profile_data);
  } catch (err) {
    console.error('プロファイル取得中の例外:', err);
    return null;
  }
}; 