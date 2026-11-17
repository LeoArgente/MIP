import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteFooter, SiteHeader } from '../ds/index.js';

/* Moldura das páginas do site: header de vidro fixo, conteúdo e rodapé. */
export default function SiteLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <>
      <SiteHeader />
      <main className="site-main"><Outlet /></main>
      <SiteFooter compact={pathname === '/contato'} />
    </>
  );
}
