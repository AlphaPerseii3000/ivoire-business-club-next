type PlatinumConfettiProps = {
  show: boolean;
};

export function PlatinumConfetti({ show }: PlatinumConfettiProps) {
  return show ? (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex max-w-sm justify-center motion-reduce:hidden" aria-hidden="true" data-testid="platinum-confetti">
      <div className="relative h-20 w-48 overflow-hidden rounded-full">
        <span className="absolute left-6 top-4 h-2 w-2 rounded-full bg-yellow-400 motion-safe:animate-bounce" />
        <span className="absolute left-20 top-2 h-2 w-2 rounded-full bg-teal-500 motion-safe:animate-ping" />
        <span className="absolute right-10 top-8 h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-bounce" />
        <span className="absolute right-24 top-12 h-2 w-2 rounded-full bg-yellow-300 motion-safe:animate-pulse" />
        <span className="sr-only">Membre Platinum débloqué</span>
      </div>
    </div>
  ) : null;
}
