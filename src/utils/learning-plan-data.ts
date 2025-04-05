
// 学習ロードマップのデータを提供するユーティリティ関数

export const getLearningPlanData = () => {
  return {
    title: "データ分析マスターへの道",
    description: "データ分析の基礎から応用までの体系的な学習ロードマップです。",
    nodes: [
      {
        id: "basics",
        title: "データ分析の基礎",
        description: "データ分析の基本概念と重要性を理解する",
        children: [
          {
            id: "data-types",
            title: "データの種類と構造",
            description: "構造化データと非構造化データ、データの形式について学ぶ",
            children: []
          },
          {
            id: "data-collection",
            title: "データ収集手法",
            description: "様々なソースからのデータ収集方法を理解する",
            children: []
          },
          {
            id: "data-cleaning",
            title: "データクレンジング",
            description: "データの前処理、欠損値や外れ値の処理方法を学ぶ",
            children: []
          }
        ]
      },
      {
        id: "statistics",
        title: "統計的手法",
        description: "データ分析に必要な統計的知識を習得する",
        children: [
          {
            id: "descriptive",
            title: "記述統計",
            description: "データの要約、集計、可視化の方法を学ぶ",
            children: []
          },
          {
            id: "inferential",
            title: "推測統計",
            description: "サンプルから母集団を推定する手法を理解する",
            children: []
          },
          {
            id: "hypothesis",
            title: "仮説検定",
            description: "統計的仮説の立て方と検証方法を習得する",
            children: []
          }
        ]
      },
      {
        id: "visualization",
        title: "データ可視化",
        description: "効果的なデータの視覚化手法を学ぶ",
        children: [
          {
            id: "chart-types",
            title: "グラフの種類と選択",
            description: "様々な種類のグラフとその適切な使用場面を理解する",
            children: []
          },
          {
            id: "viz-tools",
            title: "可視化ツール",
            description: "データ可視化に使用される主要なツールの使い方を学ぶ",
            children: []
          }
        ]
      },
      {
        id: "advanced",
        title: "高度な分析手法",
        description: "より複雑なデータ分析手法を習得する",
        children: [
          {
            id: "machine-learning",
            title: "機械学習入門",
            description: "教師あり学習と教師なし学習の基本概念を理解する",
            children: []
          },
          {
            id: "time-series",
            title: "時系列分析",
            description: "時間的に変化するデータの分析手法を学ぶ",
            children: []
          },
          {
            id: "text-analysis",
            title: "テキスト分析",
            description: "非構造化テキストデータの分析手法を理解する",
            children: []
          }
        ]
      }
    ]
  };
};
