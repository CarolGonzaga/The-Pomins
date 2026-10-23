'use client';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
export default function PortalError({reset}:{reset:()=>void}){return <main id="main" className="simple-page"><h1>Seu mundo continua aqui</h1><p role="alert">Não foi possível carregar. Confira a conexão e tente novamente.</p><Button onClick={reset}>Tentar novamente</Button><Link href="/auth">Entrar</Link></main>;}
