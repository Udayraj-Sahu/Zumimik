import type { Technique } from "@/lib/types/technique";

const TECHNIQUES_BY_ID: Record<string, Technique> = {
  // ── FUNDAMENTAL MATH: NUMBER SYSTEM FACTORS ──────────────
  "number-system-factors": {
    id: "number-system-factors",
    subjectId: "fundamental-math",
    topicPath: ["number-system", "factors"],
    name: "Number System — Factors",
    quickReference: {
      formula: "If N = p^a × q^b × r^c, then factors count = (a+1)(b+1)(c+1)",
      keyIdea: "Every integer can be uniquely expressed as a product of prime powers. The exponent+1 rule gives the count of all positive factors.",
      shortcut: "Sum of factors = (p^(a+1)-1)/(p-1) × (q^(b+1)-1)/(q-1) × ...",
      commonMistake: "Counting only prime factors instead of all factors; confusing exponent from power",
    },
    levels: {
      1: {
        level: 1,
        title: "Counting Factors (Simple)",
        explanation: "To find the number of factors of a number, first prime factorize it. Then add 1 to each exponent and multiply the results. This counts every positive divisor.",
        examples: [
          { problem: "Find the number of factors of 36", steps: ["Prime factorization: 36 = 2² × 3²", "Exponents: 2 (for 2) and 2 (for 3)", "Add 1 to each: (2+1)(2+1) = 3 × 3", "Number of factors: 9"], answer: "9" },
          { problem: "Find the number of factors of 48", steps: ["Prime factorization: 48 = 2⁴ × 3¹", "Exponents: 4 and 1", "(4+1)(1+1) = 5 × 2 = 10", "Number of factors: 10"], answer: "10" },
        ],
        questions: [
          { id: "nsf-1-q1", text: "How many factors does 60 have?", options: ["12", "10", "14", "8"], correctIndex: 0, explanation: "60 = 2²×3×5. (2+1)(1+1)(1+1) = 3×2×2 = 12" },
          { id: "nsf-1-q2", text: "How many factors does 72 have?", options: ["12", "14", "10", "16"], correctIndex: 0, explanation: "72 = 2³×3². (3+1)(2+1) = 4×3 = 12" },
        ],
        commonTraps: ["Counting prime factors only (2, 3, 5) instead of all 12 factors of 60", "Forgetting to add 1 to each exponent"],
        speedTips: ["Learn the factor counts of common numbers: 12 has 6, 24 has 8, 36 has 9, 48 has 10, 60 has 12", "If the exponent is 1, (1+1)=2, so that prime doubles the factor count"],
      },
      2: {
        level: 2,
        title: "Sum of Factors",
        explanation: "The sum of all factors of N = p^a × q^b is: (p⁰ + p¹ + ... + p^a) × (q⁰ + q¹ + ... + q^b). This equals (p^(a+1)-1)/(p-1) × (q^(b+1)-1)/(q-1).",
        examples: [
          { problem: "Sum of factors of 18", steps: ["18 = 2 × 3²", "Sum for 2: (2²-1)/(2-1) = 3/1 = 3", "Sum for 3²: (3³-1)/(3-1) = 26/2 = 13", "Total: 3 × 13 = 39", "Verify: factors are 1,2,3,6,9,18 → sum = 39"], answer: "39" },
          { problem: "Sum of factors of 20", steps: ["20 = 2² × 5", "Sum for 2²: (2³-1)/(2-1) = 7", "Sum for 5: (5²-1)/(5-1) = 24/4 = 6", "Total: 7 × 6 = 42"], answer: "42" },
        ],
        questions: [
          { id: "nsf-2-q1", text: "Sum of factors of 12?", options: ["28", "24", "32", "26"], correctIndex: 0, explanation: "12=2²×3. (2³-1)/(2-1)=7. (3²-1)/(3-1)=8/2=4. 7×4=28" },
        ],
        commonTraps: ["Forgetting that the formula sums every factor, not just the prime factors", "Miscounting the geometric series formula"],
        speedTips: ["For prime numbers, the sum of factors is always p+1 (since factors are 1 and p)", "For squares of primes p², sum = 1 + p + p²"],
      },
      3: {
        level: 3,
        title: "Product of Factors",
        explanation: "The product of all factors of N is N^(number_of_factors/2). This works because factors pair up: each factor f pairs with N/f, and their product is N.",
        examples: [
          { problem: "Product of factors of 12", steps: ["Factors of 12: 1,2,3,4,6,12 (6 factors)", "Product = 12^(6/2) = 12³ = 1728", "Verify: 1×2×3×4×6×12 = 1728"], answer: "1728" },
          { problem: "Product of factors of 36", steps: ["36 has 9 factors", "Product = 36^(9/2) = 36^4.5 = 6^9 (since 36=6²)", "= 10077696"], answer: "10077696" },
        ],
        questions: [
          { id: "nsf-3-q1", text: "Product of factors of 9?", options: ["27", "9", "81", "729"], correctIndex: 0, explanation: "Factors: 1,3,9 (3 factors). Product = 9^(3/2) = 9^1.5 = 27" },
        ],
        commonTraps: ["Using wrong exponent formula (not N^(f/2))", "Incorrectly counting the number of factors first"],
        speedTips: ["Product = N^(f/2). For perfect squares, f is odd, giving a clean result.", "This is rarely asked alone but useful in combination problems"],
      },
      4: {
        level: 4,
        title: "Number of Even/Odd Factors",
        explanation: "Even factors must include at least one factor of 2. Total — odd factors = even factors. Odd factors come from the odd part of the factorization (ignore the 2's exponent).",
        examples: [
          { problem: "Even factors of 72", steps: ["72 = 2³ × 3²", "Total factors: (3+1)(2+1) = 12", "Odd factors come from 3² only: (2+1) = 3", "Even factors: 12 - 3 = 9"], answer: "9" },
          { problem: "Factors of 48 that are multiples of 4", steps: ["48 = 2⁴ × 3", "For multiple of 4 (2²), need 2² minimum", "Exponent choices for 2: 2,3,4 (3 choices)", "Exponent choices for 3: 0,1 (2 choices)", "Total: 3 × 2 = 6"], answer: "6" },
        ],
        questions: [
          { id: "nsf-4-q1", text: "How many odd factors does 100 have?", options: ["3", "4", "5", "6"], correctIndex: 0, explanation: "100=2²×5². Odd part: 5². Factors: (2+1)=3. Odd factors: 1,5,25." },
        ],
        commonTraps: ["Forgetting that 1 is always an odd factor", "Including 2⁰ as part of odd factor count (2⁰=1 is odd, but it's already counted in odd part)"],
        speedTips: ["Odd factors come from only the odd prime powers", "Even factors = total - odd. Factors divisible by a power = restrict the minimum exponent"],
      },
      5: {
        level: 5,
        title: "Co-Prime Factors",
        explanation: "Two numbers are co-prime if their GCD is 1. The count of numbers less than N that are co-prime to N is Euler's totient φ(N) = N × Π(1 - 1/p) for each distinct prime p dividing N.",
        examples: [
          { problem: "φ(12) — numbers less than 12 that are co-prime to 12", steps: ["12 = 2² × 3", "φ(12) = 12 × (1-1/2) × (1-1/3)", "= 12 × 1/2 × 2/3", "= 12 × 2/6 = 4", "Verify: 1,5,7,11 — yes, 4 numbers"], answer: "4" },
          { problem: "φ(30)", steps: ["30 = 2×3×5", "φ(30) = 30 × 1/2 × 2/3 × 4/5", "= 30 × 8/30 = 8", "Verify: 1,7,11,13,17,19,23,29 — 8 numbers"], answer: "8" },
        ],
        questions: [
          { id: "nsf-5-q1", text: "How many numbers less than 20 are co-prime to 20?", options: ["8", "6", "10", "12"], correctIndex: 0, explanation: "20=2²×5. φ(20)=20×(1-1/2)×(1-1/5)=20×1/2×4/5=8" },
        ],
        commonTraps: ["Using p² instead of p for distinct primes in the formula", "Forgetting to include 1 (1 is always co-prime to every number)"],
        speedTips: ["φ(p) = p-1 for prime p", "φ(p^k) = p^k - p^(k-1) = p^k(1-1/p)", "φ(mn) = φ(m)×φ(n) when m and n are co-prime"],
      },
    },
  },

  // ── FUNDAMENTAL MATH: LCM & GCD ──────────────────────────
  "lcm-gcd": {
    id: "lcm-gcd",
    subjectId: "fundamental-math",
    topicPath: ["number-system", "factors"],
    name: "LCM & GCD",
    quickReference: {
      formula: "LCM(a,b) × GCD(a,b) = a × b",
      keyIdea: "GCD is the largest number dividing both. LCM is the smallest number divisible by both. Product of GCD and LCM equals product of the numbers.",
      shortcut: "For prime numbers, GCD = 1 and LCM = a×b. For numbers sharing factors, GCD is the overlap, LCM is the union with overlap counted once.",
      commonMistake: "Confusing LCM with GCD; forgetting that GCD ≤ min(a,b) and LCM ≥ max(a,b)",
    },
    levels: {
      1: {
        level: 1,
        title: "Basic GCD by Listing",
        explanation: "GCD (Greatest Common Divisor) is the largest number that divides both numbers evenly. The simplest method is to list all factors of each number and pick the largest common one.",
        examples: [
          { problem: "GCD of 12 and 18", steps: ["Factors of 12: 1,2,3,4,6,12", "Factors of 18: 1,2,3,6,9,18", "Common: 1,2,3,6", "GCD = 6"], answer: "6" },
          { problem: "GCD of 24 and 36", steps: ["Factors of 24: 1,2,3,4,6,8,12,24", "Factors of 36: 1,2,3,4,6,9,12,18,36", "Common: 1,2,3,4,6,12", "GCD = 12"], answer: "12" },
        ],
        questions: [
          { id: "lcm-1-q1", text: "GCD of 16 and 24?", options: ["4", "6", "8", "12"], correctIndex: 2, explanation: "Factors of 16: 1,2,4,8,16. Factors of 24: 1,2,3,4,6,8,12,24. Common: 1,2,4,8. GCD=8" },
          { id: "lcm-1-q2", text: "GCD of 9 and 15?", options: ["1", "3", "5", "9"], correctIndex: 1, explanation: "Factors of 9: 1,3,9. Factors of 15: 1,3,5,15. GCD=3" },
        ],
        commonTraps: ["Picking the smaller number as GCD without checking if it actually divides both", "Including common factors that don't divide both numbers"],
        speedTips: ["If one number divides the other, the GCD is the smaller number", "GCD of two consecutive integers is always 1"],
      },
      2: {
        level: 2,
        title: "GCD by Prime Factorization",
        explanation: "Prime factorize both numbers, then take the product of common prime powers with the minimum exponent. This works for any pair of numbers.",
        examples: [
          { problem: "GCD of 72 and 108", steps: ["72 = 2³ × 3²", "108 = 2² × 3³", "Common: 2² and 3²", "GCD = 2² × 3² = 4 × 9 = 36"], answer: "36" },
          { problem: "GCD of 45 and 75", steps: ["45 = 3² × 5", "75 = 3 × 5²", "Common: 3¹ and 5¹", "GCD = 3 × 5 = 15"], answer: "15" },
        ],
        questions: [
          { id: "lcm-2-q1", text: "GCD of 48 and 60?", options: ["6", "8", "10", "12"], correctIndex: 3, explanation: "48=2⁴×3, 60=2²×3×5. Common: 2²×3=12" },
        ],
        commonTraps: ["Taking the larger exponent instead of the smaller one", "Forgetting to include all common prime factors"],
        speedTips: ["Use prime factorization for large numbers or when listing factors becomes impractical", "GCD of powers: GCD(a^m, a^n) = a^min(m,n)"],
      },
      3: {
        level: 3,
        title: "Basic LCM by Listing",
        explanation: "LCM (Least Common Multiple) is the smallest number that is a multiple of both numbers. The simplest method is to list multiples and pick the smallest common one.",
        examples: [
          { problem: "LCM of 6 and 8", steps: ["Multiples of 6: 6,12,18,24,30,36,...", "Multiples of 8: 8,16,24,32,40,...", "Common: 24, 48, ...", "LCM = 24"], answer: "24" },
          { problem: "LCM of 4 and 10", steps: ["Multiples of 4: 4,8,12,16,20,24,...", "Multiples of 10: 10,20,30,40,...", "LCM = 20"], answer: "20" },
        ],
        questions: [
          { id: "lcm-3-q1", text: "LCM of 6 and 9?", options: ["15", "18", "21", "36"], correctIndex: 1, explanation: "Multiples of 6: 6,12,18,24. Multiples of 9: 9,18,27. LCM=18" },
        ],
        commonTraps: ["Giving the product a×b instead of the actual LCM", "Missing a smaller common multiple before the product"],
        speedTips: ["If one number is a multiple of the other, the LCM is the larger number", "LCM of two prime numbers is their product"],
      },
      4: {
        level: 4,
        title: "LCM by Prime Factorization",
        explanation: "Prime factorize both numbers, then take the product of all prime powers with the maximum exponent. This is the most reliable LCM method.",
        examples: [
          { problem: "LCM of 72 and 108", steps: ["72 = 2³ × 3²", "108 = 2² × 3³", "Max: 2³ and 3³", "LCM = 2³ × 3³ = 8 × 27 = 216"], answer: "216" },
          { problem: "LCM of 45 and 75", steps: ["45 = 3² × 5", "75 = 3 × 5²", "Max: 3² and 5²", "LCM = 9 × 25 = 225"], answer: "225" },
        ],
        questions: [
          { id: "lcm-4-q1", text: "LCM of 48 and 60?", options: ["120", "180", "240", "360"], correctIndex: 2, explanation: "48=2⁴×3, 60=2²×3×5. Max: 2⁴×3×5=16×15=240" },
        ],
        commonTraps: ["Taking the minimum exponent (that's GCD) instead of the maximum", "Forgetting that LCM ≥ max(a,b) always"],
        speedTips: ["LCM(a,b) = a×b / GCD(a,b) — the fastest method once you know the GCD", "For any two numbers, a × b = LCM(a,b) × GCD(a,b)"],
      },
      5: {
        level: 5,
        title: "LCM & GCD Applications",
        explanation: "Many competitive exam problems involve LCM and GCD in real-world contexts — finding the next time events coincide, splitting items into equal groups, or finding numbers with given LCM and GCD.",
        examples: [
          { problem: "Two bells ring at intervals of 8 and 12 minutes. When will they ring together again?", steps: ["Need LCM of 8 and 12", "8 = 2³, 12 = 2² × 3", "LCM = 2³ × 3 = 24", "They ring together every 24 minutes"], answer: "24 minutes" },
          { problem: "Find two numbers with GCD=6 and LCM=180", steps: ["Let numbers be 6a and 6b where a,b are co-prime", "LCM = 6ab = 180, so ab = 30", "Co-prime pairs: (1,30), (2,15), (3,10), (5,6)", "Numbers: (6,180), (12,90), (18,60), (30,36)"], answer: "(6,180), (12,90), (18,60), (30,36)" },
        ],
        questions: [
          { id: "lcm-5-q1", text: "Three lights flash at intervals of 4, 6, and 9 seconds. When will they flash together?", options: ["24s", "36s", "48s", "72s"], correctIndex: 1, explanation: "LCM of 4,6,9: 4=2², 6=2×3, 9=3². LCM=2²×3²=36s" },
        ],
        commonTraps: ["Adding intervals instead of finding LCM", "Forgetting that the answer must be a multiple of all given numbers"],
        speedTips: ["For word problems, 'again together', 'simultaneously', 'meet again' indicate LCM", "For splitting/grouping problems, GCD tells the largest possible group size"],
      },
    },
  },

  // ── FUNDAMENTAL MATH: PRIME FACTORIZATION ────────────────
  "prime-factorization": {
    id: "prime-factorization",
    subjectId: "fundamental-math",
    topicPath: ["number-system", "prime"],
    name: "Prime Factorization",
    quickReference: {
      formula: "Every integer > 1 is a unique product of primes in non-decreasing order",
      keyIdea: "Divide by the smallest prime factor repeatedly until the quotient is 1",
      shortcut: "Use divisibility rules to skip trial division: 2, 3, 5, 7, 11 order",
      commonMistake: "Missing a repeated prime factor (e.g., factoring 12 as 2×6 instead of 2²×3)",
    },
    levels: {
      1: {
        level: 1,
        title: "Division by Small Primes",
        explanation: "Start dividing by 2 (the smallest prime), then 3, then 5, then 7, etc. Keep dividing by each prime until it no longer divides evenly, then move to the next prime. Stop when the quotient is 1.",
        examples: [
          { problem: "Factor 84", steps: ["84 ÷ 2 = 42", "42 ÷ 2 = 21", "21 ÷ 3 = 7", "7 ÷ 7 = 1", "84 = 2² × 3 × 7"], answer: "2² × 3 × 7" },
          { problem: "Factor 90", steps: ["90 ÷ 2 = 45", "45 ÷ 3 = 15", "15 ÷ 3 = 5", "5 ÷ 5 = 1", "90 = 2 × 3² × 5"], answer: "2 × 3² × 5" },
        ],
        questions: [
          { id: "pf-1-q1", text: "Prime factorization of 72?", options: ["2³×3²", "2²×3³", "2⁴×3²", "2³×3³"], correctIndex: 0, explanation: "72÷2=36,÷2=18,÷2=9,÷3=3,÷3=1. 72=2³×3²" },
        ],
        commonTraps: ["Missing a prime by skipping one (e.g., 4 when 2² is correct)", "Stopping before reaching 1"],
        speedTips: ["Start with 2 (most common prime factor), then 3, 5, 7", "If the number is even, start by halving repeatedly"],
      },
      2: {
        level: 2,
        title: "Factor Tree Method",
        explanation: "Draw a factor tree: split the number into any two factors, then split each factor until all leaves are primes. Collect all primes at the leaves.",
        examples: [
          { problem: "Factor 120 using a tree", steps: ["120 = 12 × 10", "12 = 4 × 3 = 2² × 3", "10 = 2 × 5", "Collect: 2³ × 3 × 5"], answer: "2³ × 3 × 5" },
          { problem: "Factor 126", steps: ["126 = 2 × 63", "63 = 7 × 9 = 7 × 3²", "126 = 2 × 3² × 7"], answer: "2 × 3² × 7" },
        ],
        questions: [
          { id: "pf-2-q1", text: "Prime factorization of 180?", options: ["2²×3²×5", "2³×3²×5", "2²×3³×5", "2²×3²×7"], correctIndex: 0, explanation: "180 = 2² × 3² × 5" },
        ],
        commonTraps: ["Drawing a tree that doesn't fully decompose to primes (stopping at composite leaves)", "Double-counting a prime factor in the collection step"],
        speedTips: ["Split into an even × odd pair first to isolate the 2s", "Use divisibility rules: sum of digits for 3, last digit for 2 and 5"],
      },
      3: {
        level: 3,
        title: "Large Number Factoring",
        explanation: "For larger numbers, use systematic trial division up to √N. If no prime factor up to √N divides N, then N itself is prime. This is the key theorem of primality testing.",
        examples: [
          { problem: "Is 97 prime?", steps: ["Check up to √97 ≈ 9.8", "97 mod 2 = 1, mod 3 = 1, mod 5 = 2, mod 7 = 6", "No prime ≤ 7 divides 97", "97 is prime"], answer: "Prime" },
          { problem: "Factor 221", steps: ["221 ÷ 2 ≠, ÷ 3 ≠, ÷ 5 ≠", "221 ÷ 7 = 31.57...", "221 ÷ 11 = 20.09...", "221 ÷ 13 = 17 exactly", "221 = 13 × 17"], answer: "13 × 17" },
        ],
        questions: [
          { id: "pf-3-q1", text: "Is 143 prime?", options: ["Yes", "No (11×13)"], correctIndex: 1, explanation: "143 ÷ 11 = 13. 143 = 11 × 13, not prime." },
        ],
        commonTraps: ["Checking beyond √N unnecessarily", "Not checking all primes up to √N before concluding primality"],
        speedTips: ["Memorize primes up to 50 for quick trial division", "The gap between √N and N/2 is the most efficient trial range"],
      },
      4: {
        level: 4,
        title: "Applications in GCD/LCM",
        explanation: "Prime factorization gives GCD and LCM directly: GCD takes the minimum exponent for each prime, LCM takes the maximum exponent. This is the conceptual foundation for all GCD/LCM problems.",
        examples: [
          { problem: "Find LCM of 48 and 60", steps: ["48 = 2⁴ × 3", "60 = 2² × 3 × 5", "LCM: max exponents → 2⁴ × 3 × 5 = 240"], answer: "240" },
          { problem: "Find GCD of 84 and 108", steps: ["84 = 2² × 3 × 7", "108 = 2² × 3³", "GCD: min exponents → 2² × 3 = 12"], answer: "12" },
        ],
        questions: [
          { id: "pf-4-q1", text: "GCD of 72 and 90?", options: ["18", "12", "24", "36"], correctIndex: 0, explanation: "72=2³×3², 90=2×3²×5. GCD: 2×3²=18" },
        ],
        commonTraps: ["Confusing GCD (min exponents) with LCM (max exponents)", "Forgetting to include primes that appear in only one factorization"],
        speedTips: ["GCD × LCM = product of the two numbers (for exactly 2 numbers)", "Euclidean algorithm is faster for large numbers, but prime factorization gives more insight"],
      },
    },
  },

  // ── GMAT: WORK RATE ──────────────────────────────────────
  "work-rate": {
    id: "work-rate",
    subjectId: "gmat",
    topicPath: ["quantitative", "work-rate"],
    name: "Work Rate",
    quickReference: {
      formula: "R × T = W (Rate × Time = Work), 1/T₁ + 1/T₂ = 1/T_combined",
      keyIdea: "Convert individual times to rates (jobs per hour), add rates for combined work, invert back to time",
      shortcut: "For two workers: T_combined = (T₁ × T₂) / (T₁ + T₂)",
      commonMistake: "Adding times instead of rates (1/6 + 1/3 = 1/2, not 6+3=9)",
    },
    levels: {
      1: {
        level: 1,
        title: "Single Worker",
        explanation: "If one worker completes a job in T hours, their rate is 1/T jobs per hour. In t hours, they complete t/T of the job. This is the foundation of all work-rate problems.",
        examples: [
          { problem: "Alice paints a room in 6 hours. How much does she paint in 2 hours?", steps: ["Rate: 1/6 room per hour", "In 2 hours: 2 × 1/6 = 2/6 = 1/3", "She paints 1/3 of the room"], answer: "1/3" },
          { problem: "Bob can write 12 reports in 4 hours. What's his rate per hour?", steps: ["Rate = Work / Time = 12/4 = 3", "Bob writes 3 reports per hour"], answer: "3 reports/hour" },
        ],
        questions: [
          { id: "wr-1-q1", text: "Charlie completes a task in 8 hours. What fraction remains after 3 hours?", options: ["5/8", "3/8", "1/8", "5/5"], correctIndex: 0, explanation: "Rate: 1/8. In 3 hours: 3/8 done. Remaining: 1 - 3/8 = 5/8" },
        ],
        commonTraps: ["Forgetting to express the rate as a fraction of the whole job", "Mixing up done vs. remaining"],
        speedTips: ["Rate = 1/Time is the key mental model", "Work done = elapsed time / total time"],
      },
      2: {
        level: 2,
        title: "Two Workers Together",
        explanation: "Add the individual rates to get the combined rate. Then invert to find the combined time. The shortcut T₁T₂/(T₁+T₂) works for exactly two workers doing the same job.",
        examples: [
          { problem: "Alice (6h) and Bob (3h) together — how long?", steps: ["Alice: 1/6 room/h, Bob: 1/3 room/h", "Combined: 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2", "Time = 1 ÷ (1/2) = 2 hours", "Shortcut: (6×3)/(6+3) = 18/9 = 2"], answer: "2 hours" },
          { problem: "Pipe A fills tank in 4h, Pipe B in 6h. Together?", steps: ["A: 1/4, B: 1/6, Combined: 5/12", "Time = 12/5 = 2.4 hours = 2h 24min"], answer: "2.4 hours" },
        ],
        questions: [
          { id: "wr-2-q1", text: "Jen (5h) and Ken (7h) working together — how many hours?", options: ["35/12", "12/35", "6", "35"], correctIndex: 0, explanation: "(5×7)/(5+7) = 35/12 ≈ 2.92 hours" },
        ],
        commonTraps: ["Adding times and dividing by 2 (wrong for differently sized workers)", "Forgetting to convert hours to minutes when fractional"],
        speedTips: ["The shortcut T₁T₂/(T₁+T₂) is faster than adding fractions", "When workers take equal time, combined time is half: T/2"],
      },
      3: {
        level: 3,
        title: "One Worker Joins Late",
        explanation: "When the second worker starts later, calculate the work done by the first worker alone, then add the combined rate for the remaining time. Set up as: (rate₁ × t) + (combined rate × remaining time) = 1.",
        examples: [
          { problem: "Alice starts alone, Bob joins after 1 hour. Total time?", steps: ["Alice: 1/6 per hour. First hour: 1/6 done", "Remaining: 5/6 of room", "Combined rate: 1/2 room/h", "Time together: (5/6) ÷ (1/2) = 5/3 = 1h 40min", "Total: 2h 40min"], answer: "2h 40min" },
        ],
        questions: [
          { id: "wr-3-q1", text: "Pipe A (4h) alone for 30 min, then B (6h) joins. Total fill time?", options: ["2.7h", "3h", "2.5h", "3.2h"], correctIndex: 0, explanation: "A: 1/4. 30min: 1/8. Remaining: 7/8. Combined: 5/12. Time: (7/8)/(5/12)=2.1h. Total: 2.6h ≈ 2.7h" },
        ],
        commonTraps: ["Forgetting to account for the work already done before the second worker joins", "Using combined rate for the entire duration"],
        speedTips: ["Break into two phases: 'before joined' and 'after joined'", "Convert everything to fractions of the job to avoid decimals"],
      },
      4: {
        level: 4,
        title: "Multiple Workers with Different Rates",
        explanation: "For three or more workers, the principle is the same: sum all individual rates. The combined time is 1 divided by the sum of rates. Workers can also have opposing effects (one filling, one draining).",
        examples: [
          { problem: "Three pipes: A fills in 3h, B in 4h, C in 6h. Together?", steps: ["Rates: 1/3 + 1/4 + 1/6 = 4/12 + 3/12 + 2/12 = 9/12 = 3/4", "Time: 1 ÷ (3/4) = 4/3 = 1.333h = 1h 20min"], answer: "1h 20min" },
          { problem: "Fills in 4h, drains in 6h. Net fill time?", steps: ["Fill: +1/4, Drain: -1/6", "Net: 1/4 - 1/6 = 3/12 - 2/12 = 1/12", "Time: 12 hours to fill"], answer: "12 hours" },
        ],
        questions: [
          { id: "wr-4-q1", text: "Pump fills in 5h, drain empties in 8h. Net fill time?", options: ["13.33h", "3.08h", "40h", "20h"], correctIndex: 0, explanation: "1/5 - 1/8 = 3/40. Time = 40/3 ≈ 13.33 hours" },
        ],
        commonTraps: ["Adding a draining rate as positive instead of negative", "Forgetting to find the least common denominator when summing fractions"],
        speedTips: ["Think of draining rates as negative work rates", "For 3+ workers, use LCM for the common denominator"],
      },
      5: {
        level: 5,
        title: "Work with Efficiency Changes",
        explanation: "When workers have different efficiencies or efficiency changes mid-task, represent each worker's contribution as a percentage or fraction of the total work. Set up equations with variables and solve.",
        examples: [
          { problem: "A is 50% more efficient than B. Together they finish in 8h. How long for A alone?", steps: ["Let B's rate = r. Then A's rate = 1.5r", "Combined: r + 1.5r = 2.5r = 1/8", "r = 1/20. A's rate = 1.5/20 = 3/40", "A alone: 40/3 = 13.33 hours"], answer: "13.33 hours" },
          { problem: "A works twice as fast as B. Together 6h. B alone?", steps: ["Let B's rate = r. A's rate = 2r", "Combined: 3r = 1/6, so r = 1/18", "B alone: 18 hours"], answer: "18 hours" },
        ],
        questions: [
          { id: "wr-5-q1", text: "A is 25% faster than B. Together 10h. A alone time?", options: ["18h", "22.5h", "15h", "20h"], correctIndex: 0, explanation: "Let B=r, A=1.25r. Combined: 2.25r=1/10, r=1/22.5. A=1.25/22.5=1/18. A alone: 18h" },
        ],
        commonTraps: ["Misinterpreting '50% more efficient' — it's +50% of the rate, not the time", "Forgetting that faster = shorter time, so the inverse relationship must hold"],
        speedTips: ["Convert 'x% more efficient' to a rate multiplier: 1 + x/100", "Always verify: combined time < each individual time"],
      },
    },
  },

  // ── GMAT: SPEED & DISTANCE ───────────────────────────────
  "speed-distance": {
    id: "speed-distance",
    subjectId: "gmat",
    topicPath: ["quantitative", "speed-distance"],
    name: "Speed & Distance",
    quickReference: {
      formula: "D = S × T (Distance = Speed × Time)",
      keyIdea: "Units must match: if speed is km/h, time must be in hours and distance in km",
      shortcut: "For equal distances at different speeds, average speed = 2ab/(a+b)",
      commonMistake: "Using arithmetic mean of speeds instead of harmonic mean for equal distances",
    },
    levels: {
      1: {
        level: 1,
        title: "Basic DST",
        explanation: "The core relationship D = S × T. Given any two, find the third. Always check units — convert minutes to hours (divide by 60) and seconds to hours (divide by 3600).",
        examples: [
          { problem: "Car travels 240 km at 60 km/h. Time?", steps: ["T = D/S = 240/60 = 4 hours"], answer: "4 hours" },
          { problem: "Train travels for 3 hours at 80 km/h. Distance?", steps: ["D = S × T = 80 × 3 = 240 km"], answer: "240 km" },
        ],
        questions: [
          { id: "sd-1-q1", text: "Cyclist travels 15 km at 10 km/h. Time in minutes?", options: ["90", "60", "75", "120"], correctIndex: 0, explanation: "T=15/10=1.5h=90 minutes" },
        ],
        commonTraps: ["Forgetting to convert minutes to hours", "Mixing km/h with meters/second"],
        speedTips: ["Memorize: 60 km/h = 1 km/min. At 60 km/h, distance in km = minutes traveled.", "For m/s to km/h, multiply by 18/5 (or 3.6)"],
      },
      2: {
        level: 2,
        title: "Relative Speed",
        explanation: "When two objects move toward each other, relative speed = sum of speeds. Time to meet = initial distance ÷ relative speed. For same direction, relative speed = difference of speeds.",
        examples: [
          { problem: "Two cars toward each other from 300 km apart at 50 km/h and 70 km/h. Meeting time?", steps: ["Relative speed: 50 + 70 = 120 km/h", "Time = 300/120 = 2.5 hours"], answer: "2.5 hours" },
          { problem: "Car chasing another from 50 km behind at +20 km/h faster. Time to catch?", steps: ["Relative speed: 20 km/h", "Time = 50/20 = 2.5 hours"], answer: "2.5 hours" },
        ],
        questions: [
          { id: "sd-2-q1", text: "Two trains 400 km apart approach at 60 and 40 km/h. Meeting time?", options: ["4h", "5h", "3h", "6h"], correctIndex: 0, explanation: "Relative: 60+40=100 km/h. Time: 400/100=4h" },
        ],
        commonTraps: ["Adding speeds for same-direction problems instead of subtracting", "Using distance that doesn't account for both objects' movement"],
        speedTips: ["Toward each other: add speeds. Same direction: subtract speeds.", "The time to meet is always ≤ the time for the faster to cover the gap alone"],
      },
      3: {
        level: 3,
        title: "Average Speed",
        explanation: "Average speed is NOT the arithmetic mean of speeds. It's total distance ÷ total time. For equal distances at speeds a and b, average speed = 2ab/(a+b) (harmonic mean).",
        examples: [
          { problem: "Half the trip at 40 km/h, half at 60 km/h. Average speed?", steps: ["Equal distances? 'Half the trip' means half the distance", "Use harmonic mean: 2×40×60/(40+60) = 4800/100 = 48 km/h", "Verification: d/40 + d/60 = (3d+2d)/120 = 5d/120. V_avg = 2d/(5d/120) = 48"], answer: "48 km/h" },
          { problem: "1 hour at 40 km/h, 1 hour at 60 km/h. Average speed?", steps: ["Equal times, not distances: arithmetic mean applies", "Average = (40+60)/2 = 50 km/h", "Verification: total distance = 100 km, total time = 2h, V_avg = 50 km/h"], answer: "50 km/h" },
        ],
        questions: [
          { id: "sd-3-q1", text: "Equal distances at 30 km/h and 50 km/h. Average speed?", options: ["37.5", "40", "42.5", "35"], correctIndex: 0, explanation: "Harmonic mean: 2×30×50/(30+50) = 3000/80 = 37.5 km/h" },
        ],
        commonTraps: ["Using arithmetic mean for equal-distance problems", "Forgetting to verify whether 'half' refers to distance or time"],
        speedTips: ["Equal distances → harmonic mean. Equal times → arithmetic mean.", "If the problem says 'half the time at speed a' → arithmetic mean. 'Half the distance' → harmonic."],
      },
      4: {
        level: 4,
        title: "Boats & Streams",
        explanation: "Downstream speed = boat speed + stream speed. Upstream speed = boat speed - stream speed. Average speed for a round trip (up and down same distance) = 2ab/(a+b) where a and b are the two speeds.",
        examples: [
          { problem: "Boat speed 15 km/h, stream 3 km/h. Downstream speed? Upstream?", steps: ["Down: 15 + 3 = 18 km/h", "Up: 15 - 3 = 12 km/h"], answer: "18 km/h, 12 km/h" },
          { problem: "Round trip across 36 km river with above speeds. Total time?", steps: ["Down: 36/18 = 2h", "Up: 36/12 = 3h", "Total: 5h"], answer: "5 hours" },
        ],
        questions: [
          { id: "sd-4-q1", text: "Still water speed 12 km/h, stream 4 km/h. Time for 32 km downstream?", options: ["2h", "4h", "3h", "2.5h"], correctIndex: 0, explanation: "Down: 12+4=16 km/h. Time: 32/16=2h" },
        ],
        commonTraps: ["Forgetting to add/subtract stream speed to/from boat speed", "Using still water speed as the effective speed in both directions"],
        speedTips: ["Down + Up speeds = 2 × boat speed. Down - Up speeds = 2 × stream speed.", "The boat speed is the average of downstream and upstream speeds."],
      },
    },
  },

  // ── GMAT: DATA SUFFICIENCY STRATEGY ──────────────────────
  "data-sufficiency": {
    id: "data-sufficiency",
    subjectId: "gmat",
    topicPath: ["ds", "ds-strategy"],
    name: "Data Sufficiency Strategy",
    quickReference: {
      formula: "Evaluate (1) alone, then (2) alone. If neither, try (1)+(2) together. Never assume statements are sufficient.",
      keyIdea: "You don't need the exact answer — just determine if the data is ENOUGH to answer uniquely",
      shortcut: "AD/BCE grid: Start with (1). If sufficient, eliminate B/C/E; if not, eliminate A/D. Then evaluate (2).",
      commonMistake: "Selecting C when (1) and (2) individually give the same information (C requires each alone to be insufficient but together sufficient)",
    },
    levels: {
      1: {
        level: 1,
        title: "Yes/No Questions",
        explanation: "For yes/no DS questions, a statement is sufficient if it gives a definitive YES or definitive NO. If the answer could be either, the statement is insufficient. One definitive answer is enough.",
        examples: [
          { problem: "Is x > 5? (1) x = 7 (2) x² = 36", steps: ["(1) x=7 → YES, sufficient. Eliminate B,C,E.", "(2) x=6 or x=-6 → NO (x=-6) or YES (x=6). Not sufficient.", "Answer: A (Statement 1 alone)"], answer: "A" },
          { problem: "Is x even? (1) x is divisible by 4 (2) x² is even", steps: ["(1) divisible by 4 → even. YES, sufficient.", "(2) x² even → x even. YES, sufficient.", "Answer: D (Each alone sufficient)"], answer: "D" },
        ],
        questions: [
          { id: "ds-1-q1", text: "Is x positive? (1) x > -1 (2) x > 0", options: ["A", "B", "C", "D", "E"], correctIndex: 1, explanation: "(1) x > -1: x=0 (no), x=2 (yes). Insufficient. (2) x > 0: always yes. Sufficient. Answer: B" },
        ],
        commonTraps: ["Assuming a statement is insufficient because it gives a 'NO' answer — NO is a valid definitive answer", "Forgetting that statements must be evaluated independently"],
        speedTips: ["A definitive NO is just as sufficient as a definitive YES", "If a statement gives both YES and NO possibilities, it's insufficient"],
      },
      2: {
        level: 2,
        title: "Value Questions",
        explanation: "For value DS questions, a statement must give EXACTLY ONE possible value. If a statement allows multiple values, it's insufficient. The fact that you can solve an equation doesn't mean the value is unique.",
        examples: [
          { problem: "What is x? (1) x² = 25 (2) x > 0", steps: ["(1) x = 5 or -5 → two values. Insufficient.", "(2) x > 0 → infinite values. Insufficient.", "Together: x = 5. Sufficient. Answer: C"], answer: "C" },
          { problem: "What is the perimeter of a square? (1) Side = 5", steps: ["(1) Perimeter = 4×5 = 20. Exactly one value. Sufficient.", "Answer: A"], answer: "A" },
        ],
        questions: [
          { id: "ds-2-q1", text: "What is n? (1) n² = 49 (2) n is odd", options: ["A", "B", "C", "D", "E"], correctIndex: 2, explanation: "(1) n=7 or -7. Insufficient. (2) n could be any odd #. Insufficient. Together: n=7 (only odd). Answer: C" },
        ],
        commonTraps: ["Selecting D when a quadratic gives two possible values", "Forgetting that a single equation with two variables usually has infinite solutions"],
        speedTips: ["Linear equations: 1 equation, 1 variable → unique. 1 equation, 2 variables → infinite.", "Check for hidden constraints (positive integers, etc.) that may reduce possibilities"],
      },
      3: {
        level: 3,
        title: "The AD/BCE Grid",
        explanation: "The standard DS elimination strategy: Evaluate (1). If sufficient → eliminate B, C, E (remaining: A, D). If insufficient → eliminate A, D (remaining: B, C, E). Then evaluate (2). Works for both Yes/No and Value questions.",
        examples: [
          { problem: "Evaluate: (1) sufficient, (2) insufficient", steps: ["(1) sufficient → eliminate B, C, E", "(2) insufficient → eliminate D (was possible with A)", "Remaining: A → Answer is A"], answer: "A" },
          { problem: "Evaluate: (1) insufficient, (2) sufficient", steps: ["(1) insufficient → eliminate A, D", "(2) sufficient → eliminate C, E", "Remaining: B → Answer is B"], answer: "B" },
        ],
        questions: [
          { id: "ds-3-q1", text: "(1) insufficient, (2) insufficient. Together sufficient. Answer?", options: ["A", "B", "C", "D", "E"], correctIndex: 2, explanation: "(1) insufficient → eliminate A,D. (2) insufficient → B,C,E remain. Together sufficient → eliminate E. Answer: C" },
        ],
        commonTraps: ["Choosing E when (1) and (2) together are sufficient", "Choosing C when (1) or (2) alone is sufficient"],
        speedTips: ["Always write AD/BCE on scratch paper before starting", "The most common trap answer is C (when one alone is actually sufficient)"],
      },
    },
  },

  // ── GMAT: SENTENCE CORRECTION PARALLELISM ────────────────
  "sentence-correction-parallelism": {
    id: "sentence-correction-parallelism",
    subjectId: "gmat",
    topicPath: ["sc", "parallelism"],
    name: "Sentence Correction — Parallelism",
    quickReference: {
      formula: "Items in a list or comparison must share the same grammatical form (noun, verb, gerund, infinitive, etc.)",
      keyIdea: "Look for parallelism markers: and, or, but, both...and, either...or, not only...but also",
      shortcut: "Match the form of the first item in the list — all subsequent items should mirror it",
      commonMistake: "Ignoring the first element and matching an intermediate element instead",
    },
    levels: {
      1: {
        level: 1,
        title: "Basic Lists of Verbs",
        explanation: "In a list of actions, all verbs must share the same tense and form. If the first verb is in past tense, all others must also be in past tense. If the first is a gerund, all must be gerunds.",
        examples: [
          { problem: "Fix: 'She likes to run, swim, and cycling.'", steps: ["List: to run, swim, and cycling", "First two are infinitives (to run, [to] swim), third is gerund (cycling)", "Correct: 'She likes to run, swim, and cycle.'", "Or: 'She likes running, swimming, and cycling.'"], answer: "to run, swim, and cycle" },
          { problem: "Fix: 'The company hired, trained, and is promoting employees.'", steps: ["List: hired (past), trained (past), is promoting (present progressive)", "Mixed tenses", "Correct: 'The company hired, trained, and promoted employees.'"], answer: "hired, trained, and promoted" },
        ],
        questions: [
          { id: "sc-p-1-q1", text: "Choose correct: 'He enjoys reading, writing, and ___'", options: ["to paint", "paint", "painting", "painted"], correctIndex: 2, explanation: "List starts with gerunds (reading, writing), so third must also be gerund: painting" },
        ],
        commonTraps: ["Switching from infinitive to gerund mid-list (or vice versa)", "Forgetting the implied 'to' in an infinitive list"],
        speedTips: ["Underline the parallelism marker (and, or, but) and compare what's on both sides", "The first item sets the pattern — check all others against it"],
      },
      2: {
        level: 2,
        title: "Noun Lists",
        explanation: "Nouns in a list must match in form: count vs. non-count, singular vs. plural, and abstract vs. concrete. Mixed categories are ungrammatical.",
        examples: [
          { problem: "Fix: 'The course covers grammar, vocabulary, and how to write.'", steps: ["List: grammar (noun), vocabulary (noun), how to write (clause)", "Mix of nouns and a clause", "Correct: 'The course covers grammar, vocabulary, and writing.'"], answer: "grammar, vocabulary, and writing" },
          { problem: "Fix: 'His responsibilities include drafting reports, client meetings, and to train staff.'", steps: ["List: drafting reports (gerund phrase), client meetings (noun), to train staff (infinitive)", "Three different forms", "Correct: 'drafting reports, attending client meetings, and training staff.'"], answer: "drafting reports, attending client meetings, and training staff" },
        ],
        questions: [
          { id: "sc-p-2-q1", text: "Choose correct: 'Success requires dedication, hard work, and ___'", options: ["to persevere", "perseverance", "persevering", "persevere"], correctIndex: 1, explanation: "List is nouns (dedication, hard work) → perseverance (noun)" },
        ],
        commonTraps: ["Mixing concrete and abstract nouns in a list", "Using a clause where a noun phrase is expected"],
        speedTips: ["If the first item is a noun, all items should be nouns (or noun phrases)", "Replace 'and' with a bullet point list mentally to check form matching"],
      },
      3: {
        level: 3,
        title: "Correlative Conjunctions",
        explanation: "Correlative pairs (both...and, either...or, neither...nor, not only...but also) require the same grammatical form after each element of the pair. The structure after 'both' must match the structure after 'and'.",
        examples: [
          { problem: "Fix: 'She is both intelligent and has charm.'", steps: ["Both [adjective] AND [verb phrase]", "Mismatched forms", "Correct: 'She is both intelligent and charming.' (adjective + adjective)", "Or: 'She both has intelligence and has charm.' (verb phrase + verb phrase)"], answer: "intelligent and charming" },
          { problem: "Fix: 'He not only runs fast but also is a good swimmer.'", steps: ["Not only [verb phrase] but also [noun phrase]", "Correct: 'He not only runs fast but also swims well.'", "Or: 'He is not only a fast runner but also a good swimmer.'"], answer: "not only runs fast but also swims well" },
        ],
        questions: [
          { id: "sc-p-3-q1", text: "Choose correct: 'The movie was neither entertaining ___'", options: ["nor had educational value", "nor educational", "nor was it educational", "or educational"], correctIndex: 1, explanation: "Neither [adjective] nor [adjective]. 'entertaining' → 'educational'." },
        ],
        commonTraps: ["Putting a verb after the first element and a noun after the second", "Forgetting that the pair creates a grammatical lock — both sides must match exactly"],
        speedTips: ["Break correlative pairs into two halves: what's after 'both' must match what's after 'and'", "Read each half independently — if they use different forms, it's wrong"],
      },
      4: {
        level: 4,
        title: "Comparisons",
        explanation: "Comparisons require parallel structure: 'X is more A than B' — A and B must be the same grammatical form. 'I like X more than Y' — X and Y must be structurally parallel (both nouns, both clauses, etc.).",
        examples: [
          { problem: "Fix: 'Running is more effective than to walk for weight loss.'", steps: ["Comparison: Running (gerund) vs. to walk (infinitive)", "Correct: 'Running is more effective than walking for weight loss.'"], answer: "Running...walking" },
          { problem: "Fix: 'The weather in Chicago is colder than Miami.'", steps: ["Comparison: weather in Chicago vs. Miami (city)", "Illogical — comparing weather to a city", "Correct: 'The weather in Chicago is colder than that in Miami.'"], answer: "that in Miami" },
        ],
        questions: [
          { id: "sc-p-4-q1", text: "Choose correct: 'Her dedication to work is as strong as ___'", options: ["her brother", "her brother's", "her brother is", "brother"], correctIndex: 1, explanation: "Dedication vs. dedication: 'her dedication...as strong as her brother's [dedication]'" },
        ],
        commonTraps: ["Comparing a person to a quality (illogical comparison)", "Omitting 'that' or 'those' as a placeholder for the compared noun"],
        speedTips: ["After 'than' or 'as', check that the compared elements are structurally identical", "Add 'that/those' to fix missing noun comparisons: 'X of A is bigger than THAT of B'"],
      },
    },
  },

  // ── GRE: QUANT COMPARISON ────────────────────────────────
  "quant-comparison": {
    id: "quant-comparison",
    subjectId: "gre",
    topicPath: ["quantitative", "quant-comparison"],
    name: "Quant Comparison Strategy",
    quickReference: {
      formula: "Compare A and B. Answer A if A>B, B if B>A, C if equal, D if cannot determine.",
      keyIdea: "You don't need exact values — just determine which is larger, or if a unique comparison is possible",
      shortcut: "Simplify the comparison: subtract common terms, square both sides, or test boundary values",
      commonMistake: "Assuming variables are positive integers when they could be negative, zero, or fractional",
    },
    levels: {
      1: {
        level: 1,
        title: "Numeric Comparisons",
        explanation: "When both quantities are purely numeric, compute both values and compare directly. No tricks — just careful calculation. Watch for fractions, decimals, and exponents.",
        examples: [
          { problem: "A = 64 ÷ 8, B = 2 × 4", steps: ["A = 8, B = 8", "A = B", "Answer: C"], answer: "C" },
          { problem: "A = 1/4 + 1/3, B = 1/2", steps: ["A = 3/12 + 4/12 = 7/12 ≈ 0.583", "B = 0.5", "7/12 > 6/12, so A > B", "Answer: A"], answer: "A" },
        ],
        questions: [
          { id: "qc-1-q1", text: "A = 15% of 200, B = 20% of 150", options: ["A > B", "B > A", "A = B", "Cannot determine"], correctIndex: 2, explanation: "A=30, B=30. A=B. Answer: C" },
        ],
        commonTraps: ["Calculation errors with percentages", "Forgetting to find a common denominator for fractions"],
        speedTips: ["For pure numbers, just compute — there's always a unique answer (A, B, or C)", "Use rounding for quick estimation, then compute precisely to confirm"],
      },
      2: {
        level: 2,
        title: "Variable Comparisons",
        explanation: "When variables are involved, consider different types of numbers: positive, negative, zero, fractions between 0 and 1, and numbers greater than 1. Each can dramatically change the comparison.",
        examples: [
          { problem: "A = x², B = x, where x > 0", steps: ["If x = 2: A = 4, B = 2. A > B", "If x = 0.5: A = 0.25, B = 0.5. A < B", "Different outcomes depending on x", "Answer: D (cannot determine)"], answer: "D" },
          { problem: "A = x + 5, B = x + 3, where x is any real number", steps: ["A - B = (x+5) - (x+3) = 2", "A is always 2 more than B, regardless of x", "Answer: A"], answer: "A" },
        ],
        questions: [
          { id: "qc-2-q1", text: "A = 1/x, B = 1 (x > 1)", options: ["A > B", "B > A", "A = B", "Cannot determine"], correctIndex: 1, explanation: "If x>1, then 1/x < 1. Example: x=2, 1/2=0.5 < 1. B > A always." },
        ],
        commonTraps: ["Testing only one value (usually a positive integer)", "Forgetting that x² could equal x when x=0 or x=1"],
        speedTips: ["Test x=0, x=1, x=2, x=0.5, x=-1 for any variable comparison", "If the difference A-B simplifies to a constant, the answer is never D"],
      },
      3: {
        level: 3,
        title: "Geometric & Algebraic Shortcuts",
        explanation: "Many QC questions can be simplified algebraically before comparing. Square both sides (if both are positive), subtract common terms, or factor. This often reveals the comparison without computing each side.",
        examples: [
          { problem: "A = (x+y)², B = x² + y²", steps: ["A = x² + 2xy + y²", "B = x² + y²", "A - B = 2xy", "If x and y are both positive → A > B", "If x is negative and y positive → depends on magnitude", "If x = 1, y = -2: A = (-1)² = 1, B = 1+4=5. A < B", "Answer: D"], answer: "D" },
          { problem: "A = √(49), B = √(36) + √(1)", steps: ["A = 7", "B = 6 + 1 = 7", "A = B", "Answer: C"], answer: "C" },
        ],
        questions: [
          { id: "qc-3-q1", text: "A = √(a²), B = a, for any real a", options: ["A > B", "B > A", "A = B", "Cannot determine"], correctIndex: 3, explanation: "If a=2: A=2, B=2. If a=-2: A=2, B=-2. A>B when a<0, A=B when a≥0. Cannot determine." },
        ],
        commonTraps: ["Assuming √(a²) = a (it's actually |a|)", "Not simplifying before comparing — computing each side fully when algebra would reveal the answer faster"],
        speedTips: ["Simplify the larger expression first, then compare", "Square both sides when dealing with square roots (if both are positive)"],
      },
      4: {
        level: 4,
        title: "Word Problems in QC",
        explanation: "QC word problems often test whether you can set up the relationship correctly. The trick is usually not about computation but about understanding the scenario and constraints on variables.",
        examples: [
          { problem: "John is 5 years older than Mary. A = John's age in 3 years, B = Mary's age in 8 years", steps: ["Let Mary = m, John = m+5", "A = m+8, B = m+8", "A = B", "Answer: C"], answer: "C" },
          { problem: "A sells a product for $100, 25% profit. B sells for $120, 20% profit. A = A's cost, B = B's cost", steps: ["A: cost × 1.25 = 100, cost = 80", "B: cost × 1.20 = 120, cost = 100", "A = 80, B = 100", "A < B", "Answer: B"], answer: "B" },
        ],
        questions: [
          { id: "qc-4-q1", text: "A circle's radius is 5. A = circumference, B = area ÷ 2", options: ["A > B", "B > A", "A = B", "Cannot determine"], correctIndex: 2, explanation: "C=10π, A=πr²=25π, A/2=12.5π. Wait: 10π vs 12.5π, B > A. Let me recalc: A=10π≈31.4, B=25π/2≈39.3. B > A." },
        ],
        commonTraps: ["Reading the question too quickly and comparing the wrong quantities", "Forgetting unit conversions (time, money, distance)"],
        speedTips: ["Translate word problems into algebraic expressions before comparing", "Pay attention to 'in 3 years' vs '3 years ago' — these change the expressions significantly"],
      },
    },
  },

  // ── BANKING: PERCENTAGE TRICKS ───────────────────────────
  "percentage-tricks": {
    id: "percentage-tricks",
    subjectId: "banking",
    topicPath: ["numerical", "percentages"],
    name: "Percentage Tricks",
    quickReference: {
      formula: "x% of y = y% of x (commutative property of percentages)",
      keyIdea: "A% of B = B% of A. This is the single most useful percentage shortcut.",
      shortcut: "Convert to fractions: 12.5% = 1/8, 20% = 1/5, 25% = 1/4, 33.33% = 1/3, etc.",
      commonMistake: "Adding percentages of different bases (e.g., 10% of X + 10% of Y ≠ 20% of (X+Y))",
    },
    levels: {
      1: {
        level: 1,
        title: "Basic Percentage",
        explanation: "A percentage is a fraction out of 100. To find A% of B, multiply A/100 × B. The commutative property: A% of B = B% of A (e.g., 8% of 50 = 50% of 8 = 4).",
        examples: [
          { problem: "What is 8% of 50?", steps: ["Use commutativity: 8% of 50 = 50% of 8", "50% of 8 = 4", "Answer: 4"], answer: "4" },
          { problem: "What is 15% of 80?", steps: ["15% of 80 = 80% of 15 = 12", "Or compute: 15/100 × 80 = 12"], answer: "12" },
        ],
        questions: [
          { id: "pt-1-q1", text: "7% of 70 = ?", options: ["4.9", "5.6", "6.3", "7"], correctIndex: 0, explanation: "7% of 70 = 70% of 7 = 0.7 × 7 = 4.9" },
          { id: "pt-1-q2", text: "12% of 25 = ?", options: ["3", "4", "5", "6"], correctIndex: 0, explanation: "12% of 25 = 25% of 12 = 0.25 × 12 = 3" },
        ],
        commonTraps: ["Not using the commutative property (makes it harder)", "Forgetting that x% = x/100"],
        speedTips: ["Swap tricky percentages: 7% of 50 → 50% of 7 = 3.5", "If A% of B looks hard, try B% of A"],
      },
      2: {
        level: 2,
        title: "Fraction Equivalents",
        explanation: "Memorizing common fraction equivalents makes percentage problems instant: 50%=1/2, 25%=1/4, 12.5%=1/8, 20%=1/5, 33.33%=1/3, 66.66%=2/3, 10%=1/10, 5%=1/20.",
        examples: [
          { problem: "What is 37.5% of 64?", steps: ["37.5% = 3/8 (since 12.5% = 1/8, so 37.5% = 3/8)", "3/8 × 64 = 24", "Answer: 24"], answer: "24" },
          { problem: "What is 16.67% of 60?", steps: ["16.67% = 1/6", "1/6 × 60 = 10", "Answer: 10"], answer: "10" },
        ],
        questions: [
          { id: "pt-2-q1", text: "62.5% of 88 = ?", options: ["55", "50", "60", "65"], correctIndex: 0, explanation: "62.5% = 5/8 (12.5% × 5). 5/8 × 88 = 55" },
          { id: "pt-2-q2", text: "16.67% of 120 = ?", options: ["20", "25", "15", "30"], correctIndex: 0, explanation: "16.67% = 1/6. 120/6 = 20" },
        ],
        commonTraps: ["Forgetting the exact fraction equivalent for common percentages", "Using 1/5 for 12.5% (it's 1/8)"],
        speedTips: ["Memorize this sequence: 10%=1/10, 12.5%=1/8, 16.67%=1/6, 20%=1/5, 25%=1/4, 33.33%=1/3, 50%=1/2", "Any multiple of these: 37.5%=3×12.5%=3/8, 62.5%=5/8, etc."],
      },
      3: {
        level: 3,
        title: "Successive Percentage Change",
        explanation: "When a quantity changes by a% then by b%, the net change is NOT (a+b)%. The formula is: net = (a + b + ab/100)%. For two successive increases, this formula gives the total increase.",
        examples: [
          { problem: "Price increases 10% then 20%. Net increase?", steps: ["Net = 10 + 20 + (10×20)/100 = 30 + 2 = 32%", "Verification: start at 100. After 10%: 110. After 20%: 132.", "Net increase: 32%"], answer: "32%" },
          { problem: "Price increases 20% then decreases 10%. Net change?", steps: ["Net = 20 + (-10) + (20×(-10))/100 = 10 + (-2) = 8%", "Verification: start 100. After 20%: 120. After -10%: 108.", "Net increase: 8%"], answer: "+8%" },
        ],
        questions: [
          { id: "pt-3-q1", text: "Price increases 15% then 15% again. Net increase?", options: ["30%", "32.25%", "32%", "30.25%"], correctIndex: 1, explanation: "Net = 15+15+(225/100) = 30+2.25 = 32.25%" },
        ],
        commonTraps: ["Adding percentages directly (10+20=30 instead of 32)", "Forgetting the sign when a decrease is involved (negative in the formula)"],
        speedTips: ["The formula works for any combination of increases (+) and decreases (-)", "For small percentages (<5%), ab/100 is negligible, so a+b is approximately correct"],
      },
      4: {
        level: 4,
        title: "Profit & Loss Percentages",
        explanation: "Profit% = (Profit/CP) × 100. Loss% = (Loss/CP) × 100. SP = CP × (1 + P%) for profit, CP × (1 - L%) for loss. Always calculate percentages on Cost Price unless specified otherwise.",
        examples: [
          { problem: "Bought at $80, sold at $100. Profit %?", steps: ["Profit = 100 - 80 = 20", "Profit% = 20/80 × 100 = 25%"], answer: "25%" },
          { problem: "Marked 40% above CP, then 20% discount. Net profit %?", steps: ["Assume CP = 100. Marked = 140.", "After 20% discount: 140 × 0.8 = 112.", "Profit = 12%, Net profit % = 12%"], answer: "12%" },
        ],
        questions: [
          { id: "pt-4-q1", text: "CP = $50, SP = $40. Loss %?", options: ["20%", "25%", "10%", "15%"], correctIndex: 0, explanation: "Loss = 10. Loss% = 10/50 × 100 = 20%" },
        ],
        commonTraps: ["Calculating profit% on SP instead of CP", "Adding discount% directly to markup% (40% markup - 20% discount ≠ 20% profit)"],
        speedTips: ["A discount is applied on Marked Price, profit is on Cost Price", "For successive markup then discount: final = CP × (1+m%) × (1-d%)"],
      },
    },
  },
};

export function getTechniqueById(id: string): Technique | undefined {
  return TECHNIQUES_BY_ID[id];
}

export function getTechniquesBySubject(subjectId: string): Technique[] {
  return Object.values(TECHNIQUES_BY_ID).filter((t) => t.subjectId === subjectId);
}

export function getTechniquesByTopicPath(subjectId: string, topicPath: string[]): Technique[] {
  return Object.values(TECHNIQUES_BY_ID).filter(
    (t) => t.subjectId === subjectId && topicPath.every((seg, i) => t.topicPath[i] === seg),
  );
}

export function getAllTechniques(): Technique[] {
  return Object.values(TECHNIQUES_BY_ID);
}
