/**
 * Snapshot of the Reference Library page ids (GET /api/subtopics/reference, 2026-11-05).
 * The app is a static export, so /learn/technique/[id] only exists for ids known at build time. The build also asks the API for the
 * current list (see the route's generateStaticParams); this list is the fallback when it cannot be reached, so offline builds still
 * produce a page for every known id. A page added to the backend later appears after the next build.
 */
export const REFERENCE_PAGE_IDS_SNAPSHOT: readonly string[] = [
  "addition_tricks",
  "antyayordashakepi",
  "anurupyena",
  "arithmetic_gre",
  "calendar_calculations",
  "chalana_kalanabhyam",
  "complex_numbers",
  "division_tricks",
  "ekadhikena_purvena",
  "ekanyunena_purvena",
  "fractions",
  "functions_graphs",
  "geometry_basics",
  "gunaka_samuccayah",
  "gunita_samuccayah",
  "linear_equations",
  "magic_squares",
  "mensuration",
  "mental_arithmetic_fluency",
  "multiplication_tricks",
  "nikhilam_sutra",
  "number_theory",
  "order_of_operations",
  "parama_mitra",
  "percentages",
  "place_value_number_sense",
  "polynomials",
  "problem_solving_gmat",
  "puranapuranabhyam",
  "quadratic_equations",
  "quantitative_aptitude_cat",
  "ratios_proportions",
  "sankalana_vyavakalanabhyam",
  "school_foundation",
  "seshanyakena_caramena",
  "shunyam_saamyasamuccaye",
  "sopantyadvayam",
  "subtraction_tricks",
  "trigonometry_basics",
  "urdhva_tiryak",
  "vilokanam",
  "vyasti_samasti",
  "yavadunam",
  "yavadunam_tavadunam"
];

/**
 * The URL segment of a skill's technique page: "Fractions and Decimals" -> "fractions-and-decimals". Skill names carry spaces, commas
 * and colons, which break dev routing and Windows file names, so the page is addressed by this slug and the client maps it back to the
 * skill through the practice catalog. Empty (no letters or digits) means the skill has no technique page and opens Practice instead.
 */
export const skillSlug = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
export const hasTechniquePage = (id: string) => skillSlug(id).length > 0;
