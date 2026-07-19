import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterForm from './RegisterForm';

// Mock the auth store
const mockRegister = vi.fn();

vi.mock('../../store/authStore', () => ({
  useAuthStore: vi.fn((selector: (s: { register: typeof mockRegister }) => unknown) => {
    const state = { register: mockRegister };
    return selector ? selector(state) : state;
  }),
}));

function renderRegisterForm() {
  return render(
    <MemoryRouter>
      <RegisterForm />
    </MemoryRouter>,
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    mockRegister.mockReset();
  });

  it('renders username, email, password, and confirm password fields', () => {
    renderRegisterForm();
    expect(screen.getByPlaceholderText('Choose a username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('validates username pattern — rejects special characters', async () => {
    renderRegisterForm();
    await userEvent.type(screen.getByPlaceholderText('Choose a username'), 'bad!user');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/letters, numbers, and underscores only/i)).toBeInTheDocument();
  });

  it('validates minimum username length of 3 characters', async () => {
    renderRegisterForm();
    await userEvent.type(screen.getByPlaceholderText('Choose a username'), 'ab');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('At least 3 characters')).toBeInTheDocument();
  });

  it('validates minimum password length of 6 characters', async () => {
    renderRegisterForm();
    await userEvent.type(screen.getByPlaceholderText('Choose a username'), 'validuser');
    await userEvent.type(screen.getByPlaceholderText('Create a password'), '12345');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('At least 6 characters')).toBeInTheDocument();
  });

  it('validates that passwords must match', async () => {
    renderRegisterForm();
    await userEvent.type(screen.getByPlaceholderText('Choose a username'), 'validuser');
    await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'different456');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('allows email to be empty (optional field)', async () => {
    renderRegisterForm();
    await userEvent.type(screen.getByPlaceholderText('Choose a username'), 'validuser');
    await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    // Should call register without email
    expect(mockRegister).toHaveBeenCalledWith('validuser', 'password123', undefined);
  });

  it('calls store.register with all fields including email when provided', async () => {
    renderRegisterForm();
    await userEvent.type(screen.getByPlaceholderText('Choose a username'), 'janedoe');
    await userEvent.type(screen.getByPlaceholderText('Email (optional)'), 'jane@example.com');
    await userEvent.type(screen.getByPlaceholderText('Create a password'), 'secure123');
    await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'secure123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(mockRegister).toHaveBeenCalledWith('janedoe', 'secure123', 'jane@example.com');
  });

  it('displays an error alert when registration fails', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { detail: 'Username already taken' } },
    });

    renderRegisterForm();
    await userEvent.type(screen.getByPlaceholderText('Choose a username'), 'existing');
    await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123');
    await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Username already taken')).toBeInTheDocument();
  });
});
