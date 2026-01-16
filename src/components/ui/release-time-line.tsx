"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Package, Calendar, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TimeLine_01Entry = {
  icon?: React.ComponentType<{ className?: string }>;
  logo?: string;
  title: string;
  subtitle: string;
  description: string;
  items?: string[];
  media?: string;
  mediaType?: 'image' | 'video' | 'gif';
  badge?: string;
  button?: {
    url: string;
    text: string;
  };
};

const isVideoFile = (src: string) => {
  const ext = src.split('.').pop()?.toLowerCase();
  return ext === 'mp4' || ext === 'webm' || ext === 'mov';
};

export interface TimeLine_01Props {
  title?: string;
  description?: string;
  entries?: TimeLine_01Entry[];
  className?: string;
}

export const defaultEntries: TimeLine_01Entry[] = [
  {
    icon: Package,
    title: "Advanced Component Pack",
    subtitle: "Version 2.1.0 • Feb 2025",
    description:
      "Ruixen UI now ships with an advanced component pack including complex layouts, enterprise-ready data tables, and animated navigation menus.",
    items: [
      "New Data Grid with sorting, filtering, and pagination",
      "Kanban board with drag-and-drop support",
      "Animated mega menu component",
      "Masonry grid layout for galleries and portfolios",
      "Extended accessibility support across all components",
    ],
    media:
      "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/dashboard-gradient.png",
    button: {
      url: "https://ruixenui.com",
      text: "Explore Components",
    },
  },
  {
    icon: Sparkles,
    title: "Theme Builder & Design Tokens",
    subtitle: "Version 2.0.0 • Jan 2025",
    description:
      "We've introduced a fully customizable theme builder powered by design tokens so you can tailor Ruixen UI to match any brand identity.",
    items: [
      "Real-time theme preview in the dashboard",
      "Customizable color palettes, typography, and spacing",
      "Preset themes for quick project setup",
      "Export tokens to CSS variables or JSON",
    ],
    media:
      "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/featured-01.png",
  },
  {
    icon: Zap,
    title: "Motion & Interaction Update",
    subtitle: "Version 1.8.0 • Dec 2024",
    description:
      "Micro-interactions across Ruixen UI have been enhanced with Framer Motion, delivering a smoother and more engaging user experience.",
    items: [
      "Animated dropdown menus and modals",
      "Smooth transitions between pages",
      "Custom easing curves for a premium feel",
      "Reduced layout shift for better stability",
    ],
    media:
      "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/dashboard-02.png",
  },
  {
    icon: Calendar,
    title: "Initial Pro Release",
    subtitle: "Version 1.5.0 • Oct 2024",
    description:
      "Ruixen UI Pro is here — a premium set of components, templates, and utilities designed for production-grade applications.",
    items: [
      "Full Figma design kit",
      "Extended form components with validation",
      "Chart components with Recharts integration",
      "Ready-to-use dashboard layouts",
    ],
    media:
      "https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/featured-06.png",
    button: {
      url: "https://ruixenui.com/pro",
      text: "View Ruixen UI Pro",
    },
  },
];

/**
 * Behavior: Only the card that is currently centered in the viewport is "open".
 * As you scroll, the active card expands to reveal its full content. Others stay collapsed.
 */
export default function TimeLine_01({
  title = "Ruixen UI Release Notes",
  description = "Stay up to date with the latest components, features, and performance enhancements in Ruixen UI — built to help you design and ship faster.",
  entries = defaultEntries,
}: TimeLine_01Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const sentinelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Create stable setters for refs inside map
  const setItemRef = (el: HTMLDivElement | null, i: number) => {
    itemRefs.current[i] = el;
  };
  const setSentinelRef = (el: HTMLDivElement | null, i: number) => {
    sentinelRefs.current[i] = el;
  };

  useEffect(() => {
    if (!sentinelRefs.current.length) return;

    // We observe small sentinels placed near the title of each card. Whichever
    // sentinel is closest to the vertical center of the viewport becomes active.
    // Using IntersectionObserver to track visibility + a rAF loop to pick the closest.

    let frame = 0;
    const updateActiveByProximity = () => {
      frame = requestAnimationFrame(updateActiveByProximity);
      // Compute distance of each sentinel to viewport center
      const centerY = window.innerHeight / 3;
      let bestIndex = 0;
      let bestDist = Infinity;
      sentinelRefs.current.forEach((node, i) => {
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(mid - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }
      });
      if (bestIndex !== activeIndex) setActiveIndex(bestIndex);
    };

    frame = requestAnimationFrame(updateActiveByProximity);
    return () => cancelAnimationFrame(frame);
  }, [activeIndex]);

  // Optional: ensure the first card is active on mount
  useEffect(() => {
    setActiveIndex(0);
  }, []);

  return (
    <section className="py-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-sm sm:text-base font-semibold text-foreground mb-1.5">
          {title}
        </h1>
        <p className="text-[11px] text-muted-foreground mb-4">
          {description}
        </p>

        <div className="space-y-6">
          {entries.map((entry, index) => {
            const isActive = index === activeIndex;

            return (
              <div
                key={index}
                className="relative flex flex-col gap-3 md:flex-row md:gap-6"
                ref={(el) => setItemRef(el, index)}
                aria-current={isActive ? "true" : "false"}
              >
                {/* Sticky meta column */}
                <div className="top-6 flex h-min w-40 shrink-0 items-center gap-3 md:sticky">
                  <div className="flex items-center gap-3">
                    {entry.logo ? (
                      <div className={`p-1 rounded-md transition-colors overflow-hidden ${
                        isActive ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted"
                      }`}>
                        <Image
                          src={entry.logo}
                          alt={`${entry.title} logo`}
                          width={16}
                          height={16}
                          className="h-4 w-4 object-contain"
                        />
                      </div>
                    ) : entry.icon ? (
                      <div className={`p-1.5 rounded-md transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <entry.icon className="h-3 w-3" />
                      </div>
                    ) : null}
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold">{entry.title}</span>
                      <span className="text-[9px] text-muted-foreground">{entry.subtitle}</span>
                    </div>
                  </div>
                </div>

                {/* Sentinel for scroll detection */}
                <div
                  ref={(el) => setSentinelRef(el, index)}
                  aria-hidden
                  className="absolute -top-24 left-0 h-12 w-12 opacity-0"
                />

                {/* Content column */}
                <article
                  className={
                    "flex flex-col rounded-xl p-4 transition-all duration-500 ease-out min-h-[280px] w-full " +
                    (isActive
                      ? "bg-white/30 dark:bg-zinc-900/30 backdrop-blur-lg shadow-lg scale-100 opacity-100"
                      : "bg-transparent scale-[0.98] opacity-40 blur-[1px]")
                  }
                >
                  {entry.media && (
                    isVideoFile(entry.media) || entry.mediaType === 'video' ? (
                      <video
                        src={entry.media}
                        className="mb-3 w-full h-32 rounded-lg object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <Image
                        src={entry.media}
                        alt={`${entry.title} visual`}
                        width={400}
                        height={128}
                        className="mb-3 w-full h-32 rounded-lg object-cover"
                        loading="lazy"
                      />
                    )
                  )}
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <h2 className={
                          "text-xs font-semibold leading-tight tracking-tight transition-colors duration-200 " +
                          (isActive ? "text-foreground" : "text-foreground/70")
                        }>
                          {entry.title}
                        </h2>
                        {entry.badge && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-semibold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <span className="relative flex h-1 w-1">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1 w-1 bg-amber-500" />
                            </span>
                            {entry.badge}
                          </span>
                        )}
                      </div>
                      <p className={
                        "text-[11px] leading-relaxed transition-all duration-300 " +
                        (isActive ? "text-muted-foreground" : "text-muted-foreground/80 line-clamp-2")
                      }>
                        {entry.description}
                      </p>
                    </div>

                    {/* Expandable content */}
                    <div
                      aria-hidden={!isActive}
                      className={
                        "grid transition-all duration-500 ease-out " +
                        (isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")
                      }
                    >
                      <div className="overflow-hidden">
                        <div className="space-y-3 pt-1.5">
                          {entry.items && entry.items.length > 0 && (
                            <div className="rounded-md border border-gray-200 dark:border-gray-800 bg-gray-100/40 dark:bg-gray-900/40 p-2">
                              <ul className="space-y-1.5">
                                {entry.items.map((item, itemIndex) => (
                                  <li key={itemIndex} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                    <div className="mt-1 h-1 w-1 rounded-full bg-primary/60 flex-shrink-0" />
                                    <span className="leading-relaxed">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {entry.button && (
                            <div className="flex justify-end">
                              <Button
                                variant="default"
                                size="sm"
                                className="group hover:bg-primary hover:text-primary-foreground font-normal transition-all duration-200"
                                asChild
                              >
                                <a href={entry.button.url} target="_blank" rel="noreferrer">
                                  {entry.button.text}
                                  <ArrowUpRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export { TimeLine_01 };
