import {requireAccount} from '@/features/preferences/server';
import {PortalFrame} from '@/features/portal/frame';
import {Rules} from '@/features/portal/rules';
export default async function RulesPage(){await requireAccount('/rules');return <PortalFrame title="Como jogar"><Rules/></PortalFrame>;}
