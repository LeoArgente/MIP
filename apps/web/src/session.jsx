/* Quem está usando a MIP agora (sessão do servidor). */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { get, post, patch, definirPessoa } from './api.js';

const Ctx = createContext(null);
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }) {
  const [me, setMeEstado] = useState(undefined), [config, setConfig] = useState({});
  /* Único lugar que muda quem está usando: a tela (me) e o cabeçalho que api.js manda ao servidor mudam juntos.
     Auth.jsx e Invite.jsx também passam por aqui (setMe do contexto). */
  const setMe = useCallback(u => { definirPessoa(u ? u.id : null); setMeEstado(u); }, []);
  const refresh = useCallback(async () => {
    try { setMe(await get('/api/me')); } catch { setMe(null); }
  }, [setMe]);
  /* loaded diz se a configuração já chegou; failed, se o servidor não respondeu (a tela de entrar mostra o aviso). */
  const loadConfig = useCallback(() => get('/api/config').then(c => setConfig({ ...c, loaded: true })).catch(() => setConfig({ loaded: true, failed: true })), []);
  useEffect(() => { refresh(); loadConfig(); }, [refresh, loadConfig]);
  const logout = async () => { await post('/api/auth/logout'); setMe(null); };
  const update = async data => { const u = await patch('/api/me', data); setMe(u); return u; };
  return <Ctx.Provider value={{ me, setMe, refresh, logout, update, config, loadConfig }}>{children}</Ctx.Provider>;
}
