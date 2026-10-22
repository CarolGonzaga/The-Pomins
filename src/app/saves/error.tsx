'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import styles from '@/features/game-saves/manager.module.css';
export default function SavesError({reset}:{reset:()=>void}){return <main id="main" className={styles.page}><h1>Suas partidas</h1><p role="alert">Não foi possível carregar. Seus dados salvos foram preservados.</p><Button onClick={reset}>Tentar novamente</Button><Link href="/saves">Voltar às partidas</Link></main>;}
