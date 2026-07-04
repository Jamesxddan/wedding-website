"use client";

import { GISCUS_CONFIG } from "@/lib/constants";
import Giscus from "@giscus/react";
import YoutubeComments from "@/components/sections/YoutubeComments";
import Reveal from "@/components/ui/Reveal";

const isConfigured =
  !!GISCUS_CONFIG.repo &&
  !!GISCUS_CONFIG.repoId &&
  !!GISCUS_CONFIG.category &&
  !!GISCUS_CONFIG.categoryId;

export default function Comments() {
  return (
    <section id="comments" className="py-24 px-6 bg-cream">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <h2 className="font-heading text-4xl md:text-5xl text-deep-rose text-center mb-4">
            Leave a Blessing
          </h2>
          <p className="font-script italic text-sage text-center text-xl mb-12">
            Your words mean the world to us
          </p>
        </Reveal>

        {isConfigured ? (
          <Giscus
            repo={GISCUS_CONFIG.repo}
            repoId={GISCUS_CONFIG.repoId}
            category={GISCUS_CONFIG.category}
            categoryId={GISCUS_CONFIG.categoryId}
            mapping="specific"
            term="Wedding Blessings — James & Sharon"
            reactionsEnabled="1"
            emitMetadata="0"
            inputPosition="top"
            theme="light"
            lang="en"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-center border border-dashed border-champagne rounded-2xl bg-white">
            <div className="w-16 h-16 rounded-full bg-blush/40 flex items-center justify-center text-3xl">
              💬
            </div>
            <p className="font-heading text-deep-rose text-lg">Comments coming soon</p>
            <p className="font-body text-deep-rose/60 text-sm max-w-sm">
              The blessings section will appear here once we connect our GitHub
              Discussions. Check back closer to the wedding!
            </p>
            <a
              href="https://giscus.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-body text-sage underline underline-offset-2 hover:text-deep-rose transition-colors"
            >
              Powered by Giscus
            </a>
          </div>
        )}

        <YoutubeComments />
      </div>
    </section>
  );
}
