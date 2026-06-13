import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { promoteConfiguredAdminUser } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { ArticleVisibility } from "@/lib/validations";

import ArticleForm from "@/components/features/admin/article-form";

type EditArticlePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const currentAdminId = session.user.id;

  const admin = await promoteConfiguredAdminUser(currentAdminId);
  if (admin?.role !== "ADMIN") redirect("/dashboard");

  const article = await prisma.article.findUnique({
    where: { id },
  });

  if (!article) {
    notFound();
  }

  const serializedArticle = {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    category: article.category,
    visibility: article.visibility as unknown as ArticleVisibility,
    published: article.published,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Modifier l'article</h1>
        <p className="text-sm text-muted-foreground">
          Modifiez les détails de l'article ci-dessous.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <ArticleForm initialData={serializedArticle} />
      </div>
    </div>
  );
}
