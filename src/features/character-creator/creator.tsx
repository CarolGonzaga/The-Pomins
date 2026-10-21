'use client';
import { useState } from 'react';
import { ArrowLeft, Check, Shuffle } from 'lucide-react';
import { Pomin } from '@/components/characters/pomin';
import { Button } from '@/components/ui/button';
import {
  ALIEN_SKINS,
  HUMAN_SKINS,
  HAIR_COLORS,
  defaultAppearance,
  characterSchema,
  type CharacterDraft,
  type Appearance,
} from './model';
export function Creator({
  onSave,
  onBack,
  busy,
}: {
  onSave: (draft: CharacterDraft) => Promise<void>;
  onBack: () => void;
  busy: boolean;
}) {
  const [a, setA] = useState<Appearance>(defaultAppearance);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState('origem');
  const set = <K extends keyof Appearance>(key: K, value: Appearance[K]) =>
    setA((prev) => ({ ...prev, [key]: value }));
  const palette = (
    label: string,
    colors: string[],
    field: 'skin' | 'hairColor' | 'outfit' | 'eyeColor',
  ) => (
    <fieldset>
      <legend>{label}</legend>
      <div className="swatches">
        {colors.map((color) => (
          <button
            key={color}
            aria-label={`${label} ${color}`}
            aria-pressed={a[field] === color}
            style={{ backgroundColor: color }}
            onClick={() => set(field, color)}
          >
            {a[field] === color && <Check size={17} />}
          </button>
        ))}
      </div>
    </fieldset>
  );
  async function save() {
    const parsed = characterSchema.safeParse({ name, appearance: a });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    try {
      await onSave(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  }
  return (
    <section className="creator-page">
      <button onClick={onBack} className="back-link">
        <ArrowLeft size={17} /> Voltar para o início
      </button>
      <div className="section-intro">
        <span className="eyebrow">CRIE · CAPÍTULO ZERO</span>
        <h1>
          Toda história começa
          <br />
          com <em>alguém único.</em>
        </h1>
        <p>Conheça seu Pomin. O resto, vocês descobrem juntos.</p>
      </div>
      <div className="creator-grid">
        <div className="character-preview">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />

          <Pomin appearance={a} label={`Prévia de ${name || 'seu bebê'}`} />
          <div className="preview-plaque">
            <span className="eyebrow">OLÁ, MUNDO.</span>
            <h2>{name || 'Seu pequeno Pomin'}</h2>
            <span>{a.species === 'human' ? 'Humano' : 'Alienígena'} · Recém-nascido</span>
          </div>
          <button
            className="random-button"
            onClick={() => {
              const colors = a.species === 'human' ? HUMAN_SKINS : ALIEN_SKINS;
              setA({
                ...a,
                skin: colors[Math.floor(Math.random() * colors.length)],
                hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
                hair: (['tuft', 'curly', 'swept', 'none'] as const)[Math.floor(Math.random() * 4)],
              });
            }}
          >
            <Shuffle size={16} /> Me surpreenda
          </button>
        </div>
        <div className="creator-options">
          <div className="tabs" role="tablist" aria-label="Personalização">
            {[
              ['origem', 'Origem'],
              ['rosto', 'Rosto'],
              ['estilo', 'Estilo'],
            ].map(([id, label]) => (
              <button role="tab" aria-selected={tab === id} key={id} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'origem' && (
            <div className="options-panel" role="tabpanel">
              <h2>De onde vem sua história?</h2>
              <p className="muted">Dois jeitos de ser. Um universo de possibilidades.</p>
              <div className="species-options">
                {(['human', 'alien'] as const).map((species) => (
                  <button
                    key={species}
                    aria-label={species === 'human' ? 'Humano' : 'Alienígena'}
                    className={a.species === species ? 'selected' : ''}
                    aria-pressed={a.species === species}
                    onClick={() =>
                      setA({
                        ...a,
                        species,
                        skin: species === 'human' ? HUMAN_SKINS[2] : ALIEN_SKINS[0],
                      })
                    }
                  >
                    <Pomin
                      appearance={{
                        ...a,
                        species,
                        skin: species === 'human' ? HUMAN_SKINS[2] : ALIEN_SKINS[0],
                      }}
                    />
                    {species === 'human' ? 'Humano' : 'Alienígena'}
                    {a.species === species && <Check size={15} />}
                  </button>
                ))}
              </div>
              {palette('Tom de pele', a.species === 'human' ? HUMAN_SKINS : ALIEN_SKINS, 'skin')}
              <label>
                Nome do seu Pomin
                <input
                  value={name}
                  maxLength={32}
                  placeholder="Como vamos chamar essa nova vida?"
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <p className="small-note">
                Aparência não define identidade ou personalidade. Há tempo para se descobrir.
              </p>
              <Button variant="secondary" onClick={() => setTab('rosto')}>
                Personalizar o rosto
              </Button>
            </div>
          )}
          {tab === 'rosto' && (
            <div className="options-panel" role="tabpanel">
              <h2>Pequenos detalhes, muito você.</h2>
              <fieldset>
                <legend>Olhar</legend>
                <div className="choice-row">
                  {(
                    [
                      ['round', 'Curioso'],
                      ['sleepy', 'Sonolento'],
                      ['sparkle', 'Brilhante'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      aria-pressed={a.eyes === id}
                      className={a.eyes === id ? 'selected' : ''}
                      onClick={() => set('eyes', id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {palette(
                'Cor dos olhos',
                ['#544532', '#628472', '#7897b3', '#89709e', '#2f303c'],
                'eyeColor',
              )}
              <fieldset>
                <legend>Cabelo</legend>
                <div className="choice-row">
                  {(
                    [
                      ['tuft', 'Topete'],
                      ['curly', 'Cachos'],
                      ['swept', 'De lado'],
                      ['none', 'Sem cabelo'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      className={a.hair === id ? 'selected' : ''}
                      aria-pressed={a.hair === id}
                      onClick={() => set('hair', id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              {palette('Cor do cabelo', HAIR_COLORS, 'hairColor')}
              {a.species === 'alien' && (
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={a.antennas}
                    onChange={(e) => set('antennas', e.target.checked)}
                  />{' '}
                  Antenas
                </label>
              )}
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={a.marks}
                  onChange={(e) => set('marks', e.target.checked)}
                />{' '}
                Marquinhas no rosto
              </label>
              <Button variant="secondary" onClick={() => setTab('estilo')}>
                Escolher o primeiro look
              </Button>
            </div>
          )}
          {tab === 'estilo' && (
            <div className="options-panel" role="tabpanel">
              <h2>Um abraço em forma de roupa.</h2>
              {palette(
                'Cor da mantinha',
                ['#b7b0d4', '#b3c6ac', '#e3acb9', '#e8cb8d', '#aac6d8', '#c2aba0'],
                'outfit',
              )}
              <fieldset>
                <legend>Um detalhe especial</legend>
                <div className="choice-row">
                  {(
                    [
                      ['none', 'Só eu'],
                      ['bow', 'Lacinho'],
                      ['star', 'Estrelinha'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      className={a.accessory === id ? 'selected' : ''}
                      aria-pressed={a.accessory === id}
                      onClick={() => set('accessory', id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label>
                Nome do seu Pomin
                <input
                  value={name}
                  maxLength={32}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Um nome para essa história"
                />
              </label>
              <p className="cozy-note">
                Uma manta macia, um nome escolhido com carinho e um mundo inteiro pela frente.
              </p>
            </div>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="creator-footer">
            <span>Pronto para o primeiro capítulo?</span>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Preparando a chegada…' : 'Dar boas-vindas ao mundo'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
