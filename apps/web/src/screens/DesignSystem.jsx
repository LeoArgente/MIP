import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { AppButton, AppTopbar, AuthField, AuthTabs, Avatar, Button, Checkbox, Chip, Field, FeatureCard, HeroText, IconTile, LinkDash, NavItem, RadioRow, SiteFooter, SiteHeader, SocialButton, Stat, TeamCard } from '../components/ds/index.js';

/* Galeria dos componentes do design system. Só existe em desenvolvimento (rota /_ds). */
const Row = ({ title, children }) => (
  <section style={{ padding: '24px 64px', borderBottom: '1px solid var(--color-border-default)' }}>
    <h2 className="type-v2-eyebrow" style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>{title}</h2>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>{children}</div>
  </section>
);

export default function DesignSystem() {
  const [radio, setRadio] = useState('a');
  const [pwd, setPwd] = useState(false);
  const tile = <ShieldCheck size={24} strokeWidth={1.5} />;
  return (
    <div>
      <SiteHeader />
      <div style={{ height: 160 }} />
      <Row title="Hero interno"><HeroText breadcrumb="Home  /  Sobre a MIP" title="Sobre a MIP" /></Row>
      <Row title="Button v2">
        <Button>Organizar meu projeto</Button><Button variant="fill">Organizar meu projeto</Button><Button variant="ghost">Organizar meu projeto</Button>
      </Row>
      <Row title="Nav Item e Link Dash"><NavItem to="/_ds">Sobre a MIP</NavItem><LinkDash>Ver mais</LinkDash></Row>
      <Row title="Icon Tile e Stat"><IconTile>{tile}</IconTile><Stat icon={<ShieldCheck size={32} strokeWidth={1.5} />} number="4" label="Etapas de atuação" /></Row>
      <Row title="Feature Card e Team Card">
        <FeatureCard icon={tile} title="Mapear" text="A equipe identifica integrantes, ativos, contribuições e evidências relacionadas ao projeto." linkLabel="Ver mais" />
        <TeamCard name="Nome do integrante" role="Função" />
      </Row>
      <Row title="Autenticação">
        <div style={{ width: 420, display: 'grid', gap: 16 }}>
          <AuthTabs active="entrar" />
          <AuthField label="E-mail" type="email" placeholder="voce@exemplo.com" />
          <AuthField label="Senha" type={pwd ? 'text' : 'password'} placeholder="Sua senha" action={pwd ? 'Ocultar' : 'Mostrar'} onAction={() => setPwd(v => !v)} actionPressed={pwd} />
          <Checkbox label="Lembrar de mim" />
          <Checkbox label="Marcado" defaultChecked />
          <div style={{ display: 'flex', gap: 12 }}><SocialButton initial="G" label="Google" /><SocialButton initial="A" label="Apple" /></div>
          <Field placeholder="Nome*" />
        </div>
      </Row>
      <Row title="Chip"><Chip>Respondido</Chip><Chip tone="accent">Respondido</Chip><Chip tone="ok">Respondido</Chip><Chip tone="warn">Respondido</Chip><Chip tone="bad">Respondido</Chip></Row>
      <Row title="App Button e Avatar">
        <AppButton>Continuar</AppButton><AppButton kind="secondary">Continuar</AppButton><AppButton kind="small">Continuar</AppButton><AppButton kind="danger">Continuar</AppButton><Avatar name="Ana Souza" />
      </Row>
      <Row title="Radio Row">
        <div style={{ width: 560, display: 'grid', gap: 16 }}>
          <RadioRow name="r" value="a" label="Criada neste projeto" checked={radio === 'a'} onChange={() => setRadio('a')} />
          <RadioRow name="r" value="b" label="Já existia antes" checked={radio === 'b'} onChange={() => setRadio('b')} />
        </div>
      </Row>
      <Row title="App Topbar"><div style={{ width: '100%' }}><AppTopbar name="Ana Souza" back={{ to: '/_ds', label: 'Nome do projeto' }} /></div></Row>
      <div style={{ height: 96 }} />
      <SiteFooter />
    </div>
  );
}
