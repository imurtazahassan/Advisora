import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

describe('ADVISORA application shell', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('introduces the product as a simulated, human-controlled advisory app', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'A calmer way to plan.' })).toBeInTheDocument();
    expect(screen.getByText(/No live exchange connection/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in securely' })).toBeEnabled();
  });

  it('shows the registration password boundary without submitting early', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));

    const password = screen.getByLabelText('Password');
    fireEvent.change(password, { target: { value: 'short' } });
    expect(screen.getByText('At least 12 characters required (5/12)')).toBeInTheDocument();
    expect(password).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(password, { target: { value: 'long-enough!' } });
    expect(screen.getByText('Meets 12-character minimum (12/12)')).toBeInTheDocument();
    expect(password).toHaveAttribute('aria-invalid', 'false');
  });

  it('loads the real-data dashboard panels after authentication', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.endsWith('/auth/login')
        ? { access_token: 'test-token', user: { email: 'demo@example.test' } }
        : url.endsWith('/market-data')
          ? { provider: 'SIMULATED', assets: [] }
          : url.endsWith('/advisories/accuracy')
            ? { sample_size: 0, display_value: 'N/A', history_note: 'No evaluated advisory signals.' }
            : [];
      return { ok: true, json: async () => data } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'demo@example.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in securely' }));

    expect(await screen.findByRole('heading', { name: 'Good to see you.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Markets' })).toHaveAttribute('href', '#market');
    expect(screen.getByText('PENDING POLICY')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/notifications'), expect.any(Object)));
  });
});
