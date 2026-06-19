"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import type { NextEventCardEvent } from "./NextEventCard";

const POPUP_CLOSED_KEY = "ibc-event-popup-closed";

export interface EventPopupProps {
  event: NextEventCardEvent | null;
  enabled: boolean;
}

export function EventPopup({ event, enabled }: EventPopupProps) {
  const [hasClosedBefore, setHasClosedBefore] = useState(() => {
    try {
      return localStorage.getItem(POPUP_CLOSED_KEY) !== null;
    } catch {
      return false;
    }
  });

  const open = enabled && event !== null && !hasClosedBefore;

  const handleClose = () => {
    setHasClosedBefore(true);
    try {
      localStorage.setItem(POPUP_CLOSED_KEY, event?.slug ?? "closed");
    } catch {
      // Ignorer les erreurs de stockage local
    }
  };

  const canShow = event !== null;

  if (!canShow) {
    return null;
  }

  const formattedDate = event.startDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen: boolean) => {
      if (!nextOpen) {
        handleClose();
      }
    }}>
      <DialogContent showCloseButton={false} className="sm:max-w-md border-white/10 bg-[#090D16] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Prochain événement IBC</DialogTitle>
          <DialogDescription className="text-slate-300">
            Rejoignez-nous pour notre prochaine rencontre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <h3 className="text-lg font-semibold text-white">{event.title}</h3>
          <div className="flex flex-col gap-2 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-[#D4A847]" aria-hidden="true" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-[#D4A847]" aria-hidden="true" />
              <span className="line-clamp-2">{event.location}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-[#090D16]/50 border-white/10">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Fermer
          </Button>
          <Link
            href={`/events/${event.slug}`}
            className={buttonVariants({ variant: "default" }) + " bg-[#D4A847] text-black hover:bg-[#D4A847]/90 inline-flex items-center gap-2"}
          >
            En savoir plus
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
