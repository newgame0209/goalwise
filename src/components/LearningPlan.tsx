import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTree, Lightbulb, List, Maximize2, ChevronDown, ChevronRight, Target, Goal, BookOpen, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';

interface PlanNode {
  id: string;
  title: string;
  description: string;
  children?: PlanNode[];
}

interface LearningPlanProps {
  planData: {
    title: string;
    description: string;
    nodes: PlanNode[];
  };
}

const LearningPlan = ({ planData }: LearningPlanProps) => {
  // サイドバー内はリスト表示をデフォルトに変更
  const [viewMode, setViewMode] = useState<string>('list');
  const [openSheet, setOpenSheet] = useState(false);
  
  // 全画面表示用の関数
  const handleOpenFullscreen = () => {
    setOpenSheet(true);
  };
  
  // コンテンツをレンダリングする関数
  const renderContent = () => (
    <div className="animate-fade-in">
      <Tabs defaultValue={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="tree" className="flex items-center text-base">
            <ListTree className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">KPIツリー</span>
          </TabsTrigger>
          <TabsTrigger value="mindmap" className="flex items-center text-base">
            <Lightbulb className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">マインドマップ</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center text-base">
            <List className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">リスト表示</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tree" className="mt-0">
          <div className="mb-6 bg-blue-700 text-white p-4 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">学習の目標</h2>
                <p className="text-base mt-1">{planData.description}</p>
              </div>
            </div>
          </div>
          <TreeView nodes={planData.nodes} />
        </TabsContent>
        
        <TabsContent value="mindmap" className="mt-0">
          <MindMap centerNode={planData} />
        </TabsContent>
        
        <TabsContent value="list" className="mt-0">
          <ListView nodes={planData.nodes} />
        </TabsContent>
      </Tabs>
    </div>
  );
  
  // サイドバーにはボタンとシートを表示
  return (
    <div>
      <Button onClick={handleOpenFullscreen} variant="outline" className="w-full mb-4 flex items-center justify-center text-base">
        <Maximize2 className="mr-2 h-5 w-5" />
        ロードマップを全画面で表示
      </Button>
      
      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent side="bottom" className="h-[90vh] max-w-full overflow-y-auto sm:max-w-full">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-xl">{planData.title}</SheetTitle>
            <SheetDescription className="text-base">{planData.description}</SheetDescription>
            <VisuallyHidden>ロードマップの全画面表示</VisuallyHidden>
          </SheetHeader>
          {renderContent()}
        </SheetContent>
      </Sheet>
      
      {/* サイドバー内にはリスト表示のみ表示 */}
      <div className="h-[300px] overflow-auto pr-1">
        <SidebarListView nodes={planData.nodes} />
      </div>
    </div>
  );
};

// サイドバー内専用のリスト表示コンポーネント
const SidebarListView = ({ nodes }: { nodes: PlanNode[] }) => {
  const flattenNodes = (nodeList: PlanNode[], level = 0): Array<PlanNode & { level: number }> => {
    return nodeList.reduce((acc, node) => {
      acc.push({ ...node, level });
      if (node.children && node.children.length > 0) {
        acc.push(...flattenNodes(node.children, level + 1));
      }
      return acc;
    }, [] as Array<PlanNode & { level: number }>);
  };
  
  const flattenedNodes = flattenNodes(nodes);
  
  return (
    <div className="space-y-3">
      {flattenedNodes.map((node, index) => {
        // レベルに応じたアイコンを選択
        let Icon = BookOpen;
        if (node.level === 0) {
          Icon = Goal;
        } else if (node.level === 1) {
          Icon = CheckSquare;
        }
        
        return (
          <div 
            key={node.id} 
            className={cn(
              "p-2 animate-fade-in transition-colors",
              node.level === 0 
                ? "bg-gradient-to-r from-indigo-50 to-indigo-100 border-l-4 border-indigo-500 rounded-r-lg" 
                : node.level === 1
                  ? "ml-4 bg-white border-l-4 border-indigo-300 rounded-r-lg"
                  : "ml-8 bg-white border-l-2 border-indigo-200 rounded-r-lg"
            )}
            style={{ 
              animationDelay: `${index * 50}ms`
            }}
          >
            <div className="flex items-start gap-2">
              <div className={cn(
                "mt-0.5",
                node.level === 0 
                  ? "text-indigo-600" 
                  : node.level === 1
                    ? "text-indigo-500"
                    : "text-indigo-400"
              )}>
                <Icon className={cn(
                  node.level === 0 
                    ? "h-5 w-5" 
                    : node.level === 1
                      ? "h-4 w-4"
                      : "h-3.5 w-3.5"
                )} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-semibold truncate",
                  node.level === 0 
                    ? "text-base text-indigo-900" 
                    : node.level === 1
                      ? "text-sm text-indigo-800"
                      : "text-xs text-indigo-700"
                )}>
                  {node.title}
                </h3>
                <p className={cn(
                  "line-clamp-1",
                  node.level === 0 
                    ? "text-sm text-indigo-700" 
                    : node.level === 1
                      ? "text-xs text-indigo-600"
                      : "text-xs text-indigo-500"
                )}>
                  {node.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// 以下は既存のコンポーネントをそのまま維持
// SimplifiedView component
const SimplifiedView = ({ nodes }: { nodes: PlanNode[] }) => {
  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <SimplifiedNodeView key={node.id} node={node} />
      ))}
    </div>
  );
};

const SimplifiedNodeView = ({ node }: { node: PlanNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="animate-scale-in">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="bg-card rounded-lg p-3 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-base">{node.title}</h3>
            {node.children && node.children.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-base">
                  {isOpen ? '折りたたむ' : '展開する'}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{node.description}</p>
        </div>
        
        {node.children && node.children.length > 0 && (
          <CollapsibleContent>
            <div className="ml-4 mt-1 pl-2 border-l-2 border-muted space-y-2">
              {node.children.map((childNode) => (
                <SimplifiedNodeView key={childNode.id} node={childNode} />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

// TreeView component
const TreeView = ({ nodes }: { nodes: PlanNode[] }) => {
  return (
    <div className="space-y-5 pt-4">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} level={0} />
      ))}
    </div>
  );
};

const TreeNode = ({ node, level }: { node: PlanNode; level: number }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  
  return (
    <div className="animate-scale-in relative pl-10" style={{ animationDelay: `${level * 50}ms` }}>
      {/* 接続線 */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-100" />
      <div className="absolute left-4 top-7 w-6 h-0.5 bg-blue-100" />
      
      {/* ノードコンテンツ */}
      <div className={cn(
        "mb-4 border rounded-md transition-colors",
        level === 0 
          ? "bg-blue-100 border-blue-300 p-4" 
          : "bg-white border-gray-200 p-3"
      )}>
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold",
              level === 0 ? "text-blue-900 text-lg" : "text-gray-800 text-base"
            )}>
              {node.title}
            </h3>
            {level > 0 && (
              <p className="text-base text-gray-500 mt-1 line-clamp-1">
                {node.description}
              </p>
            )}
          </div>
          
          {node.children && node.children.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0 h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            >
              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              <span className="sr-only">{isExpanded ? '折りたたむ' : '展開する'}</span>
            </Button>
          )}
        </div>
        {level === 0 && (
          <p className="text-base text-blue-700 mt-2">
            {node.description}
          </p>
        )}
      </div>
      
      {/* 子ノード */}
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="space-y-4">
          {node.children.map((childNode) => (
            <TreeNode key={childNode.id} node={childNode} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// シンプルなマインドマップコンポーネント
const MindMap = ({ centerNode }: { centerNode: { title: string, description: string, nodes: PlanNode[] } }) => {
  return (
    <div className="bg-blue-50/30 p-6 rounded-xl relative">
      {/* 接続線 */}
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
        {centerNode.nodes.map((_, index) => {
          const column = index % 3;
          const row = Math.floor(index / 3);
          const isFirstRow = row === 0;
          
          return (
            <g key={`lines-${index}`}>
              {/* メインタイトルからの垂直線 */}
              {isFirstRow && (
                <line
                  x1="50%"
                  y1="80px"
                  x2="50%"
                  y2="160px"
                  stroke="#93c5fd"
                  strokeWidth="2"
                />
              )}
              
              {/* メインタイトルからの水平線（最上段のみ） */}
              {isFirstRow && (
                <line
                  x1="50%"
                  y1="160px"
                  x2={`${25 + (column * 25)}%`}
                  y2="160px"
                  stroke="#93c5fd"
                  strokeWidth="2"
                />
              )}

              {/* 上下のノードを繋ぐ垂直線（2行目のノードの場合） */}
              {!isFirstRow && (
                <line
                  x1={`${25 + (column * 25)}%`}
                  y1="200px"
                  x2={`${25 + (column * 25)}%`}
                  y2="320px"
                  stroke="#93c5fd"
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* メインタイトル */}
      <div className="relative mb-16">
        <div className="bg-blue-500 text-white px-8 py-4 rounded-lg mx-auto max-w-[500px] text-center">
          <h2 className="text-xl font-semibold">{centerNode.title}</h2>
        </div>
      </div>

      {/* サブトピックのグリッド */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-12 relative">
        {centerNode.nodes.map((node, index) => (
          <div key={node.id} className="flex flex-col">
            {/* メインノード */}
            <div className="bg-white p-5 rounded-lg border border-blue-100 shadow-sm hover:border-blue-300 transition-colors">
              <h3 className="font-medium text-lg text-blue-900 mb-2">{node.title}</h3>
              <p className="text-base text-gray-600">{node.description}</p>
              
              {/* サブノード（存在する場合） */}
              {node.children && node.children.length > 0 && (
                <div className="mt-4 pt-3 border-t border-blue-50">
                  <div className="flex flex-wrap gap-2">
                    {node.children.map(child => (
                      <span
                        key={child.id}
                        className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                      >
                        {child.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// アニメーションのスタイルを更新
const styles = `
@keyframes draw {
  from {
    stroke-dashoffset: 100;
    opacity: 0;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 0.5;
  }
}

.animate-draw {
  stroke-dasharray: 100;
  animation: draw 1s ease-out forwards;
}
`;

// スタイルをヘッドに追加
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// ListView component
const ListView = ({ nodes }: { nodes: PlanNode[] }) => {
  const flattenNodes = (nodeList: PlanNode[], level = 0): Array<PlanNode & { level: number }> => {
    return nodeList.reduce((acc, node) => {
      acc.push({ ...node, level });
      if (node.children && node.children.length > 0) {
        acc.push(...flattenNodes(node.children, level + 1));
      }
      return acc;
    }, [] as Array<PlanNode & { level: number }>);
  };
  
  const flattenedNodes = flattenNodes(nodes);
  
  return (
    <div className="space-y-4">
      {flattenedNodes.map((node, index) => {
        // レベルに応じたアイコンを選択
        let Icon = BookOpen;
        if (node.level === 0) {
          Icon = Goal;
        } else if (node.level === 1) {
          Icon = CheckSquare;
        }
        
        return (
          <div 
            key={node.id} 
            className={cn(
              "p-4 animate-fade-in transition-colors",
              node.level === 0 
                ? "bg-gradient-to-r from-indigo-50 to-indigo-100 border-l-4 border-indigo-500 rounded-r-lg" 
                : node.level === 1
                  ? "ml-6 bg-white border-l-4 border-indigo-300 rounded-r-lg"
                  : "ml-12 bg-white border-l-2 border-indigo-200 rounded-r-lg"
            )}
            style={{ 
              animationDelay: `${index * 50}ms`
            }}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "mt-1 p-2 rounded-full",
                node.level === 0 
                  ? "bg-indigo-100" 
                  : node.level === 1
                    ? "bg-indigo-50"
                    : "bg-white"
              )}>
                <Icon className={cn(
                  node.level === 0 
                    ? "text-indigo-600 h-6 w-6" 
                    : node.level === 1
                      ? "text-indigo-500 h-5 w-5"
                      : "text-indigo-400 h-4 w-4"
                )} />
              </div>
              
              <div className="flex-1">
                <h3 className={cn(
                  "font-semibold mb-1",
                  node.level === 0 
                    ? "text-xl text-indigo-900" 
                    : node.level === 1
                      ? "text-lg text-indigo-800"
                      : "text-base text-indigo-700"
                )}>
                  {node.title}
                </h3>
                <p className={cn(
                  node.level === 0 
                    ? "text-base text-indigo-700" 
                    : node.level === 1
                      ? "text-base text-indigo-600"
                      : "text-sm text-indigo-500"
                )}>
                  {node.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LearningPlan;
