import { describe, expect, it } from "vitest";
import {
  mapBackendAchievements,
  mapBackendFriends,
  mapBackendMastery,
  mapBackendPracticeEdges,
  mapBackendPracticeSession,
  mapBackendRecentActivity,
  mapDashboardEventsToNotifications,
  mapBackendTechniqueSummaries,
  mapBackendTopicCatalog,
  mapContentFeedback,
  mapMockHistory,
  mapMockHistoryFilters,
  parseSignedPairingPayload,
  mapMockBlueprints,
} from "./backend-adapters";

describe("backend response adapters", () => {
  it("maps the backend achievement catalogue into the current UI contract", () => {
    expect(
      mapBackendAchievements({
        achievements: [
          {
            key: "speed_demon",
            name: "Speed Demon",
            tier: 2,
            category: "competitive",
            phase: "phase_1_build",
            desc: "Win in under a minute",
            unlocked_at: "2026-10-01T12:00:00Z",
          },
        ],
      }),
    ).toEqual([
      {
        id: "speed_demon",
        icon: "Zap",
        label: "Speed Demon",
        description: "Win in under a minute",
        unlocked: true,
        tier: "silver",
        category: "competitive",
        unlockedAt: "2026-10-01T12:00:00Z",
      },
    ]);
  });

  it("maps social friends and incoming requests without inventing missing profile stats", () => {
    expect(
      mapBackendFriends({
        friends: [{ friendship_id: "f1", user_id: "u1", name: "Ada Lovelace", source: "qr", since: "2026-09-01" }],
        incoming: [{ friendship_id: "f2", user_id: "u2", name: "Grace Hopper", source: "email" }],
        outgoing: [],
      }),
    ).toEqual({
      friends: [
        { id: "u1", name: "Ada Lovelace", initials: "AL" },
      ],
      requests: [
        { id: "u2", name: "Grace Hopper", initials: "GH" },
      ],
    });
  });

  it("adapts dashboard recent activity fields", () => {
    expect(
      mapBackendRecentActivity([{ label: "Practice session", score: "8/10", time: "Today" }]),
    ).toEqual([{ title: "Practice session", sub: "8/10", time: "Today" }]);
  });

  it("adapts dashboard events to the local notification shape", () => {
    expect(mapDashboardEventsToNotifications([
      { title: "Daily Challenge", time: "Today", tag: "LIVE" },
    ])).toEqual([
      {
        id: "dashboard-event-0-live",
        type: "challenge",
        title: "Daily Challenge",
        message: "Daily Challenge",
        time: "Today",
        read: false,
      },
    ]);
  });

  it("adapts backend topic and technique summaries without inventing lesson content", () => {
    expect(mapBackendTopicCatalog({ topics: [{ topic: "quant_arithmetic", problems: 12, subtopics: 3 }] }))
      .toEqual([
        {
          id: "quant_arithmetic",
          type: "topic",
          title: "quant arithmetic",
          slug: "quant-arithmetic",
          description: "12 problems · 3 subtopics",
        },
      ]);
    expect(mapBackendTechniqueSummaries({ techniques: [{ name: "nikhilam", topic: "Arithmetic", problem_count: 8 }] }))
      .toEqual([
        {
          id: "nikhilam",
          type: "technique",
          title: "nikhilam",
          slug: "nikhilam",
          description: "Arithmetic · 8 problems",
          techniqueId: "nikhilam",
        },
      ]);
  });

  it("maps the backend practice catalog's prerequisite edges", () => {
    expect(mapBackendPracticeEdges({ skills: [{ skill: "advanced", parents: ["basic"] }] }))
      .toEqual([{ sourceId: "advanced", targetId: "basic", type: "REQUIRES" }]);
  });

  it("maps backend practice items to text-answer questions without exposing answer keys", () => {
    const session = mapBackendPracticeSession({
      items: [{
        source: "tier1_static",
        template_id: "problem-1",
        question_text: "What is 6 × 7?",
        difficulty: 2,
        skill: "multiplication",
        technique: "urdhva",
        topic: "arithmetic",
        sub_topic: "multiplication",
        trust: "trusted",
        feeds_mastery: true,
        answer_check: "client_extract",
        expected_answer: 42,
      }],
      summary: { requested: 1, served: 1 },
    }, { topic: "multiplication", difficulty: "Beginner", domain: "cat" });

    expect(session.questions[0]).toMatchObject({
      id: "problem-1",
      text: "What is 6 × 7?",
      options: [],
      answerType: "text",
      expectedAnswer: 42,
      answerCheck: "client_extract",
      techniqueId: "multiplication",
      trustStatus: "trusted",
      feedsMastery: true,
    });
  });

  it("hydrates adaptive topics from backend mastery without inventing session totals", () => {
    expect(mapBackendMastery({
      technique_states: {
        nikhilam: { pLearned: 0.72, totalAttempts: 5, consecutiveCorrect: 2 },
      },
      selection: {
        nikhilam: { decayed_p_learned: 0.68, effective_state: "fragile" },
      },
    }, "cat")).toMatchObject({
      domain: "cat",
      topics: [{
        id: "nikhilam",
        mastery: 68,
        attempts: 5,
        currentStreak: 2,
        bestStreak: 2,
        status: "ACTIVE",
      }],
      lastSession: null,
    });
  });

  it("maps negative feedback to the backend content-report contract", () => {
    expect(mapContentFeedback({ questionId: "template-1", feedbackType: "thumbs_down", wrongAnswer: true }))
      .toMatchObject({
        templateId: "template-1",
        reason: "wrong_answer",
        comment: "Learner marked this content as not helpful.",
      });
  });

  it("accepts signed scanner-login payloads and rejects incomplete codes", () => {
    const code = "Abcdefgh_12345678";
    const sig = "a".repeat(64);
    expect(parseSignedPairingPayload(JSON.stringify({ code, sig }))).toEqual({ code, sig });
    expect(parseSignedPairingPayload(`${code}.${sig}`)).toEqual({ code, sig });
    expect(parseSignedPairingPayload(code)).toBeNull();
  });

  it("maps backend mock blueprints to the current paper list and filters by exam", () => {
    const mapped = mapMockBlueprints(
      {
        blueprints: [
          {
            key: "cat",
            name: "CAT",
            scoring: "raw",
            negative_marking: true,
            total_minutes: 120,
            notes: "Full CAT pattern",
            sections: [{ key: "qa", name: "Quantitative Ability", questions: 22, minutes: 40 }],
          },
          {
            key: "gre",
            name: "GRE",
            scoring: "scaled",
            negative_marking: false,
            total_minutes: 118,
            notes: "Full GRE pattern",
            sections: [{ key: "quant", name: "Quantitative Reasoning", questions: 27, minutes: 47 }],
          },
        ],
      },
      "cat",
    );

    expect(mapped).toHaveLength(1);
    expect(mapped[0]).toMatchObject({
      id: "cat",
      domain: "cat",
      title: "CAT",
      description: "Full CAT pattern",
      totalQuestions: 22,
      durationMinutes: 120,
      sections: [{ id: "qa", label: "Quantitative Ability", topic: "qa", questions: 22, minutes: 40 }],
    });
  });

  it("maps server-scored mock history and its exam section filters", () => {
    const history = mapMockHistory({
      attempts: [{
        mock_id: "mock-1",
        exam: "cat",
        sections: ["qa", "varc", "dilr"],
        total_score: 42,
        max_score: 66,
        percentile: 70,
        completed_at: "2026-10-20T12:00:00Z",
        total_time_taken_seconds: 3600,
      }],
    }, "cat");
    expect(history[0]).toMatchObject({
      id: "mock-1",
      topic: "qa",
      topicLabel: "CAT · Quantitative Aptitude",
      difficulty: "Mock exam",
      score: 42,
      total: 66,
      accuracy: 64,
      totalTimeSpent: 3_600_000,
    });

    expect(mapMockHistoryFilters({
      blueprints: [{
        key: "cat",
        name: "CAT",
        scoring: "raw",
        negative_marking: true,
        total_minutes: 120,
        notes: "CAT mock",
        sections: [{ key: "qa", name: "Quantitative Ability", questions: 22, minutes: 40 }],
      }],
    }, "cat")).toEqual([
      { id: "all", label: "All Topics" },
      { id: "qa", label: "Quantitative Aptitude" },
    ]);
  });
});
