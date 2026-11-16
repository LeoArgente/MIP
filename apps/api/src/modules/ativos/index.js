/* Ativos: as criações do projeto (cadastrar, sugerir, aprovar, recusar, excluir) e a liberação das perguntas. */
import { randomUUID } from 'node:crypto';
import { TYPES, sobreErrors, approved, nm, ansOf, validLink } from '@mip/domain';
import { ActionError, fail, needOrg, needPhase, assetOf } from '../shared.js';
import { log } from '../historico/index.js';

function newAsset(p, me, f, st) {
  const ty = TYPES.find(x => x.k === f.type), err = {};
  if (!ty) err.ft = 'Escolha o tipo da criação';
  if (!(f.name || '').trim()) err.fn = 'Informe o nome da criação';
  if ((f.link || '').trim() && !validLink(f.link)) err.fl = 'Informe um link válido, começando com http';
  if (Object.keys(err).length) throw new ActionError(err);
  const a = { id: randomUUID(), name: f.name.trim(), type: ty.k, cat: ty.n, desc: (f.desc || '').trim(), link: (f.link || '').trim(), st };
  if (st === 'sug') a.by = me;
  p.assets.push(a);
  return { a, ty };
}

export const ACTIONS = {
  setupassets(p, me) {
    needOrg(p, me); needPhase(p, 'coleta');
    if (!approved(p).length) fail('_', 'Cadastre pelo menos 1 criação para liberar as perguntas.');
    { const e = sobreErrors(p.sobre); if (Object.keys(e).length) throw new ActionError(e); }
    p.setupStep = 'resp'; log(p, me, 'liberou as perguntas para a equipe');
    return { tab: 'resp', notice: 'Perguntas liberadas para a equipe. Comece pelas suas.' };
  },

  addasset(p, me, d) {
    needOrg(p, me); needPhase(p, 'coleta');
    const { a, ty } = newAsset(p, me, d, 'ok');
    log(p, me, 'cadastrou a criação ' + a.name);
    return { toast: ty.n + ' “' + a.name + '” cadastrado. Ele já entra nas perguntas de todos.' };
  },

  sugasset(p, me, d) {
    if (p.phase !== 'coleta') fail('fn', 'As respostas já foram encerradas');
    const { a } = newAsset(p, me, d, 'sug');
    log(p, me, 'sugeriu a criação ' + a.name);
    return { toast: 'Sugestão enviada para ' + nm(p, p.org) + '.' };
  },

  aprov(p, me, d) { needOrg(p, me); needPhase(p, 'coleta'); const a = assetOf(p, d.aid); a.st = 'ok'; log(p, me, 'aprovou a criação ' + a.name); return {}; },

  recusok(p, me, d) {
    needOrg(p, me); needPhase(p, 'coleta');
    const a = assetOf(p, d.aid); a.st = 'rec'; a.reason = (d.reason || '').trim() || 'Sem motivo informado';
    log(p, me, 'recusou a criação ' + a.name);
    return {};
  },

  /* Sem `confirm`, devolve quantas respostas seriam descartadas para a tela pedir confirmação. */
  del(p, me, d) {
    needOrg(p, me);
    if (p.phase !== 'coleta') fail('d' + d.aid, 'Criações não podem ser excluídas depois que as respostas forem encerradas');
    const a = assetOf(p, d.aid), n = p.members.filter(m => ansOf(p, m.pid, a.id)?.sent).length;
    if (n && !d.confirm) return { confirmDelete: { aid: a.id, n } };
    p.assets = p.assets.filter(x => x.id !== a.id);
    Object.values(p.answers).forEach(o => delete o[a.id]);
    delete p.proposal[a.id];
    log(p, me, 'excluiu a criação ' + a.name + ' e descartou as respostas');
    return { toast: 'Criação excluída e registrada no histórico.' };
  }
};
