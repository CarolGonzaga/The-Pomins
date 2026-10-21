# Produção de assets

Fontes vetoriais: `components/characters/pomin.tsx`, `nursery.tsx` e `public/icons/icon.svg`. PNGs da PWA são gerados por `node scripts/icons.mjs` usando sharp incluído na cadeia do Next. Não é utilizado Python.

Para trocar o personagem, preserve o contrato `Appearance`, viewBox e pontos de alinhamento. Para um novo cabelo, acrescente um grupo na camada de cabelo, com cores herdadas dos atributos; não rasterize todas as combinações. Mantenha combinações inclusivas e testáveis. Novas proporções devem ter âncoras específicas por fase.

Para um cenário, crie SVG otimizado com dimensões estáveis e sem scripts/URLs externos, documente autoria e use `aria-hidden` quando puramente decorativo. O container pode ter rótulo descritivo. No futuro, arquivos maiores devem ir em `public/assets/backgrounds` e ser carregados apenas no capítulo correspondente.

Ícones PWA: 192/512, maskable com margem segura e apple-touch de 180. Ao alterar a marca execute o script e mude a versão do cache do service worker para distribuir novos assets. Não remova as versões antigas de conteúdo narrativo em uso.
