import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { needsProtocolHeaders } from '../needs-protocol';
export async function serverClient(options?: { needsProtocol: true }) {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      ...(options?.needsProtocol ? { global: { headers: needsProtocolHeaders } } : {}),
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* Server Components cannot write cookies. Proxy refreshes them. */
          }
        },
      },
    },
  );
}
