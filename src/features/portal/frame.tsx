import {PortalLink} from './navigation';
import styles from './portal.module.css';
export function PortalFrame({children,title}:{children:React.ReactNode;title:string}){
  return <div className={styles.page}><header className={styles.header}><PortalLink href="/menu" className={styles.pixel}>pomins.</PortalLink><nav aria-label="Navegação do menu"><PortalLink href="/menu">Menu principal</PortalLink><PortalLink href="/saves">Partidas</PortalLink></nav></header><main id="main"><h1>{title}</h1>{children}</main></div>;
}
