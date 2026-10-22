import { expect, it } from 'vitest';
import { authErrorMessage } from '../../src/features/auth/error-message';

it('explains reuse of the current password without suggesting a nickname conflict', () => {
  const message = authErrorMessage('update', { code: 'same_password' });
  expect(message).toContain('diferente da senha atual');
  expect(message).not.toMatch(/apelido|expir/);
});

it('distinguishes password strength from an unavailable recovery session', () => {
  expect(authErrorMessage('update', { code: 'weak_password' })).toContain('senha mais forte');
  expect(authErrorMessage('update', { code: 'session_expired' })).toContain('novo link');
  expect(authErrorMessage('update', { name: 'AuthSessionMissingError' })).toContain('mesmo navegador');
});

it('keeps login errors generic and does not echo unrecognized server content', () => {
  expect(authErrorMessage('login', { code: 'same_password' })).toContain('Confira e-mail');
  expect(authErrorMessage('update', { code: 'private-server-detail' })).not.toContain('private-server-detail');
  expect(authErrorMessage('update', {})).not.toContain('apelido');
});
