import { requireAccount } from '@/features/preferences/server';
import { PortalLink } from '@/features/portal/navigation';
import { Landscape } from '@/features/portal/landscape';
import { AccountBadge } from '@/features/portal/account-badge';
import { LogoutButton } from '@/features/portal/logout-button';
import styles from '@/features/portal/portal.module.css';
export default async function MenuPage() {
  const account = await requireAccount('/menu');
  return (
    <main id="main" className={styles.menu}>
      <h1>The Pomins</h1>
      <p className={styles.subtitle}>o mundo dos pomins</p>
      <Landscape />
      <AccountBadge nickname={account.nickname} />
      <nav className={styles.choices} aria-label="Menu principal">
        <PortalLink href="/saves/new" className={styles.choice}>
          Iniciar
        </PortalLink>
        <PortalLink href="/saves" className={styles.choice}>
          Carregar
        </PortalLink>
        <PortalLink href="/rules" className={styles.choice}>
          Regras
        </PortalLink>
        <PortalLink href="/settings" className={styles.choice}>
          Configurações
        </PortalLink>
        <LogoutButton className={styles.choice} />
      </nav>
    </main>
  );
}
