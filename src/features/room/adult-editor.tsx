'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HUMAN_SKINS, HAIR_COLORS } from '../character-creator/model';
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
  const colors = (
    label: string,
    key: 'skin' | 'hairColor' | 'eyeColor' | 'clothingColor',
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
            aria-pressed={a[key] === color}
            onClick={() => setA({ ...a, [key]: color })}
          >
            {a[key] === color && <span className="color-selected" aria-hidden="true" />}
          </button>
        ))}
      </div>
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
          <SpritePreview appearance={a} label={`Prévia adulta de ${name || 'seu Pomin'}`} />
          <h2>{name || 'Uma vida por descobrir'}</h2>
          <p>Base adulta LPC · corpo-base A</p>
          <small>A base visual não define gênero ou personalidade.</small>
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
          {colors('Tom de pele', 'skin', HUMAN_SKINS)}
          <fieldset>
            <legend>Penteado</legend>
            <div className="choice-row">
              {(
                [
                  ['plain', 'Curto'],
                  ['afro', 'Afro'],
                  ['bob', 'Chanel'],
                  ['none', 'Sem cabelo'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={a.hairStyle === id}
                  className={a.hairStyle === id ? 'selected' : ''}
                  onClick={() => setA({ ...a, hairStyle: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {colors('Cor do cabelo', 'hairColor', HAIR_COLORS)}
          {colors('Cor dos olhos', 'eyeColor', [
            '#628472',
            '#7897b3',
            '#544532',
            '#89709e',
            '#303139',
          ])}
          <label>
            Roupa
            <select
              value={a.clothing}
              onChange={(e) =>
                setA({ ...a, clothing: e.target.value as AdultAppearance['clothing'] })
              }
            >
              <option value="longsleeve">Camisa de manga longa</option>
              <option value="shortsleeve">Camisa de manga curta</option>
            </select>
          </label>
          {colors('Cor da roupa', 'clothingColor', [
            '#8975aa',
            '#91a57f',
            '#c48d90',
            '#d0ae6e',
            '#769cb4',
            '#765c50',
          ])}
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
