import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render } from '../test/utils';
import LoginPage from './LoginPage';
import { server } from '../test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('LoginPage (integration)', () => {
  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const form = screen.getByLabelText(/sign in/i).closest('form');
    await user.type(emailInput, 'invalid');
    await user.type(passwordInput, 'x');
    if (form) fireEvent.submit(form);

    expect(emailInput).toBeInvalid();
  });

  it('submits login successfully (no error shown)', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submit = screen.getByLabelText(/sign in/i);
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submit);
    await waitFor(() => {
      expect(
        screen.queryByText(/invalid credentials|login failed/i)
      ).not.toBeInTheDocument();
    });
  });

  it('shows error when login fails', async () => {
    server.use(
      http.post('*/auth/login', () => {
        return HttpResponse.json(
          { message: 'Invalid credentials' },
          { status: 401 }
        );
      })
    );

    const user = userEvent.setup();
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    const submit = screen.getByLabelText(/sign in/i);

    await user.type(emailInput, 'fail@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submit);

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
