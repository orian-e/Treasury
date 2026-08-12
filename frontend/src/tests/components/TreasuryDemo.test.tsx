import React from "react";
import { render, screen, act } from "@testing-library/react";
import TreasuryDemo from "../../components/TreasuryDemo/TreasuryDemo";
import {
  STEP_SEQUENCE,
  STEP_DURATIONS,
  DEMO_GROUPS,
  DEMO_NEW_EXPENSE,
  DEMO_TOTAL,
} from "../../components/TreasuryDemo/demoData";

// Decorative homepage preview: hardcoded data, no API/app-state involvement.
// These tests only cover that it cycles and cleans up, not pixel output.

describe("TreasuryDemo", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advancePastStep = (step: (typeof STEP_SEQUENCE)[number]) => {
    act(() => {
      jest.advanceTimersByTime(STEP_DURATIONS[step]);
    });
  };

  it("is decorative: excluded from the accessibility tree", () => {
    const { container } = render(<TreasuryDemo />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("starts on the groups screen and cycles through every step without crashing", () => {
    render(<TreasuryDemo />);
    // DEMO_GROUPS[0] only renders as a group card, unlike "Groups" which is
    // also the permanent nav-tab label shown on every step.
    expect(screen.getByText(DEMO_GROUPS[0])).toBeInTheDocument();

    // Walk one full loop; each step transition should render without error.
    for (const step of STEP_SEQUENCE) {
      advancePastStep(step);
    }

    // Back at the start of the loop.
    expect(screen.getByText(DEMO_GROUPS[0])).toBeInTheDocument();
  });

  it("reaches the totals screen with the hardcoded total", () => {
    render(<TreasuryDemo />);
    for (const step of STEP_SEQUENCE.slice(0, STEP_SEQUENCE.length - 1)) {
      advancePastStep(step);
    }
    expect(screen.getByText(DEMO_TOTAL)).toBeInTheDocument();
  });

  it("types the new expense into the form instead of showing it all at once", () => {
    render(<TreasuryDemo />);
    for (const step of STEP_SEQUENCE.slice(0, 3)) {
      advancePastStep(step);
    }

    const description = screen.getByLabelText("Description") as HTMLInputElement;
    const amount = screen.getByLabelText("Amount") as HTMLInputElement;
    const paidBy = screen.getByLabelText("Paid by") as HTMLInputElement;
    expect(description.value).toBe("");

    act(() => {
      jest.advanceTimersByTime(65 * DEMO_NEW_EXPENSE.label.length);
    });
    expect(description.value).toBe(DEMO_NEW_EXPENSE.label);
    expect(amount.value).toBe("");

    act(() => {
      jest.advanceTimersByTime(
        65 * (DEMO_NEW_EXPENSE.amount.length + DEMO_NEW_EXPENSE.paidBy.length),
      );
    });
    expect(amount.value).toBe(DEMO_NEW_EXPENSE.amount);
    expect(paidBy.value).toBe(DEMO_NEW_EXPENSE.paidBy);
  });

  it("clears its timer on unmount instead of updating after unmount", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<TreasuryDemo />);
    unmount();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("freezes on a single frame instead of cycling when the OS asks for reduced motion", () => {
    // jsdom has no matchMedia at all (not even a stub), so it's assigned
    // directly rather than jest.spyOn-ed onto an existing property. MUI's
    // useMediaQuery falls back to `false` when matchMedia is undefined,
    // which is why the other tests above never exercise this branch.
    const originalMatchMedia = window.matchMedia;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<TreasuryDemo />);
    expect(screen.getByText("Streaming")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    // Still the same static frame — no step advanced.
    expect(screen.getByText("Streaming")).toBeInTheDocument();
    expect(screen.queryByText(DEMO_TOTAL)).not.toBeInTheDocument();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).matchMedia = originalMatchMedia;
  });
});
