"use client";

import type { CSSProperties } from "react";
import { BadgeCheck, User } from "lucide-react";

import styles from "@/components/onboarding/slides/review-carousel.module.css";
import {
  STUDENT_REVIEW_QUOTE,
  STUDENT_REVIEW_RATING,
  STUDENT_REVIEWS,
  type StudentReview,
} from "@/lib/mock/reviews";

const REVIEWS = STUDENT_REVIEWS;

const QUOTE = STUDENT_REVIEW_QUOTE;

interface ReviewCarouselProps {
  seconds?: number;
  className?: string;
  /** The closing quote + aggregate score under the marquee. */
  showSummary?: boolean;
  /** Slightly tighter cards for tight surfaces (e.g. the trial card). */
  compact?: boolean;
}

function ReviewCard({ review }: { review: StudentReview }) {
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">
          {review.initials || <User size={14} />}
        </span>
        <span className={styles.name}>{review.name}</span>
        <span className={styles.badge}>
          <BadgeCheck size={13} aria-hidden="true" />
        </span>
      </div>

      <span className={styles.title}>{review.title}</span>
      <p className={styles.text}>{review.text}</p>
    </article>
  );
}

export function ReviewCarousel({
  seconds = 28,
  className,
  showSummary = true,
  compact = false,
}: ReviewCarouselProps) {
  return (
    <section
      className={[styles.wrap, compact ? styles.compact : null, className]
        .filter(Boolean)
        .join(" ")}
      style={{ "--loop": `${seconds}s` } as CSSProperties}
      aria-label="Student reviews"
    >
      <div className={styles.panel}>
        <div className={styles.track}>
          <div className={styles.group}>
            {REVIEWS.map((review) => (
              <ReviewCard key={review.name} review={review} />
            ))}
          </div>
          <div className={styles.group} aria-hidden="true">
            {REVIEWS.map((review) => (
              <ReviewCard key={`dup-${review.name}`} review={review} />
            ))}
          </div>
        </div>
      </div>

      {showSummary && (
        <div className={styles.rating}>
          <blockquote className={styles.quote}>{QUOTE}</blockquote>
          <p className={styles.score}>
            User rating {STUDENT_REVIEW_RATING.value}/{STUDENT_REVIEW_RATING.outOf}
          </p>
        </div>
      )}
    </section>
  );
}
