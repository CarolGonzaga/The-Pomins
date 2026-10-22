// Next loads .env files before this server-only configuration is evaluated.
// Fail before bundling a privileged key into NEXT_PUBLIC client code.
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
let privilegedPublicKey = publicKey?.startsWith('sb_secret_') ?? false;
if (publicKey?.split('.').length === 3) {
  try {
    const payload = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString());
    privilegedPublicKey ||= payload.role === 'service_role';
  } catch {
    // This guard checks known privileged key types, not JWT authenticity.
  }
}
if (privilegedPublicKey) {
  throw new Error(
    'Chave Supabase privilegiada no campo NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Use uma publishable key ou anon legada. O valor da chave foi omitido.',
  );
}

/** @type {import('next').NextConfig} */
const config = {
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ];
  },
};
export default config;
