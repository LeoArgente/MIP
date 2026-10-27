/* Quem está usando a MIP agora (sessão do servidor). */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { get, post, patch } from './api.js';

const Ctx = createContext(null);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }) {
  const [me, setMe] = useState(undefined), [config, setConfig] = useState({});
  const refresh = useCallback(async () => {
    try { setMe(await get('/api/me')); } catch { setMe(null); }
  }, []);
  useEffect(() => { refresh(); get('/api/config').then(setConfig).catch(() => {}); }, [refresh]);
  const logout = async () => { await post('/api/auth/logout'); setMe(null); };
  const update = async data => { const u = await patch('/api/me', data); setMe(u); return u; };
  return <Ctx.Provider value={{ me, setMe, refresh, logout, update, config }}>{children}</Ctx.Provider>;
}
