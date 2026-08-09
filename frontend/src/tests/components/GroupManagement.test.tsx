// src/tests/components/GroupManagement.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GroupManagement from "../../components/GroupManagement";

const mockGroups = [
  {
    id: "1",
    name: "Trip Group",
    description: "Summer vacation",
    creatorId: "user1",
  },
  {
    id: "2",
    name: "Office Lunch",
    description: "Weekly team lunch",
    creatorId: "user2",
  },
];

const defaultProps = {
  groups: mockGroups,
  onFetchGroups: jest.fn(),
  onJoinGroup: jest.fn(),
  onCreateGroup: jest.fn(),
  onGetInviteInfo: jest.fn(),
  onUpdateGroup: jest.fn(),
  onDeleteGroup: jest.fn(),
  currentUserId: "user1",
  selectedGroupId: "1",
  onSelectGroup: jest.fn(),
  onSwitchToDashboard: jest.fn(),
};

describe("GroupManagement - Core Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Group Display", () => {
    it("should display all groups with correct information", () => {
      render(<GroupManagement {...defaultProps} />);

      expect(screen.getByText("Trip Group")).toBeInTheDocument();
      expect(screen.getByText("Summer vacation")).toBeInTheDocument();
      expect(screen.getByText("Office Lunch")).toBeInTheDocument();
      expect(screen.getByText("Weekly team lunch")).toBeInTheDocument();
    });

    it("should highlight selected group", () => {
      render(<GroupManagement {...defaultProps} />);

      // The selected group has a "Selected" chip
      expect(screen.getByText("Selected")).toBeInTheDocument();

      // The selected chip should be near Trip Group
      const tripGroupText = screen.getByText("Trip Group");
      const tripGroupCard = tripGroupText.closest(".MuiCard-root");
      expect(tripGroupCard).toBeTruthy();
      expect(within(tripGroupCard!).getByText("Selected")).toBeInTheDocument();
    });

    it("should show creator-only actions for owned groups", () => {
      render(<GroupManagement {...defaultProps} />);

      // Trip Group is owned by currentUserId "user1", should have Edit Group
      const tripGroupText = screen.getByText("Trip Group");
      const tripGroupCard = tripGroupText.closest(".MuiCard-root");
      expect(within(tripGroupCard!).getByText("Edit Group")).toBeInTheDocument();

      // Office Lunch is owned by "user2", should NOT have Edit Group
      const officeGroupText = screen.getByText("Office Lunch");
      const officeGroupCard = officeGroupText.closest(".MuiCard-root");
      expect(within(officeGroupCard!).queryByText("Edit Group")).not.toBeInTheDocument();
    });
  });

  describe("Group Creation", () => {
    it("should open create dialog and create new group", async () => {
      const user = userEvent.setup();
      const mockOnCreateGroup = jest.fn();

      render(
        <GroupManagement {...defaultProps} onCreateGroup={mockOnCreateGroup} />
      );

      // Click the top-level "Create Group" button
      const createButtons = screen.getAllByText("Create Group");
      await user.click(createButtons[0]);

      expect(screen.getByText("Create New Group")).toBeInTheDocument();

      // Fill form
      await user.type(screen.getByLabelText(/group name/i), "New Test Group");
      await user.type(
        screen.getByLabelText(/description/i),
        "Test description"
      );

      // Submit — the Create button inside the dialog
      const dialog = screen.getByText("Create New Group").closest('[role="dialog"]');
      const submitBtn = within(dialog!).getAllByText("Create Group");
      await user.click(submitBtn[submitBtn.length - 1]);

      expect(mockOnCreateGroup).toHaveBeenCalledWith(
        "New Test Group",
        "Test description"
      );
    });

    it("should require group name for creation", async () => {
      const user = userEvent.setup();

      render(<GroupManagement {...defaultProps} />);

      const createButtons = screen.getAllByText("Create Group");
      await user.click(createButtons[0]);

      // The Create button inside the dialog should be disabled when name is empty
      const dialog = screen.getByText("Create New Group").closest('[role="dialog"]');
      const createBtns = within(dialog!).getAllByRole("button");
      const submitBtn = createBtns.find(btn => btn.textContent === "Create Group");

      expect(submitBtn).toBeDisabled();
    });
  });

  describe("Group Joining", () => {
    it("should allow joining group with invite code", async () => {
      const user = userEvent.setup();
      const mockOnJoinGroup = jest.fn();

      render(
        <GroupManagement {...defaultProps} onJoinGroup={mockOnJoinGroup} />
      );

      // Open join dialog
      await user.click(screen.getByText("Join Group"));

      // Enter invite code
      await user.type(screen.getByLabelText(/invite code/i), "ABC123");

      // Submit
      await user.click(screen.getByRole("button", { name: /^join$/i }));

      expect(mockOnJoinGroup).toHaveBeenCalledWith("ABC123");
    });
  });

  describe("Invite Code Generation", () => {
    it("should generate and display invite code", async () => {
      const user = userEvent.setup();
      const mockOnGetInviteInfo = jest.fn().mockResolvedValue({
        inviteCode: "XYZ789",
        inviteLink: "http://app.com/join?code=XYZ789",
      });

      render(
        <GroupManagement
          {...defaultProps}
          onGetInviteInfo={mockOnGetInviteInfo}
        />
      );

      // Both cards have "Get Invite Code" buttons. Click the first one (Trip Group).
      const inviteButtons = screen.getAllByText("Get Invite Code");
      await user.click(inviteButtons[0]);

      await waitFor(() => {
        expect(mockOnGetInviteInfo).toHaveBeenCalledWith("1");
        expect(screen.getByDisplayValue("XYZ789")).toBeInTheDocument();
      });
    });

    it("should copy invite code to clipboard", async () => {
      const user = userEvent.setup();

      // Mock clipboard API using defineProperty
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      const mockOnGetInviteInfo = jest.fn().mockResolvedValue({
        inviteCode: "XYZ789",
        inviteLink: "http://app.com/join?code=XYZ789",
      });

      render(
        <GroupManagement
          {...defaultProps}
          onGetInviteInfo={mockOnGetInviteInfo}
        />
      );

      const inviteButtons = screen.getAllByText("Get Invite Code");
      await user.click(inviteButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue("XYZ789")).toBeInTheDocument();
      });

      // Click copy button (the icon button with CopyIcon)
      const copyButton = screen.getByRole("button", { name: "" });
      // The IconButton has no text, find by the CopyIcon testid
      const copyIcon = screen.getByTestId("ContentCopyIcon");
      await user.click(copyIcon.closest("button")!);

      // The component copies inviteLink (which is set from inviteInfo.inviteCode)
      expect(writeTextMock).toHaveBeenCalledWith("XYZ789");
    });
  });

  describe("Group Selection", () => {
    it("should call onSelectGroup and onSwitchToDashboard when group is clicked", async () => {
      const user = userEvent.setup();
      const mockOnSelectGroup = jest.fn();
      const mockOnSwitchToDashboard = jest.fn();

      render(
        <GroupManagement
          {...defaultProps}
          onSelectGroup={mockOnSelectGroup}
          onSwitchToDashboard={mockOnSwitchToDashboard}
        />
      );

      // Click on Office Lunch group
      await user.click(screen.getByText("Office Lunch"));

      expect(mockOnSelectGroup).toHaveBeenCalledWith("2");
      expect(mockOnSwitchToDashboard).toHaveBeenCalled();
    });
  });

  describe("Group Search", () => {
    const searchBox = () => screen.getByLabelText("Search groups");

    it("should filter to the matching group only", async () => {
      const user = userEvent.setup();
      render(<GroupManagement {...defaultProps} />);

      await user.click(searchBox());
      await user.keyboard("office");

      expect(screen.getByText("Office Lunch")).toBeInTheDocument();
      expect(screen.queryByText("Trip Group")).not.toBeInTheDocument();
    });

    it("should match on description as well as name", async () => {
      const user = userEvent.setup();
      render(<GroupManagement {...defaultProps} />);

      await user.click(searchBox());
      await user.keyboard("vacation");

      expect(screen.getByText("Trip Group")).toBeInTheDocument();
      expect(screen.queryByText("Office Lunch")).not.toBeInTheDocument();
    });

    it("should restore all groups when the search is cleared", async () => {
      const user = userEvent.setup();
      render(<GroupManagement {...defaultProps} />);

      await user.click(searchBox());
      await user.keyboard("office");
      await user.click(screen.getByLabelText("Clear search"));

      expect(screen.getByText("Trip Group")).toBeInTheDocument();
      expect(screen.getByText("Office Lunch")).toBeInTheDocument();
    });

    it("should distinguish a zero-match search from having no groups", async () => {
      const user = userEvent.setup();
      render(<GroupManagement {...defaultProps} />);

      await user.click(searchBox());
      await user.keyboard("zzzznotathing");

      expect(
        screen.getByText("No groups match your search.")
      ).toBeInTheDocument();
      expect(
        screen.queryByText("No groups yet. Join a group to get started!")
      ).not.toBeInTheDocument();
    });

    it("should keep the badge on the total count while filtering", async () => {
      const user = userEvent.setup();
      render(<GroupManagement {...defaultProps} />);

      await user.click(searchBox());
      await user.keyboard("office");

      // The badge means "you are in N groups", not "N results".
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Showing 1 of 2 groups")).toBeInTheDocument();
    });

    it("should not render the search box when there are no groups", () => {
      render(<GroupManagement {...defaultProps} groups={[]} />);

      expect(screen.queryByLabelText("Search groups")).not.toBeInTheDocument();
      expect(
        screen.getByText("No groups yet. Join a group to get started!")
      ).toBeInTheDocument();
    });
  });
});
