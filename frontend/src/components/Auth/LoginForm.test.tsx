import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginForm from './LoginForm';

// Mock the auth store
const mockLogin = vi.fn();

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { login: typeof mockLogin }) => unknown) => {
    const state = { login: mockLogin };
    return selector ? selector(state) : state;
  }),
}));

function renderLoginForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockLogin.mockReset();
  });

  it('renders username field, password field, and sign-in button', () => {
    renderLoginForm();
    expect(screen.getByPlaceholderText('Enter your username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation error on empty submit', async () => {
    renderLoginForm();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    // Ant Design shows validation message
    expect(await screen.findByText('Please enter your username')).toBeInTheDocument();
  });

  it('calls store.login with form values on submit', async () => {
    renderLoginForm();
    await userEvent.type(screen.getByPlaceholderText('Enter your username'), 'testuser');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith('testuser', 'secret123');
  });

  it('displays an error alert when login fails', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { detail: 'Invalid credentials' } },
    });

    renderLoginForm();
    await userEvent.type(screen.getByPlaceholderText('Enter your username'), 'bad');
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('renders a link to the registration page', () => {
    renderLoginForm();
    const link = screen.getByText('Create one');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/register');
  });
});
