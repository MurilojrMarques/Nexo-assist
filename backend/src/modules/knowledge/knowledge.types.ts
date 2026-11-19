import type { ArticleMatch } from "../../domain/knowledge/article-search.js";

export interface KnowledgeBase {
  search(query: string): Promise<ArticleMatch[]>;
}
