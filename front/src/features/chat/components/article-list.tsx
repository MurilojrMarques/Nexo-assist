import { BookOpen } from "lucide-react";
import type { HelpArticle } from "@/features/chat/types";

type ArticleListProps = {
  articles: HelpArticle[];
};

export function ArticleList({ articles }: ArticleListProps) {
  return (
    <section
      aria-label="Artigos da central de ajuda"
      className="w-full rounded-xl bg-white px-3.5 py-3 outline outline-line sm:w-[76.92%]"
    >
      <p className="pb-1.5 text-[12.5px] font-medium text-muted">Central de ajuda</p>
      <ul className="flex flex-col gap-1.5">
        {articles.map((article) => (
          <li key={article.slug} className="flex items-start gap-2 text-[14px]/5 text-ink">
            <BookOpen aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-link" />
            {article.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
