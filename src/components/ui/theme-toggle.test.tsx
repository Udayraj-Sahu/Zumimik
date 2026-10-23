import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within, act } from "@testing-library/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useThemeStore } from "@/stores/theme-store";

const trigger = () => screen.getByRole("button", { name: "Open appearance settings" });
const dialog = () => screen.getByRole("dialog", { name: "Appearance settings" });
const modes = () => within(dialog()).getAllByRole("button", { name: /^(Light|Dark|Study)$/ });
const swatch = (name: string) => within(dialog()).getByRole("button", { name });
const slider = (name: string) => screen.getByRole("slider", { name }) as HTMLInputElement;

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    useThemeStore.getState().reset();
  });

  it("renders a closed, collapsed trigger", () => {
    render(<ThemeToggle />);

    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the full settings panel in one click, with every section visible", () => {
    render(<ThemeToggle />);
    fireEvent.click(trigger());

    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", dialog().id);
    expect(modes().map((option) => option.textContent)).toEqual(["Light", "Dark", "Study"]);
    expect(
      ["Coral", "Azure", "Mint", "Gold", "Lime", "Cyan", "Violet", "Red"].map((name) =>
        swatch(name).getAttribute("aria-pressed"),
      ),
    ).toEqual(["false", "false", "false", "false", "true", "false", "false", "false"]);
    expect(slider("Warm tint")).toBeInTheDocument();
    expect(slider("Brightness")).toBeInTheDocument();
    expect(within(dialog()).getByText("Warm tint")).toBeInTheDocument();
    expect(within(dialog()).getByText("Brightness")).toBeInTheDocument();
    expect(within(dialog()).queryByRole("button", { name: /^(Modes|Accent|Warn Tint|Reset)$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back to appearance menu" })).toBeNull();
  });

  it("focuses the active mode and closes on Escape with focus back on the trigger", () => {
    render(<ThemeToggle />);
    fireEvent.click(trigger());

    expect(within(dialog()).getByRole("button", { name: "Dark" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the user presses outside the panel and stays open inside it", () => {
    render(<ThemeToggle />);
    fireEvent.click(trigger());

    fireEvent.pointerDown(within(dialog()).getByText("Accent"));
    expect(dialog()).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("applies each mode through the real store and keeps the trigger glyph in sync", () => {
    const scope = document.createElement("div");
    scope.setAttribute("data-theme-scope", "");
    document.body.appendChild(scope);

    render(<ThemeToggle />);
    fireEvent.click(trigger());

    fireEvent.click(within(dialog()).getByRole("button", { name: "Light" }));
    expect(useThemeStore.getState().theme).toBe("light");
    expect(scope.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(trigger().querySelector("svg")?.getAttribute("class")).toContain("lucide-sun");

    fireEvent.click(within(dialog()).getByRole("button", { name: "Study" }));
    expect(useThemeStore.getState().theme).toBe("study");
    expect(scope.classList.contains("study")).toBe(true);
    expect(scope.classList.contains("light")).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(JSON.parse(localStorage.getItem("zuzumik-theme") ?? "{}").state.theme).toBe("study");
    expect(trigger().querySelector("svg")?.getAttribute("class")).toContain("lucide-book-open");

    fireEvent.click(within(dialog()).getByRole("button", { name: "Dark" }));
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(scope.classList.contains("study")).toBe(false);
    expect(trigger().querySelector("svg")?.getAttribute("class")).toContain("lucide-moon");

    const [light, dark, study] = modes();
    expect(light).toHaveAttribute("aria-pressed", "false");
    expect(dark).toHaveAttribute("aria-pressed", "true");
    expect(study).toHaveAttribute("aria-pressed", "false");
  });

  it("mirrors theme changes made outside the panel in the trigger glyph", () => {
    render(<ThemeToggle />);
    expect(trigger().querySelector("svg")?.getAttribute("class")).toContain("lucide-moon");

    act(() => useThemeStore.getState().setTheme("light"));
    expect(trigger().querySelector("svg")?.getAttribute("class")).toContain("lucide-sun");

    act(() => useThemeStore.getState().setTheme("study"));
    expect(trigger().querySelector("svg")?.getAttribute("class")).toContain("lucide-book-open");
  });

  it("writes every supported accent through to the shared accent tokens", () => {
    render(<ThemeToggle />);
    fireEvent.click(trigger());

    const expected = [
      ["Coral", "orange"],
      ["Azure", "blue"],
      ["Mint", "emerald"],
      ["Gold", "amber"],
      ["Lime", "lime"],
      ["Cyan", "cyan"],
      ["Violet", "violet"],
      ["Red", "red"],
    ] as const;

    for (const [label, accent] of expected) {
      fireEvent.click(swatch(label));

      expect(useThemeStore.getState().accent).toBe(accent);
      expect(swatch(label)).toHaveAttribute("aria-pressed", "true");
      for (const [otherLabel] of expected) {
        if (otherLabel !== label) {
          expect(swatch(otherLabel)).toHaveAttribute("aria-pressed", "false");
        }
      }
      expect(JSON.parse(localStorage.getItem("zuzumik-theme") ?? "{}").state.accent).toBe(accent);
    }
  });

  it("drives the warm tint slider from the shared store and reports its value", () => {
    render(<ThemeToggle />);
    fireEvent.click(trigger());

    const warm = slider("Warm tint");
    expect(warm.min).toBe("0");
    expect(warm.max).toBe("100");
    expect(warm.value).toBe("0");
    expect(within(dialog()).getByText("Off")).toBeInTheDocument();

    fireEvent.change(warm, { target: { value: "35" } });

    expect(useThemeStore.getState().warmTint).toBe(35);
    expect(warm.value).toBe("35");
    expect(within(dialog()).getByText("35%")).toBeInTheDocument();
    expect(within(dialog()).queryByText("Off")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--app-warmth")).toBe("35");
    expect(JSON.parse(localStorage.getItem("zuzumik-theme") ?? "{}").state.warmTint).toBe(35);
  });

  it("drives the brightness slider within 50-100 and reports its value", () => {
    render(<ThemeToggle />);
    fireEvent.click(trigger());

    const brightness = slider("Brightness");
    expect(brightness.min).toBe("50");
    expect(brightness.max).toBe("100");
    expect(brightness.value).toBe("100");
    expect(within(dialog()).getByText("100%")).toBeInTheDocument();

    fireEvent.change(brightness, { target: { value: "70" } });

    expect(useThemeStore.getState().brightness).toBe(70);
    expect(brightness.value).toBe("70");
    expect(within(dialog()).getByText("70%")).toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue("--app-brightness")).toBe("70");
    expect(JSON.parse(localStorage.getItem("zuzumik-theme") ?? "{}").state.brightness).toBe(70);
  });

  it("does not render surface or type controls", () => {
    render(<ThemeToggle />);
    fireEvent.click(trigger());

    expect(within(dialog()).queryByText(/surface/i)).toBeNull();
    expect(within(dialog()).queryByText(/^type$/i)).toBeNull();
  });

  it("recesses only while the bare trigger is pressed, then releases", () => {
    render(<ThemeToggle />);

    expect(trigger()).toHaveAttribute("data-pressed", "false");

    fireEvent.pointerDown(trigger());
    expect(trigger()).toHaveAttribute("data-pressed", "true");

    fireEvent.pointerUp(trigger());
    expect(trigger()).toHaveAttribute("data-pressed", "false");

    fireEvent.pointerDown(trigger());
    fireEvent.pointerLeave(trigger());
    expect(trigger()).toHaveAttribute("data-pressed", "false");
  });

  it("recesses on keyboard press and still opens on click", () => {
    render(<ThemeToggle />);

    fireEvent.keyDown(trigger(), { key: " " });
    expect(trigger()).toHaveAttribute("data-pressed", "true");

    fireEvent.keyUp(trigger(), { key: " " });
    expect(trigger()).toHaveAttribute("data-pressed", "false");

    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("data-pressed", "false");
  });

  it("does not change the theme when toggling the panel open and closed", () => {
    useThemeStore.getState().setTheme("dark");
    render(<ThemeToggle />);

    fireEvent.click(trigger());
    fireEvent.click(trigger());

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useThemeStore.getState().theme).toBe("dark");
  });
});
