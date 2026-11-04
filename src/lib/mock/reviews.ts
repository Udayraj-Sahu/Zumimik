/**
 * The verified student reviews and the aggregate rating shown in the intros.
 * One source of truth so the review carousel and the trial timeline can never
 * drift apart — never invent extra names, dates or per-review stars here.
 */
export interface StudentReview {
  name: string;
  initials: string;
  title: string;
  text: string;
}

export const STUDENT_REVIEWS: StudentReview[] = [
  {
    name: "Arnav James",
    initials: "AJ",
    title: "Finally cracked DI",
    text: "The data interpretation drills felt brutal for two weeks, then everything clicked. My sectional accuracy jumped from 61% to 88% before the mains.",
  },
  {
    name: "Priya Nair",
    initials: "PN",
    title: "Solid with a few quirks",
    text: "Adaptive sets read my weak areas accurately. Occasionally the difficulty spikes faster than expected, but that pressure is exactly what exam day feels like.",
  },
  {
    name: "Rahul Verma",
    initials: "RV",
    title: "Built a daily habit",
    text: "Spaced revision reminders kept me consistent for 90 plus days straight. I stopped cramming the night before and started trusting the schedule.",
  },
];

export const STUDENT_REVIEW_QUOTE =
  "Arena replaced my scattered note apps with one system that actually adapts to how I study. The mock analytics alone were worth switching for.";

/** Aggregate rating across the reviews above (the only rating the app shows). */
export const STUDENT_REVIEW_RATING = { value: 4.9, outOf: 5 } as const;
