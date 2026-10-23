import {requireAccount} from '@/features/preferences/server';
import {PortalLink} from '@/features/portal/navigation';
import {Landscape} from '@/features/portal/landscape';
import {AccountBadge} from '@/features/portal/account-badge';
import styles from '@/features/portal/portal.module.css';
export default async function MenuPage(){const account=await requireAccount('/menu');return <main id="main" className={styles.menu}><p className={styles.kicker}>The Pomins</p><h1>pomins.</h1><p className={styles.subtitle}>o mundo dos pomins</p><Landscape/><AccountBadge nickname={account.nickname}/><nav className={styles.choices} aria-label="Menu principal"><PortalLink href="/saves" className={styles.choice}>Começar</PortalLink><PortalLink href="/rules" className={styles.choice}>Regras</PortalLink><PortalLink href="/settings" className={styles.choice}>Configurações</PortalLink></nav><p className={styles.footer}>Seu foco. As histórias deles.</p></main>;}
