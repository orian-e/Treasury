// src/tests/components/MainApp.test.tsx
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainApp from '../../components/MainApp';
import { seedGroups, seedUsers, seedExpenses } from '../utils/mockData';

// We mock the API layer, but let all child components render naturally
const mockUseApi = jest.fn();
jest.mock('../../hooks/useApi', () => ({
  useExpenseApp: () => mockUseApi(),
}));

// Mock the date pickers because date-fns v4 throws ESM parsing errors in standard CRA Jest
jest.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@mui/x-date-pickers', () => ({
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DatePicker: () => <input type="text" data-testid="mock-date-picker" />,
}));

const defaultProps = {
  currentUser: 'alice@example.com',
  onLogout: jest.fn(),
};

describe('MainApp - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation: Alice is logged in, no group selected
    mockUseApi.mockReturnValue({
      expenses: seedExpenses,
      users: seedUsers,
      groups: seedGroups,
      selectedGroupId: null, // Start without a group selected
      loading: false,
      fetchExpenses: jest.fn(),
      fetchGroups: jest.fn(),
    });
  });

  it('should render all top-level tabs', () => {
    render(<MainApp {...defaultProps} />);

    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Settlements')).toBeInTheDocument();
    expect(screen.getByText('Totals')).toBeInTheDocument();
  });

  it('should show the Groups tab content completely', async () => {
    render(<MainApp {...defaultProps} />);

    // Because selectedGroupId is null, it should default to the Groups tab content.
    // Use regex to ignore exact emoji matches
    expect(screen.getByText(/Flatmates/i)).toBeInTheDocument();
    expect(screen.getByText(/ארוחות משפחתיות/i)).toBeInTheDocument();
  });

  it('should show group selection prompt when navigating to Expenses without a group', async () => {
    render(<MainApp {...defaultProps} />);

    const expensesTab = screen.getByRole('tab', { name: /expenses/i });
    // MUI tabs either get disabled attribute or Mui-disabled class. Both work with native checking.
    expect(expensesTab).toHaveAttribute('disabled');
  });

  it('should show the requested group content when a group is selected', async () => {
    // Override API mock to have Flatmates selected
    mockUseApi.mockReturnValue({
      expenses: seedExpenses.filter(e => e.groupId === 'g1'),
      users: seedUsers,
      groups: seedGroups,
      selectedGroupId: 'g1', 
      loading: false,
      fetchExpenses: jest.fn(),
      fetchGroups: jest.fn(),
    });

    render(<MainApp {...defaultProps} />);

    // Switch to expenses tab
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /expenses/i }));

    // verify the real ExpenseList child component renders the seed data
    expect(await screen.findByText(/Weekly groceries/i)).toBeInTheDocument();
    expect(screen.getByText(/Shared dinner/i)).toBeInTheDocument();
    
    // Switch to Totals tab
    await user.click(screen.getByRole('tab', { name: /totals/i }));
    
    // verify the real Totals child component renders the seed data
    expect(await screen.findByText(/Expense Totals/i)).toBeInTheDocument();
  });

  it('should switch to the Settlements tab and render settlement content', async () => {
    mockUseApi.mockReturnValue({
      expenses: seedExpenses.filter(e => e.groupId === 'g1'),
      users: seedUsers,
      groups: seedGroups,
      selectedGroupId: 'g1',
      loading: false,
      fetchExpenses: jest.fn(),
      fetchGroups: jest.fn(),
    });

    render(<MainApp {...defaultProps} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /settlements/i }));

    // The Settlements tab header should render with the group name
    await waitFor(() => {
      expect(screen.getByText(/Settlements for/i)).toBeInTheDocument();
      expect(screen.getByText(/Flatmates/i)).toBeInTheDocument();
    });
  });

  it('should ask for confirmation and call onLogout once confirmed', async () => {
    const mockOnLogout = jest.fn();
    render(<MainApp {...defaultProps} onLogout={mockOnLogout} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /logout/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/are you sure you want to log out/i)).toBeInTheDocument();
    expect(mockOnLogout).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /logout/i }));

    expect(mockOnLogout).toHaveBeenCalledTimes(1);
  });
});
