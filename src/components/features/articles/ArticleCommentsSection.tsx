"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Send, MessageSquare, RefreshCw, Lock } from "lucide-react";
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
}

const MAX_CONTENT_LENGTH = 1000;

export function ArticleCommentsSection({ articleId, userId, isAuthorized }: ArticleCommentsSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{authorName}</span>
                          {dateLabel ? <span className="text-xs text-slate-400">• {dateLabel}</span> : null}
                        </div>
                        <p className="mt-2 text-sm text-slate-200 whitespace-pre-wrap">{comment.content}</p>
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
