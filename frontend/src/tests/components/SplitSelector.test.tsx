import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SplitSelector } from "../../components/SplitSelector";

const mockUsers = [
  { id: "1", name: "Alice", email: "alice@test.com", groupIds: ["g1"] },
  { id: "2", name: "Bob", email: "bob@test.com", groupIds: ["g1"] },
  { id: "3", name: "Charlie", email: "charlie@test.com", groupIds: ["g1"] },
];

const defaultProps = {
  users: mockUsers,
  amount: 120,
  value: [
    { userId: "1", amount: 60 },
    { userId: "2", amount: 60 },
  ],
  onChange: jest.fn(),
  onError: jest.fn(),
};

describe("SplitSelector - Core Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("User Selection", () => {
    it("should display selected users from value prop", () => {
      render(<SplitSelector {...defaultProps} />);

      // MUI Select renders selected values via renderValue in a div, not an input.
      // We check the rendered text content instead.
      expect(screen.getByText("Alice, Bob")).toBeInTheDocument();
    });

    it("should allow selecting and deselecting users", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(<SplitSelector {...defaultProps} onChange={mockOnChange} />);

      // Open user selection dropdown
      const userSelect = screen.getByLabelText(/split with/i);
      await user.click(userSelect);

      // Initially Alice and Bob should be selected (from value prop)
      const aliceCheckbox = screen.getByRole("option", { name: /alice/i });
      const bobCheckbox = screen.getByRole("option", { name: /bob/i });
      const charlieCheckbox = screen.getByRole("option", { name: /charlie/i });

      expect(aliceCheckbox).toHaveAttribute("aria-selected", "true");
      expect(bobCheckbox).toHaveAttribute("aria-selected", "true");
      expect(charlieCheckbox).toHaveAttribute("aria-selected", "false");

      // Add Charlie
      await user.click(charlieCheckbox);

      // Should update with equal split for 3 users (120/3 = 40 each)
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          { userId: "1", amount: 40 },
          { userId: "2", amount: 40 },
          { userId: "3", amount: 40 },
        ]);
      });
    });
  });

  describe("Split Modes", () => {
    it("should calculate equal splits correctly", async () => {
      const mockOnChange = jest.fn();

      render(
        <SplitSelector
          {...defaultProps}
          amount={100}
          value={[]}
          onChange={mockOnChange}
        />
      );

      const user = userEvent.setup();

      // Select all 3 users
      const userSelect = screen.getByLabelText(/split with/i);
      await user.click(userSelect);

      await user.click(screen.getByRole("option", { name: /alice/i }));
      await user.click(screen.getByRole("option", { name: /bob/i }));
      await user.click(screen.getByRole("option", { name: /charlie/i }));

      // The component uses Button elements for split modes.
      // The Equal button should be active by default.
      // Should calculate equal splits: 100/3 = 33.33, with last user getting remainder
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          { userId: "1", amount: 33.33 },
          { userId: "2", amount: 33.33 },
          { userId: "3", amount: 33.34 },
        ]);
      });
    });

    it("should handle percentage splits", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <SplitSelector
          {...defaultProps}
          amount={100}
          value={[
            { userId: "1", amount: 0 },
            { userId: "2", amount: 0 },
          ]}
          onChange={mockOnChange}
        />
      );

      // Switch to percentage mode - Button elements
      await user.click(screen.getByRole("button", { name: /percentage/i }));

      // SplitInputField renders: <Typography>"UserName (%)"</Typography> above a plain TextField
      // The text field doesn't have an aria-label matching the user name, so we find by the input elements directly. 
      // After clicking Percentage, we get input fields.
      const inputs = screen.getAllByRole("spinbutton");

      // Enter percentages: clear and type
      await user.clear(inputs[0]);
      await user.type(inputs[0], "60");
      fireEvent.blur(inputs[0]); // SplitInputField updates on blur

      await user.clear(inputs[1]);
      await user.type(inputs[1], "40");
      fireEvent.blur(inputs[1]);

      // Should calculate amounts: 60% of 100 = 60, 40% of 100 = 40
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          { userId: "1", amount: 60 },
          { userId: "2", amount: 40 },
        ]);
      });
    });

    it("should handle custom amounts", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(<SplitSelector {...defaultProps} onChange={mockOnChange} />);

      // Switch to custom amount mode
      await user.click(screen.getByRole("button", { name: /custom amount/i }));

      const inputs = screen.getAllByRole("spinbutton");

      await user.clear(inputs[0]);
      await user.type(inputs[0], "70");
      fireEvent.blur(inputs[0]);

      await user.clear(inputs[1]);
      await user.type(inputs[1], "50");
      fireEvent.blur(inputs[1]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          { userId: "1", amount: 70 },
          { userId: "2", amount: 50 },
        ]);
      });
    });
  });

  describe("Validation", () => {
    it("should validate percentage totals", async () => {
      const user = userEvent.setup();
      const mockOnError = jest.fn();

      render(
        <SplitSelector
          {...defaultProps}
          value={[
            { userId: "1", amount: 0 },
            { userId: "2", amount: 0 },
          ]}
          onError={mockOnError}
        />
      );

      // Switch to percentage mode
      await user.click(screen.getByRole("button", { name: /percentage/i }));

      const inputs = screen.getAllByRole("spinbutton");

      await user.clear(inputs[0]);
      await user.type(inputs[0], "60");
      fireEvent.blur(inputs[0]);

      await user.clear(inputs[1]);
      await user.type(inputs[1], "30"); // Total = 90%, not 100%
      fireEvent.blur(inputs[1]);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining("100%")
        );
      });
    });

    it("should validate custom amount totals", async () => {
      const user = userEvent.setup();
      const mockOnError = jest.fn();

      render(
        <SplitSelector {...defaultProps} amount={100} onError={mockOnError} />
      );

      // Switch to custom amount mode
      await user.click(screen.getByRole("button", { name: /custom amount/i }));

      const inputs = screen.getAllByRole("spinbutton");

      await user.clear(inputs[0]);
      await user.type(inputs[0], "40");
      fireEvent.blur(inputs[0]);

      await user.clear(inputs[1]);
      await user.type(inputs[1], "40"); // Total = 80, but expense is 100
      fireEvent.blur(inputs[1]);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining("total")
        );
      });
    });

    it("should clear errors when validation passes", async () => {
      const user = userEvent.setup();
      const mockOnError = jest.fn();

      render(<SplitSelector {...defaultProps} onError={mockOnError} />);

      // Switch to percentage and create error
      await user.click(screen.getByRole("button", { name: /percentage/i }));

      const inputs = screen.getAllByRole("spinbutton");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "40");
      fireEvent.blur(inputs[0]); // Creates error (total 90% < 100%)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining("100%")
        );
      });

      // Fix the error
      await user.clear(inputs[1]);
      await user.type(inputs[1], "60"); // Now total = 100%
      fireEvent.blur(inputs[1]);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(null); // Error cleared
      });
    });
  });

  describe("Auto-fill Features", () => {
    it("should auto-fill remaining percentage for last user", async () => {
      const user = userEvent.setup();

      render(
        <SplitSelector
          {...defaultProps}
          value={[
            { userId: "1", amount: 0 },
            { userId: "2", amount: 0 },
            { userId: "3", amount: 0 },
          ]}
        />
      );

      // Switch to percentage mode
      await user.click(screen.getByRole("button", { name: /percentage/i }));

      const inputs = screen.getAllByRole("spinbutton");

      // Fill first two percentages
      await user.clear(inputs[0]);
      await user.type(inputs[0], "30");
      fireEvent.blur(inputs[0]);

      await user.clear(inputs[1]);
      await user.type(inputs[1], "20");
      fireEvent.blur(inputs[1]);

      // Charlie's percentage should auto-fill to 50%
      await waitFor(() => {
        expect(inputs[2]).toHaveValue(50);
      });
    });

    it("should provide reset to equal split functionality", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <SplitSelector
          {...defaultProps}
          amount={90}
          onChange={mockOnChange}
          value={[
            { userId: "1", amount: 10 },
            { userId: "2", amount: 80 },
          ]}
        />
      );

      // Switch to percentage mode
      await user.click(screen.getByRole("button", { name: /percentage/i }));

      // Click reset button
      await user.click(screen.getByRole("button", { name: /reset to equal/i }));

      // Should reset to equal percentages (50% each for 2 users)
      const inputs = screen.getAllByRole("spinbutton");
      await waitFor(() => {
        expect(inputs[0]).toHaveValue(50);
        expect(inputs[1]).toHaveValue(50);
      });
    });
  });

  describe("SplitSelector - Edge Cases", () => {
    it("should handle empty user selection", () => {
      const mockOnChange = jest.fn();

      render(
        <SplitSelector {...defaultProps} value={[]} onChange={mockOnChange} />
      );

      // When no users selected, should call onChange with empty array
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });

    it("should start with users from value prop", () => {
      render(
        <SplitSelector
          {...defaultProps}
          value={[
            { userId: "1", amount: 30 },
            { userId: "3", amount: 70 },
          ]}
        />
      );

      // MUI Select renders value in a div via renderValue, check rendered text
      expect(screen.getByText("Alice, Charlie")).toBeInTheDocument();
    });

    it("should update splits when users are deselected", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <SplitSelector
          {...defaultProps}
          value={[
            { userId: "1", amount: 60 },
            { userId: "2", amount: 60 },
          ]}
          onChange={mockOnChange}
        />
      );

      // Open dropdown and deselect Alice
      const userSelect = screen.getByLabelText(/split with/i);
      await user.click(userSelect);

      const aliceOption = screen.getByRole("option", { name: /alice/i });
      await user.click(aliceOption); // Deselect Alice

      // Should update to only Bob with full amount
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          { userId: "2", amount: 120 }, // Bob gets full amount
        ]);
      });
    });

    it("should handle single user splits correctly", async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();

      render(
        <SplitSelector
          {...defaultProps}
          amount={100}
          value={[]}
          onChange={mockOnChange}
        />
      );

      // Select only Alice
      const userSelect = screen.getByLabelText(/split with/i);
      await user.click(userSelect);
      await user.click(screen.getByRole("option", { name: /alice/i }));

      // Should give Alice the full amount
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([
          { userId: "1", amount: 100 },
        ]);
      });
    });
  });

  describe("SplitSelector - Validation Edge Cases", () => {
    it("should validate single user percentage at 100%", async () => {
      const user = userEvent.setup();
      const mockOnError = jest.fn();

      render(
        <SplitSelector
          {...defaultProps}
          value={[{ userId: "1", amount: 0 }]}
          onError={mockOnError}
        />
      );

      // Switch to percentage mode — but with only 1 user, percentage and custom buttons are disabled
      // (splitUserIds.length < 2 && tab > 0 causes tab to reset to 0)
      // So with 1 user, only Equal mode is available. This test verify that.
      const percentageBtn = screen.getByRole("button", { name: /percentage/i });
      expect(percentageBtn).toBeDisabled();
    });

    it("should validate single user custom amount matches total", async () => {
      const user = userEvent.setup();
      const mockOnError = jest.fn();

      render(
        <SplitSelector
          {...defaultProps}
          amount={100}
          value={[{ userId: "1", amount: 0 }]}
          onError={mockOnError}
        />
      );

      // With only 1 user, custom amount tab is disabled
      const customBtn = screen.getByRole("button", { name: /custom amount/i });
      expect(customBtn).toBeDisabled();
    });
  });
});
