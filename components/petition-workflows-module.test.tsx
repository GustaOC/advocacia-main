import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { PetitionWorkflowsModule } from './petition-workflows-module';

vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/api-client', () => ({
  apiClient: { getPetitionWorkflows: vi.fn(), getEmployees: vi.fn() },
}));

describe('atualização automática de petições', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(apiClient.getEmployees).mockResolvedValue([]);
    client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 300_000 } } });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('atualiza a etapa sem fechar o formulário ou perder o texto digitado e para ao sair da aba', async () => {
    const workflow = { id: 'workflow-1', title: 'Petição de teste', current_step: 1, status: 'Em andamento', steps: [] };
    vi.mocked(apiClient.getPetitionWorkflows).mockResolvedValue([workflow]);

    const { unmount } = render(
      <QueryClientProvider client={client}><PetitionWorkflowsModule /></QueryClientProvider>,
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByText('Etapa 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nova Petição' }));
    const titleInput = screen.getByPlaceholderText('Ex: Petição Inicial - João da Silva');
    fireEvent.change(titleInput, { target: { value: 'Rascunho preservado' } });

    vi.mocked(apiClient.getPetitionWorkflows).mockResolvedValue([{ ...workflow, current_step: 2 }]);
    await act(async () => { await vi.advanceTimersByTimeAsync(5_010); });

    expect(apiClient.getPetitionWorkflows).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Etapa 2')).toBeInTheDocument();
    expect(titleInput).toHaveValue('Rascunho preservado');

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(apiClient.getPetitionWorkflows).toHaveBeenCalledTimes(2);
  });
});
