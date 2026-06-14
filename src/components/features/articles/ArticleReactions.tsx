"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { ThumbsUp, Heart, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ArticleReactionsProps {
  articleId: string;
  isLoggedIn: boolean;
}

type ReactionType = "LIKE" | "CLAP" | "INSIGHTFUL";

interface ReactionCounts {
  LIKE: number;
  CLAP: number;
  INSIGHTFUL: number;
}

export function ArticleReactions({ articleId, isLoggedIn }: ArticleReactionsProps) {
  const [reactions, setReactions] = useState<ReactionCounts>({
    LIKE: 0,
    CLAP: 0,
    INSIGHTFUL: 0,
  });
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchReactions() {
      try {
        const res = await fetch(`/api/articles/${articleId}/reactions`);
        if (res.ok && active) {
          const data = await res.json();
          setReactions(data.reactions);
          setUserReaction(data.userReaction);
        }
      } catch (err) {
        console.error("Failed to fetch article reactions:", err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    fetchReactions();
    return () => {
      active = false;
    };
  }, [articleId]);

  const handleReact = async (type: ReactionType) => {
    if (!isLoggedIn) {
      toast.error("Veuillez vous connecter pour réagir aux articles.", {
        description: "Rejoignez l'Ivoire Business Club pour participer.",
      });
      return;
    }

    if (isPending) return;
    setIsPending(true);

    // Optimistic Update
    const previousReactions = { ...reactions };
    const previousUserReaction = userReaction;

    let nextUserReaction: ReactionType | null = type;
    const nextReactions = { ...reactions };

    if (userReaction === type) {
      // Toggle off
      nextUserReaction = null;
      nextReactions[type] = Math.max(0, nextReactions[type] - 1);
    } else {
      // Toggle on or switch
      if (userReaction) {
        nextReactions[userReaction] = Math.max(0, nextReactions[userReaction] - 1);
      }
      nextUserReaction = type;
      nextReactions[type] = nextReactions[type] + 1;
    }

    setReactions(nextReactions);
    setUserReaction(nextUserReaction);

    try {
      const res = await fetch(`/api/articles/${articleId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        throw new Error("API call failed");
      }
    } catch (err) {
      console.error("Failed to react to article:", err);
      // Revert optimistic update
      setReactions(previousReactions);
      setUserReaction(previousUserReaction);
      toast.error("Une erreur s'est produite lors de l'enregistrement de votre réaction.");
    } finally {
      setIsPending(false);
    }
  };

  const reactionOptions = [
    {
      type: "LIKE" as ReactionType,
      label: "J'aime",
      icon: ThumbsUp,
      activeColor: "text-blue-500",
      activeBg: "bg-blue-500/10 border-blue-500/30",
      hoverColor: "hover:text-blue-400 hover:bg-blue-500/5 hover:border-blue-500/20",
    },
    {
      type: "CLAP" as ReactionType,
      label: "Bravo",
      icon: Heart,
      activeColor: "text-red-500",
      activeBg: "bg-red-500/10 border-red-500/30",
      hoverColor: "hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20",
    },
    {
      type: "INSIGHTFUL" as ReactionType,
      label: "Inspirant",
      icon: Sparkles,
      activeColor: "text-amber-500",
      activeBg: "bg-amber-500/10 border-amber-500/30",
      hoverColor: "hover:text-amber-400 hover:bg-amber-500/5 hover:border-amber-500/20",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 py-4 animate-pulse">
        <div className="h-8 w-20 bg-slate-800 rounded-full" />
        <div className="h-8 w-20 bg-slate-800 rounded-full" />
        <div className="h-8 w-20 bg-slate-800 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Réactions communautaires
      </h4>
      <div className="flex items-center gap-3 flex-wrap">
        {reactionOptions.map((option) => {
          const isActive = userReaction === option.type;
          const count = reactions[option.type];
          const Icon = option.icon;

          return (
            <motion.button
              key={option.type}
              onClick={() => handleReact(option.type)}
              whileHover={isLoggedIn ? { scale: 1.05 } : undefined}
              whileTap={isLoggedIn ? { scale: 0.95 } : undefined}
              aria-pressed={isActive}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors",
                isLoggedIn ? "cursor-pointer" : "cursor-not-allowed opacity-50",
                isActive
                  ? cn("border-solid", option.activeBg, option.activeColor)
                  : cn("border-white/10 bg-transparent text-slate-400 border-dashed", isLoggedIn && option.hoverColor)
              )}
              aria-label={`${option.label} (${count} réactions)`}
            >
              <motion.span
                animate={isActive ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Icon className={cn("size-4", isActive && "fill-current")} />
              </motion.span>
              <span>{count}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
