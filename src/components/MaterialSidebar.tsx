import { useState } from 'react';
import { ListTree, Lightbulb, Book, Code, CheckCircle2, PlayCircle, FileText, BookOpen } from 'lucide-react';
import { 
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LearningPlan from './LearningPlan';
import { getLearningPlanData } from '@/utils/learning-plan-data';
import { CurriculumStructure } from '@/services/openai';

interface MaterialSidebarProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  progress: {
    introduction: number;
    theory: number;
    examples: number;
    practice: number;
    [key: string]: number; // インデックスシグネチャを追加
  };
  curriculumModules?: CurriculumStructure['modules'];
}

const MaterialSidebar = ({ activeModule, onModuleChange, progress, curriculumModules }: MaterialSidebarProps) => {
  const [viewMode, setViewMode] = useState<string>('modules');
  // プログレスの平均値を計算
  const progressValues = Object.values(progress);
  const totalProgress = progressValues.length > 0 
    ? progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length 
    : 0;
  
  const planData = getLearningPlanData();
  
  // アイコンマッピング
  const getModuleIcon = (index: number) => {
    const icons = [Book, Lightbulb, Code, PlayCircle, FileText, BookOpen];
    return icons[index % icons.length];
  };
  
  // デフォルトのモジュール（カリキュラムデータがない場合用）
  const defaultModules = [
    {
      id: 'introduction',
      title: '導入',
      icon: Book,
      progress: progress.introduction
    },
    {
      id: 'theory',
      title: '理論',
      icon: Lightbulb,
      progress: progress.theory
    },
    {
      id: 'examples',
      title: '実例',
      icon: Code,
      progress: progress.examples
    },
    {
      id: 'practice',
      title: '練習問題',
      icon: PlayCircle,
      progress: progress.practice
    }
  ];

  // カリキュラムモジュールまたはデフォルトモジュールを使用
  const modules = curriculumModules 
    ? curriculumModules.map((module, index) => ({
        id: module.id,
        title: module.title,
        icon: getModuleIcon(index),
        progress: progress[module.id] || 0
      }))
    : defaultModules;

  // サイドバータイトルの設定
  const sidebarTitle = curriculumModules && curriculumModules.length > 0 
    ? curriculumModules[0].title.split(' - ')[0] // タイトルの最初の部分を使用
    : 'データ分析の基礎';

  return (
    <Sidebar variant="inset" className="mt-20 md:mt-24">
      <SidebarHeader className="p-4">
        <div className="flex flex-col space-y-2">
          <h2 className="text-xl font-semibold">{sidebarTitle}</h2>
          <div className="flex items-center space-x-2">
            <Progress value={totalProgress} className="h-2 flex-1" />
            <span className="text-xs font-medium">{Math.round(totalProgress)}%</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="pt-4">
        <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="modules" className="text-xs">
              モジュール
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="text-xs">
              学習ロードマップ
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules" className="mt-4">
            <SidebarGroup>
              <SidebarGroupLabel>学習モジュール</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {modules.map((module) => (
                    <SidebarMenuItem key={module.id}>
                      <SidebarMenuButton 
                        onClick={() => onModuleChange(module.id)}
                        isActive={activeModule === module.id}
                      >
                        <module.icon />
                        <span>{module.title}</span>
                        {module.progress === 100 && (
                          <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />
                        )}
                      </SidebarMenuButton>
                      
                      <div className="ml-8 mr-2 mt-1">
                        <Progress value={module.progress} className="h-1" />
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel>関連リソース</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="別タブで開きます">
                      <Book />
                      <span>参考文献</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="別タブで開きます">
                      <Code />
                      <span>サンプルコード</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </TabsContent>
          
          <TabsContent value="roadmap" className="mt-4 px-2">
            <LearningPlan planData={planData} />
          </TabsContent>
        </Tabs>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="flex flex-col space-y-4">
          {curriculumModules && curriculumModules.length > 1 && (
            <div className="flex justify-between gap-2">
              <button
                onClick={() => {
                  const currentIndex = modules.findIndex(m => m.id === activeModule);
                  if (currentIndex > 0) {
                    onModuleChange(modules[currentIndex - 1].id);
                  }
                }}
                disabled={modules.findIndex(m => m.id === activeModule) <= 0}
                className={`flex-1 flex items-center justify-center gap-1 text-xs p-2 rounded border ${
                  modules.findIndex(m => m.id === activeModule) <= 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-muted'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
                前のモジュール
              </button>
              <button
                onClick={() => {
                  const currentIndex = modules.findIndex(m => m.id === activeModule);
                  if (currentIndex < modules.length - 1) {
                    onModuleChange(modules[currentIndex + 1].id);
                  }
                }}
                disabled={modules.findIndex(m => m.id === activeModule) >= modules.length - 1}
                className={`flex-1 flex items-center justify-center gap-1 text-xs p-2 rounded border ${
                  modules.findIndex(m => m.id === activeModule) >= modules.length - 1
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-muted'
                }`}
              >
                次のモジュール
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            最終更新日: {new Date().toLocaleDateString('ja-JP')}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MaterialSidebar;
