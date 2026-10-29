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
  /* loaded diz se a configuração já chegou; failed, se o servidor não respondeu (a tela de entrar mostra o aviso). */
  const loadConfig = useCallback(() => get('/api/config').then(c => setConfig({ ...c, loaded: true })).catch(() => setConfig({ loaded: true, failed: true })), []);
  useEffect(() => { refresh(); loadConfig(); }, [refresh, loadConfig]);
  const logout = async () => { await post('/api/auth/logout'); setMe(null); };
  const update = async data => { const u = await patch('/api/me', data); setMe(u); return u; };
  return <Ctx.Provider value={{ me, setMe, refresh, logout, update, config, loadConfig }}>{children}</Ctx.Provider>;
}
