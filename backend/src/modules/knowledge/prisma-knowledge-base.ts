import { searchArticles, type ArticleMatch } from "../../domain/knowledge/article-search.js";
import type { Database } from "../../infra/database/prisma-client.js";
import type { KnowledgeBase } from "./knowledge.types.js";

export class PrismaKnowledgeBase implements KnowledgeBase {
  constructor(private readonly db: Database) {}

  async search(query: string): Promise<ArticleMatch[]> {
    const articles = await this.db.knowledgeArticle.findMany({
      select: { slug: true, title: true, content: true, category: true, tags: true },
    });

    return searchArticles(articles, query);
  }
}
