"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArticleVisibility } from "@/lib/validations";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  visibility: ArticleVisibility;
  published: boolean;
  createdAt: string | Date;
  author?: {
    name: string | null;
  } | null;
};

type ArticlesListTableProps = {
  articles: Article[];
};

export default function ArticlesListTable({ articles }: ArticlesListTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>("");

  const handleTogglePublish = (article: Article) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/articles/${article.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            published: !article.published,
          }),
        });

        if (!res.ok) {
          const body = await res.json();
          toast.error(body.error ?? "Impossible de modifier le statut de publication.");
          return;
        }

        toast.success(
          article.published ? "Article retiré de la publication." : "Article publié avec succès."
        );
        router.refresh();
      } catch {
        toast.error("Erreur réseau. Veuillez réessayer.");
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteId) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/articles/${deleteId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const body = await res.json();
          toast.error(body.error ?? "Impossible de supprimer l'article.");
          return;
        }

        toast.success("Article supprimé avec succès.");
        setDeleteId(null);
        router.refresh();
      } catch {
        toast.error("Erreur réseau. Veuillez réessayer.");
      }
    });
  };

  const renderVisibilityBadge = (visibility: ArticleVisibility) => {
    switch (visibility) {
      case ArticleVisibility.PUBLIC:
        return (
          <Badge className="border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100">
            Public
          </Badge>
        );
      case ArticleVisibility.AFFRANCHI:
        return (
          <Badge className="border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-100">
            Affranchi
          </Badge>
        );
      case ArticleVisibility.GRAND_FRERE:
        return (
          <Badge className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            Grand Frère
          </Badge>
        );
      case ArticleVisibility.BOSS:
        return (
          <Badge className="border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100">
            Boss
          </Badge>
        );
      default:
        return <Badge>{visibility}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Visibilité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Aucun article trouvé.
                </TableCell>
              </TableRow>
            ) : null}

            {articles.map((article) => {
              const formattedDate = new Date(article.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <TableRow key={article.id} data-testid={`article-row-${article.id}`}>
                  <TableCell className="font-medium max-w-xs truncate" title={article.title}>
                    {article.title}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border">
                      {article.category}
                    </span>
                  </TableCell>
                  <TableCell>{renderVisibilityBadge(article.visibility)}</TableCell>
                  <TableCell>
                    {article.published ? (
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800">
                        Publié
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Brouillon</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formattedDate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleTogglePublish(article)}
                        data-testid={`publish-btn-${article.id}`}
                      >
                        {article.published ? "Dépublier" : "Publier"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <Link href={`/admin/articles/${article.id}/edit`} />
                        }
                        data-testid={`edit-btn-${article.id}`}
                      >
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          setDeleteId(article.id);
                          setDeleteTitle(article.title);
                        }}
                        data-testid={`delete-btn-${article.id}`}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement l'article{" "}
              <strong>"{deleteTitle}"</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => setDeleteId(null)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-11"
              onClick={handleDeleteConfirm}
              disabled={isPending}
              data-testid="confirm-delete-btn"
            >
              {isPending ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
