import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { freshState, processAttempt } from "@vmsg/psychometrics";
import type { TopicNode } from "@/lib/types/technique";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/learn/explorer" }));
afterEach(cleanup);

const tree: TopicNode = {
  id: "subject:Arithmetic", type: "subject", title: "Arithmetic", slug: "arithmetic",
  children: [
    { id: "Fractions", type: "technique", title: "Fractions", slug: "fractions", techniqueId: "Fractions" },
    { id: "Division", type: "technique", title: "Division", slug: "division", techniqueId: "Division" },
    // a sub-topic with no technique mapping: display-only, no label invented
    { id: "topic:Number Theory::Primes", type: "subtopic", title: "Primes", slug: "primes" },
  ],
};

describe("mastery on the technique tree", () => {
  it("labels a technique with the learner's state, and leaves the rest unlabelled", async () => {
    const { MindMap } = await import("./mind-map");
    let s = freshState("Fractions");
    for (let i = 0; i < 30; i++) s = processAttempt(s, { correct: true, timeSpentSeconds: 3, targetTimeSeconds: 10, problemId: `p${i}`, at: Date.now() - 86_400_000 + i });
    render(<MindMap tree={tree} isLoading={false} masteryStateOf={(id) => (id === "Fractions" ? s.state : undefined)} />);
    const chips = await screen.findAllByTestId("mastery-state");
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent("Fluid");
    expect(screen.getByText("Division")).toBeInTheDocument(); // present, but no label: no history with it
    expect(screen.getByText("Primes")).toBeInTheDocument(); // unmapped sub-topic still shown, never labelled
  });

  it("without any mastery information the tree is unchanged", async () => {
    const { MindMap } = await import("./mind-map");
    render(<MindMap tree={tree} isLoading={false} />);
    expect(screen.queryByTestId("mastery-state")).not.toBeInTheDocument();
  });

  it("the mastery panel shows each skill's state next to the percentage", async () => {
    const { MasteryPanel } = await import("./mastery-panel");
    const states = { Fractions: { ...freshState("Fractions"), state: "fragile" as const } };
    render(
      <MasteryPanel
        mastery={[{ name: "Fractions", value: 64, color: "primary" } as never, { name: "Quadratics", value: 20, color: "primary" } as never]}
        isLoading={false} isError={false} onRetry={() => {}} practicable={new Set(["Fractions"])} states={states}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Fragile");
    expect(rows[0]).toHaveTextContent("64%");
    expect(rows[1]).not.toHaveTextContent(/Fractured|Fragile|Fluid/);
  });

  it("the next-step card names what to practise and links to that technique only", async () => {
    const { NextStepCard } = await import("@/components/adaptive/next-step-card");
    render(<NextStepCard next={{ skill: "LongDivision", kind: "review" }} />);
    expect(screen.getByTestId("next-step")).toHaveTextContent("Time to revisit: Long Division");
    expect(screen.getByRole("link", { name: "Practise Long Division" })).toHaveAttribute("href", "/learn/practice?skill=LongDivision");
    cleanup();
    render(<NextStepCard next={null} />);
    expect(screen.queryByTestId("next-step")).not.toBeInTheDocument();
  });
});
