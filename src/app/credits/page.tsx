import Link from 'next/link';
import '@/features/room/room.css';
import manifest from '../../../public/assets/lpc/manifest.json';
export default function Credits() {
  return (
    <main id="main" className="play-main credits-page">
      <Link className="back-link" href="/play">
        Voltar ao quarto
      </Link>
      <h1>
        Quem deu forma
        <br />a este <em>pequeno mundo.</em>
      </h1>
      <p>Menu: fonte Pixelify Sans, dos Pixelify Sans Project Authors, sob SIL Open Font License 1.1. <a href="/fonts/pixelify-sans/OFL.txt">Licença da fonte</a>. Paisagem e avatares do menu são desenhos originais por código.</p>
      <p>
        Personagens usam camadas do Universal LPC. A composição e as recolorações preservam os
        créditos de cada artista.
      </p>
      <p>
        Revisão: <code>{manifest.revision}</code>. Arte selecionada sob CC BY-SA 3.0, OGA-BY 3.0 e
        CC0; adaptações visuais sob CC BY-SA 3.0. Sem endosso dos autores.
      </p>
      {manifest.credits.map((credit, index) => (
        <section className="panel" key={index}>
          <h2>{credit.layer}</h2>
          <p>{credit.authors.join(', ')}</p>
          <p>{credit.selectedLicense}</p>
          {credit.urls.map((url) => (
            <p key={url}>
              <a href={url} target="_blank" rel="noreferrer">
                Fonte original
              </a>
            </p>
          ))}
        </section>
      ))}
      <p>
        <a href="/assets/lpc/CREDITS.txt">Créditos completos</a> ·{' '}
        <a href="/assets/lpc/manifest.json">Catálogo, fontes, licenças e hashes dos PNGs</a> ·{' '}
        <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>
        {' · '}
        <a href="https://opengameart.org/content/oga-by-30-faq">OGA-BY 3.0</a>
      </p>
      <p>
        O quarto demonstrativo é arte original desenhada por código. Nenhum código do gerador GPL
        foi incorporado.
      </p>
    </main>
  );
}
