'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import {defaultPreferences,type Preferences} from './model';
const Context=createContext({userId:null as string|null,preferences:defaultPreferences,setPreferences:(value:Preferences)=>{void value;}});
export function PreferencesProvider({userId,initial,children}:{userId:string|null;initial:Preferences;children:React.ReactNode}){
  const [preferences,setPreferences]=useState(initial);
  useEffect(()=>{
    const color=matchMedia('(prefers-color-scheme: dark)'),motion=matchMedia('(prefers-reduced-motion: reduce)');
    const apply=()=>{
      let theme=preferences.theme;
      if(!userId)try{const legacy=localStorage.getItem('pomins-theme');if(legacy==='light'||legacy==='dark')theme=legacy;}catch{}
      document.documentElement.dataset.theme=theme==='system'?(color.matches?'dark':'light'):theme;
      document.documentElement.dataset.reduceMotion=String(preferences.reduce_motion||motion.matches);
    };
    apply();color.addEventListener('change',apply);motion.addEventListener('change',apply);
    return()=>{color.removeEventListener('change',apply);motion.removeEventListener('change',apply);};
  },[preferences,userId]);
  return <Context.Provider value={{userId,preferences,setPreferences}}>{children}</Context.Provider>;
}
export const usePreferences=()=>useContext(Context);
