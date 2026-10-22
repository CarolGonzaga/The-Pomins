'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  hairOptions,
  clothingOptions,
  visualPalettes,
  type VisualClip,
} from '../character-visuals/catalog';
import { customizeAppearance, resolveAppearance } from '../character-visuals/model';
import { defaultAdultAppearance, type AdultAppearance, adultAppearanceSchema } from './domain';
import { SpritePreview } from './sprite-preview';
export function AdultEditor({
  initial,
  name: initialName = '',
  busy,
  onSave,
  onClose,
}: {
  initial?: AdultAppearance;
  name?: string;
  busy: boolean;
  onSave: (name: string, appearance: AdultAppearance) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [a, setA] = useState(initial ?? defaultAdultAppearance);
  const [error, setError] = useState('');
  const [pose, setPose] = useState<VisualClip>('idle');
  const [direction, setDirection] = useState(2);
  const selected = resolveAppearance(a);
  const changeColor = (
    key: 'skin' | 'hairColor' | 'eyeColor' | 'clothingColor' | 'pantsColor',
    color: string,
  ) =>
    setA((current) =>
      key === 'pantsColor'
        ? customizeAppearance(current, { pantsColor: color })
        : { ...current, [key]: color },
    );
  const colors = (
    label: string,
    key: 'skin' | 'hairColor' | 'eyeColor' | 'clothingColor' | 'pantsColor',
    values: string[],
  ) => (
    <fieldset>
      <legend>{label}</legend>
      <div className="swatches">
        {values.map((color) => (
          <button
            key={color}
            style={{ backgroundColor: color }}
            aria-label={`${label} ${color}`}
            aria-pressed={selected[key] === color}
            onClick={() => changeColor(key, color)}
          >
            {selected[key] === color && <span className="color-selected" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <label className="custom-color">
        Outra cor
        <input
          type="color"
          aria-label={`${label} personalizado`}
          value={selected[key]}
          onChange={(event) => changeColor(key, event.target.value)}
        />
        <span>{selected[key]}</span>
      </label>
    </fieldset>
  );
  return (
    <section className="adult-editor">
      <div className="room-section-heading">
        <div>
          <span className="eyebrow">CRIE · PERSONAGEM ADULTO</span>
          <h1>{initial ? 'Um novo jeito de se apresentar.' : 'Quem vai morar por aqui?'}</h1>
        </div>
        <button className="text-button" onClick={onClose}>
          Voltar ao quarto
        </button>
      </div>
      <div className="adult-editor-grid">
        <div className="adult-preview">
          <SpritePreview
            appearance={a}
            clip={pose}
            direction={direction}
            animated={pose === 'walk'}
            label={`Prévia adulta de ${name || 'seu Pomin'}`}
          />
          <h2>{name || 'Uma vida por descobrir'}</h2>
          <p>Base adulta LPC · corpo-base A</p>
          <small>A base visual não define gênero ou personalidade.</small>
          <fieldset className="preview-poses">
            <legend>Conferir aparência</legend>
            <div className="choice-row">
              {(
                [
                  ['idle', 'Em pé'],
                  ['walk', 'Caminhar'],
                  ['sit', 'Sentar'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} aria-pressed={pose === id} onClick={() => setPose(id)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            Direção da prévia
            <select
              value={direction}
              onChange={(event) => setDirection(Number(event.target.value))}
            >
              <option value={2}>Frente</option>
              <option value={0}>Costas</option>
              <option value={1}>Esquerda</option>
              <option value={3}>Direita</option>
            </select>
          </label>
          <small>A mesma composição acompanha todas as poses.</small>
        </div>
        <div className="panel">
          <label>
            Nome do Pomin
            <input
              value={name}
              maxLength={32}
              disabled={!!initial}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como vamos chamar essa história?"
            />
          </label>
          {colors('Tom de pele', 'skin', visualPalettes.skin)}
          <fieldset>
            <legend>Penteado</legend>
            <div className="choice-row">
              {hairOptions.map(({ id, label }) => (
                <button
                  key={id}
                  aria-pressed={selected.hair === id}
                  className={selected.hair === id ? 'selected' : ''}
                  onClick={() => setA(customizeAppearance(a, { hair: id }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {colors('Cor do cabelo', 'hairColor', visualPalettes.hairColor)}
          {colors('Cor dos olhos', 'eyeColor', visualPalettes.eyeColor)}
          <label>
            Roupa
            <select
              value={selected.top}
              onChange={(e) =>
                setA(customizeAppearance(a, { top: e.target.value as typeof selected.top }))
              }
            >
              {clothingOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {colors('Cor da roupa', 'clothingColor', visualPalettes.clothingColor)}
          {colors('Cor da calça', 'pantsColor', visualPalettes.pantsColor)}
          <p className="small-note">
            As opções alteram as camadas reais do personagem. Outras bases e fases de vida serão
            adicionadas ao catálogo.
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <Button
            disabled={busy}
            onClick={async () => {
              try {
                setError('');
                if (name.trim().length < 2)
                  throw Error('Escolha um nome com pelo menos duas letras.');
                await onSave(name.trim(), adultAppearanceSchema.parse(a));
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
              }
            }}
          >
            {busy ? 'Salvando…' : initial ? 'Salvar aparência' : 'Entrar no meu quarto'}
          </Button>
        </div>
      </div>
    </section>
  );
}
