import { ModuleDetail, ModuleSection } from '@/services/openai';

// リソースタイプの定義
export enum ResourceType {
  OFFICIAL_DOCUMENTATION = 'official_documentation',
  TUTORIAL = 'tutorial',
  EXAMPLE = 'example',
  ARTICLE = 'article',
  VIDEO = 'video',
  GITHUB = 'github',
  COMMUNITY = 'community',
  BOOK = 'book',
  OTHER = 'other'
}

// 関連リソースの型定義
export interface RelatedResource {
  id: string;
  title: string;
  url: string;
  description: string;
  type: ResourceType;
  relevance: number; // 0-100の関連度
  sectionId?: string; // 特定のセクションに関連するリソース
  tags?: string[]; // タグ
}

/**
 * AI生成コンテンツからリソースを抽出する関数
 * @param moduleDetail モジュール詳細
 * @returns 抽出されたリソースの配列
 */
export const extractResourcesFromContent = (moduleDetail: ModuleDetail): RelatedResource[] => {
  if (!moduleDetail) return [];
  
  const resources: RelatedResource[] = [];
  
  // モジュール全体のリソースを追加（あれば）
  if (moduleDetail.resources && Array.isArray(moduleDetail.resources)) {
    moduleDetail.resources.forEach((resource, index) => {
      if (isValidResource(resource)) {
        resources.push({
          id: `module-resource-${index}`,
          title: resource.title || 'リソース',
          url: resource.url,
          description: resource.description || '',
          type: mapResourceType(resource.type),
          relevance: resource.relevance || 80, // デフォルトは高い関連度
          tags: resource.tags || []
        });
      }
    });
  }
  
  // 各セクションのリソースを追加
  if (moduleDetail.sections && Array.isArray(moduleDetail.sections)) {
    moduleDetail.sections.forEach((section, sectionIndex) => {
      if (section.resources && Array.isArray(section.resources)) {
        section.resources.forEach((resource, resourceIndex) => {
          if (isValidResource(resource)) {
            resources.push({
              id: `section-${sectionIndex}-resource-${resourceIndex}`,
              title: resource.title || `${section.title}のリソース`,
              url: resource.url,
              description: resource.description || '',
              type: mapResourceType(resource.type),
              relevance: resource.relevance || 70,
              sectionId: section.id,
              tags: resource.tags || []
            });
          }
        });
      }
    });
  }
  
  return resources;
};

/**
 * リソースの有効性をチェックする関数
 * @param resource リソースオブジェクト
 * @returns 有効なリソースかどうか
 */
const isValidResource = (resource: any): boolean => {
  return resource && typeof resource === 'object' && resource.url && typeof resource.url === 'string';
};

/**
 * リソースタイプを標準化する関数
 * @param type 入力されたタイプ文字列
 * @returns 標準化されたResourceType
 */
const mapResourceType = (type: string | undefined): ResourceType => {
  if (!type) return ResourceType.OTHER;
  
  const typeStr = type.toLowerCase();
  
  if (typeStr.includes('doc') || typeStr.includes('公式')) return ResourceType.OFFICIAL_DOCUMENTATION;
  if (typeStr.includes('tutorial') || typeStr.includes('チュートリアル')) return ResourceType.TUTORIAL;
  if (typeStr.includes('example') || typeStr.includes('例')) return ResourceType.EXAMPLE;
  if (typeStr.includes('article') || typeStr.includes('記事')) return ResourceType.ARTICLE;
  if (typeStr.includes('video') || typeStr.includes('動画')) return ResourceType.VIDEO;
  if (typeStr.includes('github') || typeStr.includes('リポジトリ')) return ResourceType.GITHUB;
  if (typeStr.includes('community') || typeStr.includes('コミュニティ')) return ResourceType.COMMUNITY;
  if (typeStr.includes('book') || typeStr.includes('本')) return ResourceType.BOOK;
  
  return ResourceType.OTHER;
};

/**
 * コンテキストに最も関連性の高いリソースをフィルタリングする関数
 * @param resources すべてのリソース
 * @param currentSectionId 現在表示中のセクションID
 * @param limit 取得する最大数
 * @returns フィルタリングされたリソース
 */
export const getRelevantResources = (
  resources: RelatedResource[],
  currentSectionId?: string,
  limit: number = 5
): RelatedResource[] => {
  if (!resources || resources.length === 0) return [];
  
  let filteredResources = [...resources];
  
  // 現在のセクションに関連するリソースを優先
  if (currentSectionId) {
    // 現在のセクションに関連するリソースを最も関連性が高いとみなす
    filteredResources = filteredResources.map(resource => {
      if (resource.sectionId === currentSectionId) {
        return { ...resource, relevance: Math.min(resource.relevance + 20, 100) };
      }
      return resource;
    });
  }
  
  // 関連度の高い順にソート
  filteredResources.sort((a, b) => b.relevance - a.relevance);
  
  // 上位n件を返す
  return filteredResources.slice(0, limit);
};

/**
 * リソースをタイプごとにグループ化する関数
 * @param resources リソースの配列
 * @returns タイプごとにグループ化されたリソース
 */
export const groupResourcesByType = (resources: RelatedResource[]): Record<ResourceType, RelatedResource[]> => {
  const groupedResources: Record<ResourceType, RelatedResource[]> = {
    [ResourceType.OFFICIAL_DOCUMENTATION]: [],
    [ResourceType.TUTORIAL]: [],
    [ResourceType.EXAMPLE]: [],
    [ResourceType.ARTICLE]: [],
    [ResourceType.VIDEO]: [],
    [ResourceType.GITHUB]: [],
    [ResourceType.COMMUNITY]: [],
    [ResourceType.BOOK]: [],
    [ResourceType.OTHER]: []
  };
  
  resources.forEach(resource => {
    groupedResources[resource.type].push(resource);
  });
  
  return groupedResources;
};

/**
 * リソースタイプの日本語表示名を取得する関数
 * @param type リソースタイプ
 * @returns 日本語表示名
 */
export const getResourceTypeLabel = (type: ResourceType): string => {
  switch (type) {
    case ResourceType.OFFICIAL_DOCUMENTATION:
      return '公式ドキュメント';
    case ResourceType.TUTORIAL:
      return 'チュートリアル';
    case ResourceType.EXAMPLE:
      return '実装例';
    case ResourceType.ARTICLE:
      return '記事';
    case ResourceType.VIDEO:
      return '動画';
    case ResourceType.GITHUB:
      return 'GitHub';
    case ResourceType.COMMUNITY:
      return 'コミュニティ';
    case ResourceType.BOOK:
      return '書籍';
    case ResourceType.OTHER:
      return 'その他';
    default:
      return 'リソース';
  }
};

/**
 * リソースタイプに対応するアイコン名を取得する関数
 * @param type リソースタイプ
 * @returns アイコン名
 */
export const getResourceTypeIcon = (type: ResourceType): string => {
  switch (type) {
    case ResourceType.OFFICIAL_DOCUMENTATION:
      return 'file-text';
    case ResourceType.TUTORIAL:
      return 'book-open';
    case ResourceType.EXAMPLE:
      return 'code';
    case ResourceType.ARTICLE:
      return 'file';
    case ResourceType.VIDEO:
      return 'video';
    case ResourceType.GITHUB:
      return 'github';
    case ResourceType.COMMUNITY:
      return 'users';
    case ResourceType.BOOK:
      return 'book';
    case ResourceType.OTHER:
      return 'link';
    default:
      return 'link';
  }
}; 