export async function gameApi<T>(body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Não foi possível conectar.');
    return data.data as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error(
        'A confirmação demorou. Confira a conexão e recupere a sessão para continuar.',
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
