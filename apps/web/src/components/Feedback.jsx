/* Feedback para a equipe da MIP (fase de testes).
   - Botão "Feedback" fixo em todas as telas: abre uma janela com um campo só. A tela em que a pessoa está
     vai junto, em palavras, para ela não precisar explicar onde estava.
   - Nota de satisfação (de "Muito ruim" a "Muito bom"), pedida depois de ver o registro do acordo. */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { SECTIONS } from '@mip/domain';
import { get, post } from '../api.js';
import { useSession } from '../session.jsx';
import { Btn, Err, useToast } from './ui.jsx';

const SEC = Object.fromEntries([['proj', 'Página do projeto'], ['coleta', 'Andamento das respostas'], ...SECTIONS]);
/* Nome da tela a partir do endereço; telas com mais detalhe (uma pergunta, um ponto) usam usePlace. */
function placeOf(path) {
  const m = path.match(/^\/p\/[^/]+\/?([^/]*)/);
  if (m) return SEC[m[1] || 'proj'] || 'Projeto';
  if (path.startsWith('/convite')) return 'Convite';
  return { '/': 'Início', '/entrar': 'Entrar', '/novo': 'Novo projeto' }[path] || path;
}
const projectOf = path => path.match(/^\/p\/([^/]+)/)?.[1];
const device = () => (window.matchMedia('(max-width: 767px)').matches ? 'celular' : 'computador');
const MAX_IMGS = 3;
/* Reduz o print antes de enviar (lado maior até 1920 px, JPEG): a maioria fica com algumas centenas de KB. */
async function shrink(file) {
  const bmp = await createImageBitmap(file), k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  let blob;
  for (const q of [0.85, 0.7, 0.5]) { blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); if (blob && blob.size < 1.4e6) break; }
  if (!blob || blob.size >= 1.4e6) throw new Error('grande');
  const data = await new Promise((ok, bad) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = bad; fr.readAsDataURL(blob); });
  return { id: Math.random().toString(36).slice(2), mime: 'image/jpeg', data, url: URL.createObjectURL(blob), name: file.name || 'print colado' };
}

const PlaceCtx = createContext(() => {});
/* Uma tela informa onde a pessoa está com mais detalhe, por exemplo "Decisões · Logo · ponto 2". */
export function usePlace(label) {
  const set = useContext(PlaceCtx);
  useEffect(() => { set(label); return () => set(null); }, [set, label]);
}

export function FeedbackProvider({ children }) {
  const [place, setPlace] = useState(null);
  return <PlaceCtx.Provider value={setPlace}>{children}<FeedbackButton detail={place} /></PlaceCtx.Provider>;
}

function FeedbackButton({ detail }) {
  const { config } = useSession(), { pathname } = useLocation(), say = useToast();
  const dlg = useRef(), pickFile = useRef(), [text, setText] = useState(''), [err, setErr] = useState(''), [sending, setSending] = useState(false);
  const [imgs, setImgs] = useState([]), [adding, setAdding] = useState(false), [drag, setDrag] = useState(false);
  if (!config.feedback || pathname.startsWith('/admin')) return null;
  /* Prints chegam por "Anexar print", colando (Ctrl+V / ⌘V) ou arrastando para a janela. */
  const addFiles = async files => {
    const list = [...files].filter(f => f.type.startsWith('image/'));
    if (!list.length) return;
    const room = MAX_IMGS - imgs.length;
    if (room <= 0) return setErr('Você pode anexar até ' + MAX_IMGS + ' prints.');
    setErr(''); setAdding(true);
    const out = [];
    for (const f of list.slice(0, room)) { try { out.push(await shrink(f)); } catch { setErr('Não foi possível usar uma das imagens. Tente outra.'); } }
    if (list.length > room) setErr('Você pode anexar até ' + MAX_IMGS + ' prints.');
    setImgs(cur => [...cur, ...out].slice(0, MAX_IMGS)); setAdding(false);
  };
  const removeImg = id => setImgs(cur => { const x = cur.find(i => i.id === id); if (x) URL.revokeObjectURL(x.url); return cur.filter(i => i.id !== id); });
  const onPaste = e => { const fs = [...(e.clipboardData?.items || [])].filter(i => i.kind === 'file' && i.type.startsWith('image/')).map(i => i.getAsFile()).filter(Boolean); if (fs.length) { e.preventDefault(); addFiles(fs); } };
  const onDrop = e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); };
  const where = detail || placeOf(pathname);
  const open = () => { setErr(''); dlg.current.showModal(); };
  const close = () => dlg.current.close();
  const send = async e => {
    e.preventDefault();
    if (!text.trim() && !imgs.length) return setErr('Escreva o que aconteceu ou anexe um print.');
    setSending(true);
    try {
      await post('/api/feedback', { kind: 'texto', text, images: imgs.map(i => ({ mime: i.mime, data: i.data })), screen: where, path: pathname, projectId: projectOf(pathname), device: device() });
      imgs.forEach(i => URL.revokeObjectURL(i.url));
      setText(''); setImgs([]); close(); say('Obrigado! Recebemos seu feedback.');
    } catch (x) { setErr(x.message); } finally { setSending(false); }
  };
  return (
    <>
      <button type="button" className="fb-pill" onClick={open} aria-haspopup="dialog">Feedback</button>
      {/* Fechar não apaga o que foi escrito: ao abrir de novo, o texto continua lá. */}
      <dialog ref={dlg} className="fb-dialog" aria-labelledby="fb-title" onClick={e => { if (e.target === dlg.current) close(); }}>
        <form onSubmit={send} className={'fb-form' + (drag ? ' drag' : '')} onPaste={onPaste} onDragOver={e => { if ([...e.dataTransfer.types].includes('Files')) { e.preventDefault(); setDrag(true); } }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false); }} onDrop={onDrop}>
          <h2 id="fb-title">Seu feedback</h2>
          <div className="fb-field">
            <label htmlFor="fb-text">O que aconteceu aqui?</label>
            <textarea id="fb-text" value={text} onChange={e => { setText(e.target.value); setErr(''); }} placeholder="Ex.: Não entendi o que fazer nesta tela." maxLength={2000} aria-describedby="fb-where" autoFocus />
            <p id="fb-where" className="fb-where">Vamos saber que você estava em: <b>{where}</b></p>
          </div>
          <div className="fb-field">
            {imgs.length > 0 && (
              <ul className="fb-thumbs" aria-label="Prints anexados">
                {imgs.map((i, n) => <li key={i.id}><img src={i.url} alt={'Print ' + (n + 1)} /><button type="button" className="fb-rm" onClick={() => removeImg(i.id)} aria-label={'Remover print ' + (n + 1)}>×</button></li>)}
              </ul>
            )}
            <div className="fb-attach">
              {imgs.length < MAX_IMGS && <button type="button" className="btn sm" onClick={() => pickFile.current.click()} disabled={adding}>{adding ? 'Anexando…' : 'Anexar print'}</button>}
              <input ref={pickFile} type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/*" multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
            </div>
          </div>
          <Err msg={err} />
          <div className="fb-acts">
            <button type="button" className="btn" onClick={close}>Cancelar</button>
            <button type="submit" className="btn pri" disabled={sending || adding} aria-busy={sending || undefined}>{sending && <span className="spin" aria-hidden="true" />}{sending ? 'Enviando…' : 'Enviar'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export const RATINGS = ['Muito ruim', 'Ruim', 'Regular', 'Bom', 'Muito bom'];
const KEY = id => 'mip.sat.' + id;
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: o cartão só volta a aparecer */ } } };
/* O registro do acordo marca que foi visto; a página do projeto só pede a nota depois disso. */
export const markSeen = id => { if (!store.get(KEY(id))) store.set(KEY(id), 'visto'); };

/* Nota de satisfação. where="memorial": sempre no fim do registro. where="hub": abaixo do "Agora",
   só depois de ver o registro, até a pessoa responder ou tocar em "Agora não". */
export function Satisfaction({ projectId, where }) {
  const { config } = useSession(), { pathname } = useLocation();
  const [rating, setRating] = useState(undefined), [prior, setPrior] = useState(false), [step, setStep] = useState('ask'), [text, setText] = useState(''), [err, setErr] = useState('');
  const [hidden, setHidden] = useState(() => where === 'hub' && store.get(KEY(projectId)) !== 'visto');
  useEffect(() => { if (config.feedback && !hidden) get('/api/feedback/satisfaction/' + projectId).then(r => { setRating(r.rating); if (r.rating) { setPrior(true); setStep('done'); } }).catch(() => setRating(null)); }, [projectId, config.feedback, hidden]);
  if (!config.feedback || hidden || rating === undefined) return null;
  /* Na página do projeto, quem já avaliou antes não vê mais o cartão. */
  if (where === 'hub' && prior) return null;
  const save = (r, t) => post('/api/feedback', { kind: 'satisfacao', rating: r, text: t, screen: where === 'hub' ? 'Página do projeto' : 'Registro do acordo', path: pathname, projectId, device: device() });
  const pick = async r => {
    setErr(''); setRating(r);
    try { await save(r); setStep('more'); } catch (x) { setErr(x.message); }
  };
  const later = () => { store.set(KEY(projectId), 'depois'); setHidden(true); };
  const sendMore = async () => {
    try { if (text.trim()) await save(rating, text); setStep('done'); } catch (x) { setErr(x.message); }
  };
  return (
    <section className="sat" aria-labelledby={'sat-' + where}>
      {step === 'done' ? (
        <p className="sat-done" role="status"><b>Obrigado!</b> Sua avaliação: {RATINGS[rating - 1].toLowerCase()}. <button className="link" onClick={() => setStep('ask')}>Mudar</button></p>
      ) : (
        <>
          <div className="sat-head">
            <h2 id={'sat-' + where}>Como foi usar a MIP neste projeto?</h2>
            <p>Sua avaliação vai para a equipe da MIP, não para o grupo do projeto.</p>
          </div>
          <div className="sat-scale" role="radiogroup" aria-labelledby={'sat-' + where}>
            {RATINGS.map((n, i) => <label className="sat-opt" key={n}><input type="radio" name={'sat-r-' + where} checked={rating === i + 1} onChange={() => pick(i + 1)} /><span>{n}</span></label>)}
          </div>
          {step === 'more' && (
            <div className="sat-more">
              <label htmlFor={'sat-text-' + where}>Quer contar mais? <span className="muted">(opcional)</span></label>
              <textarea id={'sat-text-' + where} value={text} onChange={e => setText(e.target.value)} maxLength={2000} placeholder="O que ajudou ou atrapalhou?" />
            </div>
          )}
          <Err msg={err} />
          <div className="sat-acts">
            {step === 'more' ? <Btn kind="pri" onClick={sendMore}>{text.trim() ? 'Enviar' : 'Concluir'}</Btn> : where === 'hub' && <Btn kind="sm" onClick={later}>Agora não</Btn>}
          </div>
        </>
      )}
    </section>
  );
}
