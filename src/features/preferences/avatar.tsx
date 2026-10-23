import type {Preferences} from './model';
export const avatarLabels={sprout:'Broto',moon:'Lua',star:'Estrela',flower:'Flor'};
// Original 16px artwork. No external game sprites or icon library.
export function PixelAvatar({kind,label=avatarLabels[kind]}:{kind:Preferences['avatar'];label?:string}){
  return <svg viewBox="0 0 16 16" width="40" height="40" role="img" aria-label={label} shapeRendering="crispEdges">
    {kind==='sprout'?<><path d="M7 7h2v7H7zM3 3h4v2h2v4H5V7H3zM9 2h4v4h-2v2H9z" fill="#769662"/><path d="M4 13h8v2H4z" fill="#a17665"/></>
    :kind==='moon'?<><path d="M7 1h4v2H8v2H6v5h2v2h5v2h-3v1H5v-2H3v-3H2V6h1V3h4z" fill="#bba1cd"/><path d="M12 3h2v2h-2z" fill="#b79c55"/></>
    :kind==='star'?<path d="M7 1h2v4h5v3h-2v2h-1v4H8v-2H6v2H3v-4H2V7H1V5h5V3h1z" fill="#b59748"/>
    :<><path d="M7 8h2v7H7zM4 11h3v2H4zM9 10h3v2H9z" fill="#769662"/><path d="M6 1h4v3h3v4h-3v3H6V8H3V4h3z" fill="#c78499"/><path d="M6 4h4v4H6z" fill="#d9bb71"/></>}
  </svg>;
}
