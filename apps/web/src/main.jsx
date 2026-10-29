import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import '@mip/tokens/tokens.css';
import './styles/app.css';
import { SessionProvider, useSession } from './session.jsx';
import { ToastProvider } from './components/ui.jsx';
import { FeedbackProvider } from './components/Feedback.jsx';
import Home from './screens/Home.jsx';
import Login from './screens/Login.jsx';
import NewProject from './screens/NewProject.jsx';
import Invite from './screens/Invite.jsx';
import Project from './screens/Project.jsx';
import Admin from './screens/Admin.jsx';

/* Telas que exigem conta mandam para /entrar e voltam depois. */
function Private({ children }) {
  const { me } = useSession(), loc = useLocation();
  if (me === undefined) return null;
  if (!me) return <Navigate to={'/entrar?next=' + encodeURIComponent(loc.pathname + loc.search)} replace />;
  return children;
}

function App() {
  return (
    <div className="wrap">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/novo" element={<Private><NewProject /></Private>} />
        <Route path="/convite/:code" element={<Invite />} />
        <Route path="/p/:id/:tab?" element={<Private><Project /></Private>} />
        <Route path="/admin" element={<Private><Admin /></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
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
