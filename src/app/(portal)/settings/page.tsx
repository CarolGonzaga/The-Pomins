import {requireAccount} from '@/features/preferences/server';
import {PortalFrame} from '@/features/portal/frame';
import {Settings} from '@/features/preferences/settings';
export default async function SettingsPage(){const account=await requireAccount('/settings');return <PortalFrame title="Configurações"><Settings email={account.email}/></PortalFrame>;}
