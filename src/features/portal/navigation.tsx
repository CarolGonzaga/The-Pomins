'use client';
import Link from 'next/link';
import {useState} from 'react';
export function PortalLink({href,children,className}:{href:string;children:React.ReactNode;className?:string}){
  const [notice,setNotice]=useState('');
  return <><Link href={href} className={className} onClick={e=>{if(document.documentElement.dataset.focusActive==='true'){e.preventDefault();setNotice('Use os controles da sessão para pausar antes de sair do foco.');}}}>{children}</Link>{notice && <span role="status">{notice}</span>}</>;
}
