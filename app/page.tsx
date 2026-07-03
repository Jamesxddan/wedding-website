import { COUPLE } from "@/lib/constants";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="font-heading text-5xl text-deep-rose">
        {COUPLE.groom} &amp; {COUPLE.bride}
      </h1>
      <p className="font-script italic text-2xl text-sage">
        October 8th, 2026
      </p>
    </main>
  );
}
