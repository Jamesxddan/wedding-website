"use client";

import { motion, type Variants } from "motion/react";

type AnimVariant =
  | "fade-up"       // Default — rises and fades in
  | "fade-left"     // Slides in from left
  | "fade-right"    // Slides in from right
  | "pop"           // Scale bounce in
  | "blur-in"       // Unblurs while fading up
  | "stagger"       // Stagger children
  | "draw-line";    // For timeline/SVG paths

interface AnimatedSectionProps {
  children: React.ReactNode;
  variant?: AnimVariant;
  delay?: number;
  className?: string;
  as?: "section" | "div";
  id?: string;
}

const variants: Record<AnimVariant, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-left": {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
  "fade-right": {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
  pop: {
    hidden: { opacity: 0, scale: 0.85 },
    visible: { opacity: 1, scale: 1 },
  },
  "blur-in": {
    hidden: { opacity: 0, filter: "blur(12px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
  stagger: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.08 },
    },
  },
  "draw-line": {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
    },
  },
};

const defaultTransition = {
  duration: 0.7,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export default function AnimatedSection({
  children,
  variant = "fade-up",
  delay = 0,
  className = "",
  as = "section",
  id,
}: AnimatedSectionProps) {
  const Tag = motion[as === "section" ? "section" : "div"];

  return (
    <Tag
      id={id}
      className={className}
      variants={variants[variant]}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...defaultTransition, delay }}
    >
      {children}
    </Tag>
  );
}
