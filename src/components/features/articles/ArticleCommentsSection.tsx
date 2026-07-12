"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Send, MessageSquare, RefreshCw, Lock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  articleId: string;
  userId: string;
  user: CommentUser;
}

interface ApiComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  articleId: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface ArticleCommentsSectionProps {
  articleId: string;
  userId?: string;
  isAuthorized: boolean;
  isAdmin?: boolean;
}

const MAX_CONTENT_LENGTH = 1000;

export function ArticleCommentsSection({ articleId, userId, isAuthorized, isAdmin = false }: ArticleCommentsSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const fetchComments = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/comments`);
      if (res.status === 401 || res.status === 403) {
        setError("membership-required");
        setComments([]);
        return;
      }
      if (!res.ok) {
        setError("load-failed");
        setComments([]);
        return;
      }
      const data = (await res.json()) as { comments: ApiComment[] };
      setComments(data.comments);
    } catch {
      setError("load-failed");
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    let active = true;
    if (!isAuthorized) {
      setIsLoading(false);
      setError("membership-required");
      return;
    }

    async function load() {
      if (!active) return;
      await fetchComments();
    }

    load();
    return () => {
      active = false;
    };
  }, [isAuthorized, fetchComments]);

  const trimmedContent = content.trim();
  const isContentTooShort = trimmedContent.length < 2;
  const isContentTooLong = content.length > MAX_CONTENT_LENGTH;
  const isSubmittable = trimmedContent.length >= 2 && content.length <= MAX_CONTENT_LENGTH;
  const hasTrimmedContent = trimmedContent.length > 0;
  const nextTooShort = hasTrimmedContent && trimmedContent.length < 2;
  const nextTooLong = content.length > MAX_CONTENT_LENGTH;

  useEffect(() => {
    if (nextTooShort) {
      setValidationError("Le commentaire doit contenir au moins 2 caractères.");
    } else if (nextTooLong) {
      setValidationError(`Le commentaire ne doit pas dépasser ${MAX_CONTENT_LENGTH} caractères.`);
    } else {
      setValidationError(null);
    }
  }, [nextTooShort, nextTooLong]);

  function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getInitials(name: string | null): string {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError(null);

    if (isContentTooShort) {
      setValidationError("Le commentaire doit contenir au moins 2 caractères.");
      return;
    }
    if (isContentTooLong) {
      setValidationError(`Le commentaire ne doit pas dépasser ${MAX_CONTENT_LENGTH} caractères.`);
      return;
    }
    if (!userId) {
      toast.error("Veuillez vous connecter pour commenter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        let message = "Impossible d'envoyer le commentaire.";
        try {
          const payload = (await res.json()) as { error?: string };
          if (payload.error) {
            message = payload.error;
          }
        } catch {
          // ignore parse errors
        }
        if (res.status === 401 || res.status === 403) {
          setError("membership-required");
        }
        toast.error(message);
        setIsSubmitting(false);
        return;
      }

      const created = (await res.json()) as ApiComment;
      setContent("");
      toast.success("Commentaire publié.");
      setComments((prev) => [created, ...prev]);
    } catch {
      toast.error("Une erreur est survenue lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
  }

  function handleEditStart(commentId: string, currentContent: string) {
    setEditingCommentId(commentId);
    setEditingContent(currentContent);
  }

  function handleEditCancel() {
    setEditingCommentId(null);
    setEditingContent("");
  }

  async function handleEditSave(commentId: string) {
    const trimmed = editingContent.trim();
    if (trimmed.length < 2) {
      toast.error("Le commentaire doit contenir au moins 2 caractères.");
      return;
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      toast.error(`Le commentaire ne doit pas dépasser ${MAX_CONTENT_LENGTH} caractères.`);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/comments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content: trimmed }),
      });

      if (!res.ok) {
        let message = "Impossible de modifier le commentaire.";
        try {
          const payload = (await res.json()) as { error?: string };
          if (payload.error) {
            message = payload.error;
          }
        } catch {}
        toast.error(message);
        return;
      }

      const updated = (await res.json()) as ApiComment;
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, content: updated.content, updatedAt: updated.updatedAt }
            : c
        )
      );
      setEditingCommentId(null);
      setEditingContent("");
      toast.success("Commentaire modifié.");
    } catch {
      toast.error("Une erreur est survenue lors de la modification.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) {
      return;
    }

    setIsDeletingId(commentId);
    try {
      const res = await fetch(`/api/articles/${articleId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let message = "Impossible de supprimer le commentaire.";
        try {
          const payload = (await res.json()) as { error?: string };
          if (payload.error) {
            message = payload.error;
          }
        } catch {}
        toast.error(message);
        return;
      }

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                content: "Ce commentaire a été supprimé.",
                userId: "deleted",
                user: { id: "deleted", name: "Membre", image: null },
              }
            : c
        )
      );
      toast.success("Commentaire supprimé.");
    } catch {
      toast.error("Une erreur est survenue lors de la suppression.");
    } finally {
      setIsDeletingId(null);
    }
  }

  const showMembershipCta = error === "membership-required";
  const showLoadError = error === "load-failed";
  const isLoggedIn = Boolean(userId);
  const showLoadErrorBlock = showLoadError && !isLoading;
  const showCommentsBlock = !isLoading && !showLoadError;

  if (!isAuthorized || showMembershipCta) {
    return (
      <section
        data-testid="comments-guest-cta"
        className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e1628] to-[#070b12] p-8 text-center"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#D4A847]/10 text-[#D4A847] mb-6">
          <Lock className="size-6" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-white mb-3">
          Commentaires réservés aux membres actifs
        </h3>
        <p className="text-slate-300 max-w-md mx-auto mb-6 text-sm leading-relaxed">
          Devenez membre actif pour consulter et participer aux discussions.
        </p>
        <Link
          href="/pricing"
          className={cn(
            buttonVariants({ size: "lg" }),
            "cursor-pointer inline-flex bg-[#D4A847] text-black hover:bg-[#D4A847]/90 font-semibold"
          )}
        >
          Voir les abonnements
        </Link>
      </section>
    );
  }

  return (
    <section data-testid="article-comments-section" className="border-t border-white/10 pt-8 space-y-8">
      <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
        <span className="inline-block size-1.5 rounded-full bg-[#D4A847]" />
        Commentaires
      </h2>

      {isLoading ? (
        <div data-testid="comments-loading" className="space-y-4">
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-16 rounded-xl bg-white/5 animate-pulse" />
        </div>
      ) : null}

      {showLoadErrorBlock ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-slate-300 text-sm mb-4">Impossible de charger les commentaires. Veuillez réessayer.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchComments}
            className="border-white/10 text-slate-300 hover:text-white"
          >
            <RefreshCw className="size-4 mr-2" />
            Réessayer
          </Button>
        </div>
      ) : null}

      {showCommentsBlock ? (
        <div className="space-y-4">
          {comments.length > 0 ? (
            <ul className="space-y-4" data-testid="comments-list">
              {comments.map((comment) => {
                const authorName = comment.user.name || "Membre";
                const dateLabel = formatDate(comment.createdAt);
                const isEditing = editingCommentId === comment.id;
                const isDeleting = isDeletingId === comment.id;
                const isAuthor = comment.userId === userId;
                const canDelete = isAuthor || isAdmin;
                const isSoftDeleted = comment.userId === "deleted" || comment.user.id === "deleted";
                const showControls = !isSoftDeleted && (isAuthor || canDelete);

                return (
                  <li
                    key={comment.id}
                    data-testid={`comment-${comment.id}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar size="sm" className="bg-[#D4A847]/10 text-[#D4A847]">
                        <AvatarImage src={comment.user.image || undefined} alt={authorName} />
                        <AvatarFallback className="bg-[#D4A847]/10 text-[#D4A847]">
                          {getInitials(authorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white">{authorName}</span>
                            {dateLabel ? <span className="text-xs text-slate-400">• {dateLabel}</span> : null}
                            {comment.updatedAt !== comment.createdAt && !isSoftDeleted ? (
                              <span className="text-xs text-slate-500 italic">(modifié)</span>
                            ) : null}
                          </div>

                          {showControls && !isEditing ? (
                            <div className="flex items-center gap-2">
                              {isAuthor ? (
                                <button
                                  type="button"
                                  onClick={() => handleEditStart(comment.id, comment.content)}
                                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                  data-testid={`comment-edit-btn-${comment.id}`}
                                >
                                  <Pencil className="size-3" />
                                  Modifier
                                </button>
                              ) : null}
                              {canDelete ? (
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleDelete(comment.id)}
                                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50 transition-colors"
                                  data-testid={`comment-delete-btn-${comment.id}`}
                                >
                                  <Trash2 className="size-3" />
                                  Supprimer
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className="mt-3 space-y-2">
                            <Textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              disabled={isUpdating}
                              rows={2}
                              className="border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus-visible:border-[#D4A847] text-sm"
                              data-testid={`comment-edit-textarea-${comment.id}`}
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleEditCancel}
                                disabled={isUpdating}
                                className="border-white/10 text-slate-300 hover:text-white"
                              >
                                Annuler
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleEditSave(comment.id)}
                                disabled={isUpdating || editingContent.trim().length < 2 || editingContent.length > MAX_CONTENT_LENGTH}
                                className="bg-[#D4A847] text-black hover:bg-[#D4A847]/90 font-semibold"
                                data-testid={`comment-edit-save-${comment.id}`}
                              >
                                {isUpdating ? "Enregistrement..." : "Enregistrer"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="Aucun commentaire"
              description="Soyez le premier à partager votre avis sur cet article."
              icon={MessageSquare}
            />
          )}
        </div>
      ) : null}

      {isLoggedIn ? (
        <form onSubmit={handleSubmit} className="space-y-3" data-testid="comment-form">
          <Label htmlFor="comment-content" className="text-sm font-medium text-slate-200">
            Votre commentaire
          </Label>
          <Textarea
            id="comment-content"
            data-testid="comment-textarea"
            value={content}
            onChange={handleTextareaChange}
            placeholder="Partagez votre réflexion..."
            disabled={isSubmitting}
            rows={4}
            className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-[#D4A847]"
            aria-invalid={validationError ? "true" : "false"}
            aria-describedby={validationError ? "comment-error" : undefined}
          />
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-xs",
                isContentTooLong ? "text-red-400" : "text-slate-400"
              )}
              data-testid="comment-char-count"
            >
              {content.length} / {MAX_CONTENT_LENGTH}
            </span>
            {validationError ? (
              <p id="comment-error" data-testid="comment-validation-error" className="text-xs text-red-400">
                {validationError}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !isSubmittable}
            className="bg-[#D4A847] text-black hover:bg-[#D4A847]/90 font-semibold"
            data-testid="comment-submit-button"
          >
            {isSubmitting ? "Envoi en cours..." : (
              <>
                <Send className="size-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </form>
      ) : (
        <div
          data-testid="comments-login-cta"
          className="rounded-xl border border-white/10 bg-white/5 p-6 text-center"
        >
          <p className="text-slate-300 text-sm">Connectez-vous pour laisser un commentaire.</p>
        </div>
      )}
    </section>
  );
}
