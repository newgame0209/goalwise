import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTree, Lightbulb, List, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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
          <TabsTrigger value="tree" className="flex items-center">
            <ListTree className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">KPIツリー</span>
          </TabsTrigger>
          <TabsTrigger value="mindmap" className="flex items-center">
            <Lightbulb className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">マインドマップ</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center">
            <List className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">リスト表示</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tree" className="mt-0">
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
      <Button onClick={handleOpenFullscreen} variant="outline" className="w-full mb-4 flex items-center justify-center">
        <Maximize2 className="mr-2 h-4 w-4" />
        ロードマップを全画面で表示
      </Button>
      
      <Sheet open={openSheet} onOpenChange={setOpenSheet}>
        <SheetContent side="bottom" className="h-[90vh] max-w-full overflow-y-auto sm:max-w-full">
          <SheetHeader className="mb-4">
            <SheetTitle>{planData.title}</SheetTitle>
            <SheetDescription>{planData.description}</SheetDescription>
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
    <div className="space-y-1.5">
      {flattenedNodes.map((node, index) => (
        <div 
          key={node.id} 
          className="p-2 rounded-md hover:bg-muted transition-colors"
          style={{ 
            paddingLeft: `${node.level * 0.75 + 0.5}rem`
          }}
        >
          <h3 className="font-medium text-sm truncate">{node.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{node.description}</p>
        </div>
      ))}
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
            <h3 className="font-medium">{node.title}</h3>
            {node.children && node.children.length > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? '折りたたむ' : '展開する'}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{node.description}</p>
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
    <div className="space-y-4">
      {nodes.map((node) => (
        <TreeNode key={node.id} node={node} level={0} />
      ))}
    </div>
  );
};

const TreeNode = ({ node, level }: { node: PlanNode; level: number }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  
  return (
    <div className="animate-scale-in" style={{ animationDelay: `${level * 50}ms` }}>
      <Card className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg">{node.title}</h3>
            <p className="text-muted-foreground text-sm mt-1">{node.description}</p>
          </div>
          {node.children && node.children.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-0"
            >
              {isExpanded ? '折りたたむ' : '展開する'}
            </Button>
          )}
        </div>
      </Card>
      
      {isExpanded && node.children && node.children.length > 0 && (
        <div className="ml-8 mt-2 pl-4 border-l-2 border-border space-y-2">
          {node.children.map((childNode) => (
            <TreeNode key={childNode.id} node={childNode} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// MindMap component
const MindMap = ({ centerNode }: { centerNode: { title: string, description: string, nodes: PlanNode[] } }) => {
  return (
    <div className="glass rounded-xl min-h-[600px] relative overflow-hidden">
      {/* 背景グリッド */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      
      {/* センターノード */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="bg-primary text-primary-foreground text-lg font-semibold rounded-full px-8 py-4 shadow-lg text-center max-w-[300px] whitespace-normal">
          {centerNode.title.length > 50 
            ? centerNode.title.substring(0, 50) + '...' 
            : centerNode.title
          }
        </div>
      </div>

      {/* 接続線 */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          {centerNode.nodes.map((node, index) => {
            // ノードの配置に使用する角度を計算（均等に配置）
            const totalNodes = centerNode.nodes.length;
            const angleStep = (Math.PI * 2) / totalNodes;
            const angle = angleStep * index;
            
            // 中心からの相対座標
            const centerX = 50;
            const centerY = 50;
            const radius = 30; // 中心からの距離（%）- 小さめの値に設定
            
            // 終点の座標
            const x2 = centerX + radius * Math.cos(angle);
            const y2 = centerY + radius * Math.sin(angle);
            
            return (
              <line
                key={`line-${index}`}
                x1={centerX}
                y1={centerY}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--primary))"
                strokeWidth="0.5"
                strokeDasharray="1"
                className="animate-draw"
                style={{ animationDelay: `${index * 100}ms` }}
              />
            );
          })}
        </svg>
      </div>

      {/* サブノード */}
      <div className="absolute inset-0 p-8 z-0">
        <div className="relative w-full h-full">
          {centerNode.nodes.map((node, index) => {
            // ノードの配置に使用する角度を計算（均等に配置）
            const totalNodes = centerNode.nodes.length;
            const angleStep = (Math.PI * 2) / totalNodes;
            const angle = angleStep * index;
            
            // SVGの座標系（0-100）を使用
            const centerX = 50;
            const centerY = 50;
            const radius = 30; // 小さめの値に設定
            
            // ノードの配置座標（%表記）
            const left = `${centerX + radius * Math.cos(angle)}%`;
            const top = `${centerY + radius * Math.sin(angle)}%`;
            
            // ノードサイズを小さくする
            const nodeWidth = 180; // ピクセル単位

            return (
              <div
                key={node.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left,
                  top,
                  width: `${nodeWidth}px`,
                  maxWidth: '25%',
                  animationDelay: `${index * 150}ms`,
                }}
              >
                <div className="bg-card hover:bg-accent transition-colors p-3 rounded-xl shadow-lg animate-fade-in text-sm">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{node.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{node.description}</p>
                  {node.children && node.children.length > 0 && (
                    <div className="border-t border-border pt-1 mt-1">
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {node.children.slice(0, 2).map(child => (
                          <span
                            key={child.id}
                            className="inline-block text-xs bg-accent/50 px-2 py-1 rounded-full"
                            title={child.title}
                          >
                            {child.title.length > 10 ? child.title.substring(0, 10) + '...' : child.title}
                          </span>
                        ))}
                        {node.children.length > 2 && (
                          <span className="inline-block text-xs bg-primary/20 px-2 py-1 rounded-full">
                            +{node.children.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// カスタムアニメーションのスタイルを追加
const styles = `
@keyframes draw {
  from {
    stroke-dashoffset: 100;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.animate-draw {
  animation: draw 1s ease-in-out forwards;
}

.bg-grid-pattern {
  background-image: radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
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
    <div className="space-y-2">
      {flattenedNodes.map((node, index) => (
        <div 
          key={node.id} 
          className="glass p-3 rounded-lg animate-slide-up"
          style={{ 
            marginLeft: `${node.level * 1.5}rem`,
            animationDelay: `${index * 30}ms`
          }}
        >
          <h3 className="font-medium">{node.title}</h3>
          <p className="text-sm text-muted-foreground">{node.description}</p>
        </div>
      ))}
    </div>
  );
};

export default LearningPlan;
