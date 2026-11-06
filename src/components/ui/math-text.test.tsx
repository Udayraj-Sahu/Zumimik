import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MathText, splitMath } from "./math-text";

describe("splitMath", () => {
  it("separates text from single- and double-dollar maths", () => {
    expect(splitMath("Evaluate $x^2$ now")).toEqual([
      { math: false, value: "Evaluate ", display: false },
      { math: true, value: "x^2", display: false },
      { math: false, value: " now", display: false },
    ]);
    expect(splitMath("$$\\frac{1}{2}$$")).toEqual([{ math: true, value: "\\frac{1}{2}", display: true }]);
    expect(splitMath("no maths here")).toEqual([{ math: false, value: "no maths here", display: false }]);
  });
});

describe("MathText", () => {
  it("shows text with no dollar sign exactly as it is, without loading KaTeX", () => {
    render(<MathText text="What is 7 × 8?" />);
    expect(screen.getByText("What is 7 × 8?")).toBeInTheDocument();
  });

  it("typesets a formula instead of showing the dollar signs and backslashes", async () => {
    const { container } = render(<MathText text={"Express $\\frac{7}{8}$ as a decimal fraction"} />);
    await waitFor(() => expect(container.querySelector(".katex")).not.toBeNull());
    expect(container.textContent).toContain("as a decimal fraction");
    // what is drawn is the typeset formula; the TeX source lives only in the MathML annotation, for assistive technology
    const drawn = container.querySelector(".katex-html")?.textContent ?? "";
    expect(drawn).not.toContain("\\frac");
    expect(drawn).toContain("7");
    expect(container.textContent).not.toContain("$");
    // a MathML copy is there for screen readers
    expect(container.querySelector("math")).not.toBeNull();
  });

  it("a formula it cannot read is shown, not thrown", async () => {
    const { container } = render(<MathText text={"Bad $\\notacommand{$ end"} />);
    await waitFor(() => expect(container.textContent).toContain("end"));
  });
});
