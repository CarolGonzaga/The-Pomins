import styles from '@/features/portal/portal.module.css';
export default function PortalLayout({children}:{children:React.ReactNode}){return <div className={styles.portal}>{children}</div>;}
