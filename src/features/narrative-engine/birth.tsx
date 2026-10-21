'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Character } from '@/features/character-creator/model';
import { Nursery } from '@/components/characters/nursery';
import { Button } from '@/components/ui/button';
export const BIRTH_VERSION = 1;
const paragraphs = [
  'Vila Aurora acordou com cheiro de pão, uma garoa tímida e um acontecimento que ainda não tinha nome.',
  'Na casa de janelas redondas, Lia ajeitou a manta pela terceira vez. “Acho que agora está perfeito.” Nilo olhou para o berço. “Você disse isso nas outras duas.”',
  'Então, um bocejo minúsculo ocupou todo o quarto. Não era preciso entender as palavras. Já havia um lugar ali, entre duas mãos estendidas e uma manhã inteira por descobrir.',
];
export function Birth({
  character,
  onComplete,
  onClose,
  busy,
}: {
  character: Character;
  onComplete: (memory: 'sky' | 'home') => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [memory, setMemory] = useState<'sky' | 'home' | null>(null);
  const [error, setError] = useState('');
  return (
    <section className="birth-page">
      <div className="story-heading">
        <span className="eyebrow">PRÓLOGO · A PRIMEIRA MANHÃ</span>
        <button className="text-button" onClick={onClose}>
          Ler depois
        </button>
      </div>
      <Nursery appearance={character.appearance} />
      <div className="story-paper">
        <div className="chapter-marker">
          <span />
          01
          <span />
        </div>
        <h1>
          O mundo ganhou
          <br />
          um pouco de <em>{character.name}.</em>
        </h1>
        <p className="narrator">{paragraphs[index]}</p>
        {index === 2 && (
          <p className="narrator">
            {character.appearance.species === 'alien'
              ? 'As pequenas antenas se inclinaram na direção da janela. Lá fora, um céu tão diferente de suas origens parecia dizer: pode ficar.'
              : 'A luz atravessou a cortina e encontrou um par de olhos curiosos. Lá fora, o mundo continuava enorme. Aqui dentro, já parecia casa.'}
          </p>
        )}
        {index < 2 ? (
          <Button variant="secondary" onClick={() => setIndex(index + 1)}>
            Continuar
          </Button>
        ) : (
          <>
            <p className="eyebrow">QUAL SERÁ A PRIMEIRA MEMÓRIA?</p>
            <div className="story-choices">
              <button
                className={memory === 'sky' ? 'selected' : ''}
                onClick={() => setMemory('sky')}
              >
                <span>
                  A luz dançando na janela<small>Uma semente de curiosidade.</small>
                </span>
                {memory === 'sky' && <Check size={17} />}
              </button>
              <button
                className={memory === 'home' ? 'selected' : ''}
                onClick={() => setMemory('home')}
              >
                <span>
                  A voz que diz “estamos aqui”<small>Uma semente de acolhimento.</small>
                </span>
                {memory === 'home' && <Check size={17} />}
              </button>
            </div>
            <Button
              disabled={!memory || busy}
              onClick={async () => {
                if (!memory) return;
                try {
                  await onComplete(memory);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
                }
              }}
            >
              {busy ? 'Guardando a memória…' : 'Guardar essa primeira memória'}
            </Button>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </>
        )}
        <p className="small-note">Sua história pode esperar. Seu foco vem primeiro.</p>
      </div>
    </section>
  );
}
