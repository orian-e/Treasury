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
  const originalMatchMedia = window.matchMedia;
  const originalIntersectionObserver = window.IntersectionObserver;
  const originalVisibilityState = Object.getOwnPropertyDescriptor(
    document,
    "visibilityState",
  );

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
    window.IntersectionObserver = originalIntersectionObserver;
    if (originalVisibilityState) {
      Object.defineProperty(
        document,
        "visibilityState",
        originalVisibilityState,
      );
    }
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

  it("fills the new expense in three coarse stages", () => {
    render(<TreasuryDemo />);
    for (const step of STEP_SEQUENCE.slice(0, 3)) {
      advancePastStep(step);
    }

    const description = screen.getByLabelText("Description") as HTMLInputElement;
    const amount = screen.getByLabelText("Amount") as HTMLInputElement;
    const paidBy = screen.getByLabelText("Paid by") as HTMLInputElement;
    expect(description.value).toBe("");

    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(description.value).toBe(DEMO_NEW_EXPENSE.label);
    expect(amount.value).toBe("");

    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(amount.value).toBe(DEMO_NEW_EXPENSE.amount);
    expect(paidBy.value).toBe("");

    act(() => {
      jest.advanceTimersByTime(350);
    });
    expect(paidBy.value).toBe(DEMO_NEW_EXPENSE.paidBy);
  });

  it("freezes on totals after five complete visible loops", () => {
    render(<TreasuryDemo />);

    for (let loop = 0; loop < 5; loop += 1) {
      for (const step of STEP_SEQUENCE) {
        advancePastStep(step);
      }
    }

    expect(screen.getByText(DEMO_TOTAL)).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(120_000);
    });
    expect(screen.getByText(DEMO_TOTAL)).toBeInTheDocument();
    expect(screen.queryByText(DEMO_GROUPS[0])).not.toBeInTheDocument();
  });

  it("stops while hidden and restarts from the beginning on return", () => {
    render(<TreasuryDemo />);
    advancePastStep("groups");
    advancePastStep("groupSelected");
    expect(screen.getByText("Groceries")).toBeInTheDocument();

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText(DEMO_GROUPS[0])).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(120_000);
    });
    expect(screen.getByText(DEMO_GROUPS[0])).toBeInTheDocument();

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    advancePastStep("groups");
    advancePastStep("groupSelected");
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("stops off-screen, restarts on return, and disconnects its observer", () => {
    let intersectionCallback: IntersectionObserverCallback | undefined;
    const disconnect = jest.fn();
    window.IntersectionObserver = jest.fn().mockImplementation((callback) => {
      intersectionCallback = callback;
      return { observe: jest.fn(), unobserve: jest.fn(), disconnect };
    });

    const { unmount } = render(<TreasuryDemo />);
    act(() => {
      intersectionCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      jest.advanceTimersByTime(120_000);
    });
    expect(screen.getByText(DEMO_GROUPS[0])).toBeInTheDocument();

    act(() => {
      intersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
    advancePastStep("groups");
    advancePastStep("groupSelected");
    expect(screen.getByText("Groceries")).toBeInTheDocument();

    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
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
  });
});
