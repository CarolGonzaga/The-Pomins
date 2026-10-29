/** Compatibility negotiation only; authentication, ownership and prices remain server-owned. */
export const NEEDS_PROTOCOL_HEADER = 'x-pomins-needs-version';
export const NEEDS_PROTOCOL_VERSION = '2';
export const needsProtocolHeaders = { [NEEDS_PROTOCOL_HEADER]: NEEDS_PROTOCOL_VERSION };
export const needsUpdateMessage =
  'Atualize o aplicativo para continuar os cuidados. Se estiver focando, pause pelos controles antes de recarregar. Nenhum minuto foi cobrado por esta tentativa.';
