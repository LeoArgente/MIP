import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import '@fontsource/montserrat/300.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@mip/tokens/tokens.css';
import './styles/base.css';
import './styles/ds.css';
import './styles/site.css';
import './styles/auth.css';
import './styles/journey.css';
import './styles/tutorial.css';
import './styles/app.css';
import { SessionProvider, useSession } from './session.jsx';
import { ToastProvider } from './components/ui.jsx';
import { FeedbackProvider } from './components/Feedback.jsx';
import Start from './screens/Start.jsx';
import SiteLayout from './components/site/SiteLayout.jsx';
import SiteHome from './screens/site/Home.jsx';
import Sobre from './screens/site/Sobre.jsx';
import Proposito from './screens/site/Proposito.jsx';
import Equipe from './screens/site/Equipe.jsx';
import Contato from './screens/site/Contato.jsx';
import Auth from './screens/Auth.jsx';
import NewProject from './screens/NewProject.jsx';
import Invite from './screens/Invite.jsx';
import Project from './screens/Project.jsx';
import Admin from './screens/Admin.jsx';

/* Galeria de componentes: só em desenvolvimento. */
const DesignSystem = import.meta.env.DEV ? lazy(() => import('./screens/DesignSystem.jsx')) : null;

/* Telas que exigem conta mandam para /entrar e voltam depois. */
function Private({ children }) {
  const { me } = useSession(), loc = useLocation();
  if (me === undefined) return null;
  if (!me) return <Navigate to={'/entrar?next=' + encodeURIComponent(loc.pathname + loc.search)} replace />;
  return children;
}

/* Telas do app (ainda no visual antigo) dentro da coluna central. */
const AppShell = () => <div className="wrap"><Outlet /></div>;

function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<SiteHome />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/proposito" element={<Proposito />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/contato" element={<Contato />} />
      </Route>
      <Route path="/inicio" element={<Private><Start /></Private>} />
      <Route path="/novo" element={<Private><NewProject /></Private>} />
      <Route path="/p/:id/:tab?" element={<Private><Project /></Private>} />
      <Route path="/entrar" element={<Auth mode="entrar" />} />
      <Route path="/criar-conta" element={<Auth mode="criar" />} />
      {DesignSystem && <Route path="/_ds" element={<Suspense fallback={null}><DesignSystem /></Suspense>} />}
      <Route element={<AppShell />}>
        <Route path="/convite/:code" element={<Invite />} />
        <Route path="/admin" element={<Private><Admin /></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <ToastProvider>
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>
);
