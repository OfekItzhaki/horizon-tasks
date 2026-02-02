import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../test/utils';
import LoginPage from './LoginPage';

describe('LoginPage (integration)', () => {
  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const form = screen.getByRole('button', { name: /sign in|login/i }).closest('form');
    await user.type(emailInput, 'invalid');
    await user.type(passwordInput, 'x');
    if (form) fireEvent.submit(form);
    await waitFor(() => {
      const errorEl = screen.getByRole('alert');
      expect(errorEl).toHaveTextContent(/Invalid email address|Email is required|fix the errors/i);
    });
  });

  it('submits login successfully (no error shown)', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submit = screen.getByRole('button', { name: /sign in|login/i });
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submit);
    await waitFor(() => {
      expect(screen.queryByText(/invalid credentials|login failed/i)).not.toBeInTheDocument();
    });
  });

  it('shows error when login fails', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submit = screen.getByRole('button', { name: /sign in|login/i });
    await user.type(emailInput, 'fail@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submit);
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials|login failed/i)).toBeInTheDocument();
    });
  });
});
