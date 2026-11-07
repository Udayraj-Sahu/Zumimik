import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuestionText, splitQuestionText } from "./question-text";

describe("splitQuestionText", () => {
  it("keeps a short question as the stem alone", () => {
    expect(splitQuestionText("What is 2+2?")).toEqual({ context: [], stem: "What is 2+2?" });
  });
  it("treats the last block as the question and the earlier blocks as context", () => {
    const out = splitQuestionText("Directions: read.\n\nThe passage text.\n\nWhat does the author mean?");
    expect(out.stem).toBe("What does the author mean?");
    expect(out.context).toEqual(["Directions: read.", "The passage text."]);
  });
});

describe("QuestionText", () => {
  it("sets directions and the passage apart from the question", () => {
    render(<QuestionText text={"Directions for Questions 1 to 5: choose.\n\nA long passage about grids.\n\nWhich is true?"} />);
    expect(screen.getByTestId("question-passage")).toHaveTextContent("A long passage about grids.");
    expect(screen.getByTestId("question-passage")).not.toHaveTextContent("Directions");
    expect(screen.getByTestId("question-stem")).toHaveTextContent("Which is true?");
    expect(screen.getByText(/Directions for Questions 1 to 5/)).toBeInTheDocument();
  });
  it("shows a plain question without a passage box", () => {
    render(<QuestionText text="Find 5% of 200." />);
    expect(screen.queryByTestId("question-passage")).not.toBeInTheDocument();
    expect(screen.getByTestId("question-stem")).toHaveTextContent("Find 5% of 200.");
  });
});
