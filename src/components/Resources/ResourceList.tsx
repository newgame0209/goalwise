import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import * as Icons from 'lucide-react';

import { 
  RelatedResource, 
  ResourceType, 
  extractResourcesFromContent, 
  getRelevantResources,
  groupResourcesByType,
  getResourceTypeLabel,
  getResourceTypeIcon
} from '@/services/resources';
import { ModuleDetail } from '@/services/openai';

// リソースアイコンのマッピング
const ResourceIcon = ({ type }: { type: ResourceType }) => {
  const iconName = getResourceTypeIcon(type);
  const IconComponent = Icons[iconName as keyof typeof Icons] || Icons.Link;
  return <IconComponent className="h-4 w-4" />;
};

// 単一リソースのアイテムコンポーネント
const ResourceItem: React.FC<{ resource: RelatedResource }> = ({ resource }) => {
  return (
    <div className="p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <ResourceIcon type={resource.type} />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-sm">{resource.title}</h4>
            <Badge variant="outline" className="text-xs">
              {getResourceTypeLabel(resource.type)}
            </Badge>
          </div>
          
          {resource.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {resource.description}
            </p>
          )}
          
          <div className="mt-2">
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 text-blue-600 dark:text-blue-400"
              asChild
            >
              <a 
                href={resource.url} 
                target="_blank" 
                rel="noreferrer noopener"
                className="flex items-center"
              >
                訪問する <Icons.ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
          
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {resource.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// グループ化されたリソースのセクションコンポーネント
const ResourceGroup: React.FC<{ 
  title: string, 
  resources: RelatedResource[], 
  type: ResourceType 
}> = ({ title, resources, type }) => {
  if (resources.length === 0) return null;
  
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <ResourceIcon type={type} />
        <h3 className="font-medium text-sm">{title}</h3>
        <Badge variant="outline" className="ml-auto">
          {resources.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {resources.map((resource) => (
          <ResourceItem key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
};

// リソースリストのメインコンポーネント
interface ResourceListProps {
  moduleDetail?: ModuleDetail;
  currentSectionId?: string;
}

const ResourceList: React.FC<ResourceListProps> = ({ moduleDetail, currentSectionId }) => {
  const [resources, setResources] = useState<RelatedResource[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // モジュール詳細からリソースを抽出
  useEffect(() => {
    if (moduleDetail) {
      const extractedResources = extractResourcesFromContent(moduleDetail);
      setResources(extractedResources);
    }
  }, [moduleDetail]);
  
  // リソースが存在しない場合
  if (resources.length === 0) {
    return (
      <Alert>
        <Icons.Info className="h-4 w-4" />
        <AlertDescription>
          このモジュールには関連リソースがありません。
        </AlertDescription>
      </Alert>
    );
  }
  
  // 現在のセクションに関連するリソースを取得
  const relevantResources = currentSectionId 
    ? getRelevantResources(resources, currentSectionId)
    : resources;
  
  // リソースをタイプ別にグループ化
  const groupedResources = groupResourcesByType(resources);
  const groupedRelevantResources = groupResourcesByType(relevantResources);
  
  // 存在するリソースタイプを取得
  const existingTypes = Object.entries(groupedResources)
    .filter(([_, typeResources]) => typeResources.length > 0)
    .map(([type]) => type as ResourceType);
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">関連リソース</CardTitle>
        <CardDescription>
          学習を深めるための参考資料や関連リンク
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="relevant" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="relevant">
              <Icons.Star className="h-4 w-4 mr-2" />
              おすすめ
            </TabsTrigger>
            <TabsTrigger value="all">
              <Icons.List className="h-4 w-4 mr-2" />
              すべて
            </TabsTrigger>
            <TabsTrigger value="bytype">
              <Icons.Tags className="h-4 w-4 mr-2" />
              タイプ別
            </TabsTrigger>
          </TabsList>
          
          {/* おすすめリソース */}
          <TabsContent value="relevant">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {relevantResources.length > 0 ? (
                  relevantResources.map((resource) => (
                    <ResourceItem key={resource.id} resource={resource} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                    このセクションに関連するリソースはありません。
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* すべてのリソース */}
          <TabsContent value="all">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {resources.map((resource) => (
                  <ResourceItem key={resource.id} resource={resource} />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* タイプ別リソース */}
          <TabsContent value="bytype">
            <ScrollArea className="h-[400px] pr-4">
              <div>
                {existingTypes.map((type) => (
                  <ResourceGroup
                    key={type}
                    title={getResourceTypeLabel(type)}
                    resources={groupedResources[type]}
                    type={type}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ResourceList; 