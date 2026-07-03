"use client";

import { usePhase } from "@/lib/usePhase";
import { Phase } from "@/lib/phase";
import FirstVisitForm from "@/components/phases/FirstVisitForm";

export default function Home() {
  const { phase, guestName, isLoading } = usePhase();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-deep-rose font-script italic text-2xl animate-pulse">
          Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      {phase === Phase.FIRST_VISIT && (
        <section className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
          <div className="text-center">
            <h1 className="font-heading text-5xl text-deep-rose mb-2">James &amp; Sharon</h1>
            <p className="font-script italic text-xl text-sage">are getting married!</p>
          </div>
          <FirstVisitForm />
        </section>
      )}

      {phase === Phase.RETURN_VISIT && (
        <section className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <p className="font-heading text-deep-rose text-2xl">
            Welcome back{guestName ? `, ${guestName}` : ""}!
          </p>
          <p className="font-body text-sage text-lg">Countdown hero goes here (Step 6)</p>
        </section>
      )}

      {phase === Phase.WEDDING_DAY && (
        <section className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <p className="font-heading text-deep-rose text-2xl">Phase 3 — Wedding Day! 🎉</p>
          <p className="font-body text-sage text-lg">Live streams + cab booking goes here</p>
        </section>
      )}

      {phase === Phase.POST_WEDDING && (
        <section className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <p className="font-heading text-deep-rose text-2xl">Phase 4 — Post Wedding</p>
          <p className="font-body text-sage text-lg">Thank you + wedding gallery goes here</p>
        </section>
      )}
    </main>
  );
}
