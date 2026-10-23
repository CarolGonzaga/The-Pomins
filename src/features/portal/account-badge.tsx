'use client';
import {usePreferences} from '../preferences/provider';
import {PixelAvatar} from '../preferences/avatar';
import styles from './portal.module.css';
export function AccountBadge({nickname}:{nickname:string}){const {preferences}=usePreferences();return <div className={styles.badge}><PixelAvatar kind={preferences.avatar}/><span>{nickname}</span></div>;}
