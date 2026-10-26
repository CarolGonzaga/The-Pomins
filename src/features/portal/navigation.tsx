'use client';
import Link from 'next/link';
/** Internal navigation keeps the account-level focus runtime alive. */
export function PortalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
