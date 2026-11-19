import type { TicketCategory } from "../service-desk/types.js";

export type Article = {
  slug: string;
  title: string;
  content: string;
  category: TicketCategory | null;
  tags: string[];
};

export type ArticleMatch = {
  article: Article;
  score: number;
};

export const RELEVANT_ARTICLE_SCORE = 0.34;

const STOPWORDS = new Set(
  "a o as os um uma uns umas de do da dos das no na nos nas em por para com sem que se e ou mas meu minha meus minhas seu sua eu voce ele ela nao sim ja esta estou isso essa esse este ta to ao aos como quando qual quais pra pro tem ter foi ser sou me mim nosso nossa la ai aqui oi ola bom boa dia tarde noite favor obrigado obrigada".split(
    " ",
  ),
);

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function terms(text: string): string[] {
  return [...new Set(normalize(text).split(" "))].filter((term) => term.length > 1 && !STOPWORDS.has(term));
}

function words(text: string): Set<string> {
  return new Set(normalize(text).split(" "));
}

function matches(vocabulary: Set<string>, term: string): boolean {
  if (vocabulary.has(term)) {
    return true;
  }

  return (
    term.length >= 5 &&
    [...vocabulary].some((word) => word.length >= 5 && (word.startsWith(term.slice(0, 5)) || term.startsWith(word.slice(0, 5))))
  );
}

export function searchArticles(articles: Article[], query: string, limit = 3): ArticleMatch[] {
  const queryTerms = terms(query);

  if (queryTerms.length === 0) {
    return [];
  }

  return articles
    .map((article) => {
      const tags = words(article.tags.join(" "));
      const title = words(article.title);
      const content = words(article.content);
      const points = queryTerms.reduce((total, term) => {
        if (matches(tags, term)) {
          return total + 3;
        }

        if (matches(title, term)) {
          return total + 2;
        }

        return matches(content, term) ? total + 1 : total;
      }, 0);

      return { article, score: Math.round((points / (3 * queryTerms.length)) * 100) / 100 };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
