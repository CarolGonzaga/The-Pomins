export function authErrorMessage(mode: string, error: { code?: string; name?: string }) {
  if (mode === 'update') {
    if (error.code === 'same_password')
      return 'A nova senha precisa ser diferente da senha atual. Escolha outra senha e tente novamente.';
    if (error.code === 'weak_password')
      return 'Essa senha não atende aos requisitos de segurança. Escolha uma senha mais forte.';
    if (
      ['session_expired', 'session_not_found', 'otp_expired'].includes(error.code ?? '') ||
      error.name === 'AuthSessionMissingError'
    )
      return 'Sua sessão de recuperação não está disponível. Solicite um novo link e abra no mesmo navegador.';
    return 'Não foi possível alterar a senha. Tente novamente; se persistir, solicite um novo link de recuperação.';
  }
  return mode === 'login'
    ? 'Não foi possível entrar. Confira e-mail, senha e confirmação do e-mail.'
    : 'Não foi possível concluir. O apelido pode estar em uso ou o link pode ter expirado. Tente novamente.';
}
