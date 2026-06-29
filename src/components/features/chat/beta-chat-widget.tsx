"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageCircle,
  Send,
  X,
  Loader2,
  AlertCircle,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MAX_CONTENT_LENGTH = 5000;
const ONLINE_THRESHOLD_MS = 30 * 60 * 1000;
const UNREAD_REFRESH_INTERVAL_MS = 60 * 1000;

const CATEGORIES = [
  { value: "bug_technique", label: "Bogue" },
  { value: "accessibilite", label: "Accessibilité" },
  { value: "demande_integration", label: "Intégration" },
  { value: "autre", label: "Autre" },
];

type ChatMessageAuthor = "MEMBER" | "SYSTEM" | "HERMES";

type ChatMessage = {
  id: string;
  userId: string;
  author: ChatMessageAuthor;
  status?: string;
  category?: string | null;
  content: string;
  replyToId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function authorLabel(author: ChatMessageAuthor) {
  switch (author) {
    case "MEMBER":
      return "Vous";
    case "SYSTEM":
      return "Système";
    case "HERMES":
      return "Équipe IBC";
    default:
      return author;
  }
}

function authorBubbleClass(author: ChatMessageAuthor) {
  switch (author) {
    case "MEMBER":
      return "bg-primary text-primary-foreground self-end";
    case "SYSTEM":
      return "bg-muted text-muted-foreground self-start";
    case "HERMES":
      return "bg-secondary text-secondary-foreground self-start";
    default:
      return "bg-muted self-start";
  }
}

function isMessageComplete(
  item: ChatMessage | null | undefined
): item is ChatMessage {
  if (item == null) {
    return false;
  }
  if (typeof item !== "object") {
    return false;
  }
  const message = item as Record<string, unknown>;
  const hasId =
    typeof message.id === "string" ? Boolean(message.id) : false;
  const hasAuthor =
    typeof message.author === "string" ? Boolean(message.author) : false;
  const hasContent = typeof message.content === "string";
  const hasCreatedAt = typeof message.createdAt === "string";
  const hasIdAndAuthor = hasId ? hasAuthor : false;
  const hasContentAndCreatedAt = hasContent ? hasCreatedAt : false;
  return hasIdAndAuthor ? hasContentAndCreatedAt : false;
}

function isOnlineStatus(messages: ChatMessage[]) {
  const hermesMessages = messages.filter((m) => m.author === "HERMES");
  if (hermesMessages.length === 0) {
    return false;
  }
  const lastHermes = hermesMessages.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  if (!lastHermes) {
    return false;
  }

  return (
    Date.now() - new Date(lastHermes.createdAt).getTime() < ONLINE_THRESHOLD_MS
  );
}

export default function BetaChatWidget() {
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated";
  const hasUser = Boolean(session?.user?.id);
  const isAuthenticated = authenticated ? hasUser : false;

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(CATEGORIES[0].value);
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contentLength = useMemo(() => content.length, [content]);
  const contentTooLong = contentLength > MAX_CONTENT_LENGTH;
  const notTooLong = !contentTooLong;
  const trimmedContent = content.trim();
  const contentNotEmpty = trimmedContent.length > 0;
  const hasContent = contentNotEmpty;
  const formValid = hasContent ? notTooLong : false;
  const notSubmitting = !submitting;
  const canSubmit = formValid ? notSubmitting : false;

  const online = useMemo(() => isOnlineStatus(messages), [messages]);
  const statusLabel = online ? "En ligne" : "Hors ligne";

  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      // Ignore environments where scrollIntoView is not available (tests).
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/chat/messages?page=1&limit=50");
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(
          payload.error ?? "Erreur lors du chargement de l'historique"
        );
      }
      const payload = await res.json();
      const fetched: ChatMessage[] = (payload.data.messages ?? []).filter(
        isMessageComplete
      );
      const sorted = [...fetched].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setMessages(sorted);
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchUnread = async () => {
    try {
      const res = await fetch("/api/chat/unread");
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error ?? "Erreur unread");
      }
      const payload = await res.json();
      setUnreadCount(payload.data.unreadCount ?? 0);
    } catch {
      // Ne pas polluer l'interface si le compteur échoue discrètement.
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || open || !mounted) {
      return;
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, UNREAD_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, open, mounted]);

  useEffect(() => {
    if (!open) {
      return;
    }

    fetchHistory();
    fetchUnread();
    // Reset local unread badge when the widget is opened.
    setUnreadCount(0);
  }, [open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !category) {
      return;
    }

    setSubmitting(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, content: content.trim() }),
      });

      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error ?? "Erreur lors de l'envoi");
      }

      const payload = await res.json();
      const memberMessage = payload.data.message;
      const ackMessage = payload.data.ack;
      const newMessages: ChatMessage[] = [];
      if (isMessageComplete(memberMessage)) {
        newMessages.push(memberMessage);
      }
      if (isMessageComplete(ackMessage)) {
        newMessages.push(ackMessage);
      }
      setMessages((prev) =>
        [...prev, ...newMessages].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      );
      setContent("");
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "Erreur inconnue"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setHistoryError(null);
      setUnreadCount(0);
    }
  };

  const widgetVisible = isAuthenticated;
  const showBadge = unreadCount > 0;
  const textareaDescribedBy = contentTooLong
    ? "chat-counter chat-error"
    : "chat-counter";
  const hasNoMessages = messages.length === 0;
  const notLoadingHistory = !loadingHistory;
  const noHistoryError = !historyError;
  const showEmptyState =
    hasNoMessages ? (notLoadingHistory ? noHistoryError : false) : false;
  const showMessages = messages.length > 0;
  const showError = Boolean(historyError);
  const showLoadingHistory = loadingHistory ? hasNoMessages : false;

  if (!widgetVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger
          render={
            <Button
              aria-label="Ouvrir le chat de support bêta"
              className="relative h-14 w-14 rounded-full shadow-lg"
              size="icon-lg"
              variant="default"
            />
          }
        >
          <MessageCircle className="h-6 w-6" />
          {showBadge ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </SheetTrigger>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="chat-sheet-wrapper"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SheetContent
                side="left"
                className="flex h-[85vh] w-full flex-col sm:max-w-md md:h-[80vh]"
                showCloseButton={false}
              >
                <SheetHeader className="shrink-0 space-y-2 border-b pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SheetTitle>Chat de support</SheetTitle>
                      <Badge variant="outline">Bêta</Badge>
                    </div>
                    <SheetDescription className="sr-only">
                      Fenêtre de chat pour remonter un bug, un problème
                      d'accessibilité, une demande d'intégration ou un
                      feedback.
                    </SheetDescription>
                    <Button
                      aria-label="Fermer le chat"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    🚧 Plateforme en phase bêta — Votre feedback nous aide à
                    nous améliorer
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        online ? "bg-green-500" : "bg-slate-400"
                      )}
                      aria-hidden="true"
                    />
                    <span>{statusLabel}</span>
                  </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-1 py-3">
                  {showLoadingHistory ? (
                    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement de l'historique…
                    </div>
                  ) : null}

                  {showError ? (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{historyError}</p>
                    </div>
                  ) : null}

                  {showEmptyState ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                      <MessageCircle className="mb-2 h-8 w-8 opacity-50" />
                      <p>Aucun message pour l'instant.</p>
                      <p>Envoyez votre première remarque ci-dessous.</p>
                    </div>
                  ) : null}

                  {showMessages ? (
                    <div className="flex flex-col gap-3">
                      {messages.map((message) => {
                        const categoryLabel = message.category
                          ? CATEGORIES.find((c) => c.value === message.category)
                              ?.label ?? message.category
                          : null;
                        const isMember = message.author === "MEMBER";
                        const isHermes = message.author === "HERMES";
                        const isSystem = message.author === "SYSTEM";
                        const showCategoryLabel =
                          isMember ? Boolean(categoryLabel) : false;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex max-w-[85%] flex-col rounded-xl px-3 py-2 text-sm",
                              authorBubbleClass(message.author)
                            )}
                          >
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs opacity-80">
                              <span className="font-medium">
                                {authorLabel(message.author)}
                              </span>
                              <span>{formatTime(message.createdAt)}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {showCategoryLabel ? (
                              <span className="mt-1 text-[10px] opacity-70">
                                {categoryLabel}
                              </span>
                            ) : null}
                            {isSystem ? (
                              <span className="mt-1 flex items-center gap-1 text-[10px] opacity-70">
                                <Check className="h-3 w-3" />
                                Accusé de réception
                              </span>
                            ) : null}
                            {isHermes ? (
                              <span className="mt-1 text-[10px] opacity-70">
                                Réponse de l'équipe
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : null}
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="shrink-0 space-y-3 border-t pt-3"
                >
                  <div className="space-y-1.5">
                    <Label id="chat-category-label">Catégorie</Label>
                    <div
                      role="radiogroup"
                      aria-labelledby="chat-category-label"
                      className="flex flex-wrap gap-2"
                    >
                      {CATEGORIES.map((cat) => {
                        const selected = category === cat.value;
                        return (
                          <Button
                            key={cat.value}
                            type="button"
                            variant={selected ? "default" : "outline"}
                            size="sm"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setCategory(cat.value)}
                          >
                            {cat.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="chat-message" className="sr-only">
                      Votre message
                    </Label>
                    <Textarea
                      id="chat-message"
                      placeholder="Décrivez votre bug, remarque ou demande…"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      maxLength={MAX_CONTENT_LENGTH}
                      rows={3}
                      aria-describedby={textareaDescribedBy}
                      disabled={submitting}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span
                        id="chat-counter"
                        className={cn(
                          contentTooLong
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {contentLength}/{MAX_CONTENT_LENGTH}
                      </span>
                      {contentTooLong ? (
                        <span id="chat-error" className="text-destructive">
                          Message trop long
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!canSubmit}
                    aria-busy={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </form>
              </SheetContent>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Sheet>
    </div>
  );
}
