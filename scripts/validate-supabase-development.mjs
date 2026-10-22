// Opt-in remote checks. Uses normal Auth identities, never privileged database access.
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

for (const path of ['.env.local', '.env.supabase-test.local'])
  if (existsSync(path)) loadEnvFile(path);

const check = (condition, label) => {
  if (!condition) throw new Error(label);
};
const ok = (result, label) => {
  check(!result.error, label);
  return result.data;
};
const clients = [];
const passed = [];
const pass = (label) => {
  passed.push(label);
  console.log(`APROVADO: ${label}`);
};
const state = async (client) => ok(await client.rpc('room_state'), 'Falha ao ler o quarto');
const command = (client, action, payload) =>
  client.rpc('room_command', { p_action: action, p_payload: payload });
const free = (credit) => credit.eligible_minutes - credit.allocated_minutes;
const balance = (room) => room.credits.reduce((sum, credit) => sum + free(credit), 0);
// Only compare game state; never serialize Auth sessions, tokens, passwords or task text.
const snapshot = (room) =>
  JSON.stringify({
    revision: room.revision,
    residents: room.residents,
    credits: room.credits,
    allocations: room.allocations,
    historical_ms: room.historical_ms,
  });

async function login(url, key, email, password, label) {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
  clients.push(client);
  const result = await client.auth.signInWithPassword({ email, password });
  check(!result.error && result.data.user, `Não foi possível autenticar a conta ${label}`);
  return { client, userId: result.data.user.id };
}

async function validateFocus(a, b, url, key, env) {
  const before = await state(b.client);
  check(before.residents.length, 'B precisa ter um adulto antes do teste de foco');
  const open = ok(
    await b.client
      .from('focus_sessions')
      .select('id')
      .in('status', ['active', 'paused', 'interrupted']),
    'Falha ao conferir sessões de B',
  );
  check(!open.length, 'B já tem uma sessão aberta; não será substituída');
  const b2 = await login(
    url,
    key,
    env.POMINS_TEST_B_EMAIL,
    env.POMINS_TEST_B_PASSWORD,
    'B (outra conexão)',
  );
  const id = randomUUID();
  const clientOne = randomUUID();
  const clientTwo = randomUUID();
  const focus = (connection, action, clientId, sequence) =>
    connection
      .rpc('focus_command', {
        p_action: action,
        p_id: id,
        p_client: clientId,
        p_sequence: sequence,
      })
      .single();
  let started = false;
  try {
    const args = {
      p_id: id,
      p_client: clientOne,
      p_character: before.residents[0].id,
      p_seconds: 120,
      p_task: '',
      p_step: '',
    };
    const session = ok(
      await b.client.rpc('start_resident_focus', args).single(),
      'Início do foco de B falhou',
    );
    started = true;
    const repeat = ok(
      await b.client.rpc('start_resident_focus', args).single(),
      'Repetição do início falhou',
    );
    const rows = ok(
      await b.client.from('focus_sessions').select('id').eq('id', id),
      'Falha ao conferir início repetido',
    );
    check(
      rows.length === 1 && repeat.id === session.id && session.validated_ms === 0,
      'Início repetido duplicou sessão ou tempo',
    );
    const paused = ok(await focus(b.client, 'pause', clientOne, 1), 'Pausa de B falhou');
    const resumed = ok(await focus(b.client, 'resume', clientOne, 2), 'Retomada de B falhou');
    check(
      paused.status === 'paused' && resumed.status === 'active' && resumed.validated_ms === 0,
      'Pausa/retomada gerou tempo indevido',
    );
    pass('Início idempotente, pausa e retomada reais sem crédito artificial');

    const foreign = await focus(a.client, 'recover', randomUUID(), 0);
    check(foreign.error, 'A recuperou uma sessão pertencente a B');
    const recovered = ok(
      await focus(b2.client, 'recover', clientTwo, 0),
      'Recuperação por outra conexão de B falhou',
    );
    const stale = await focus(b.client, 'heartbeat', clientOne, recovered.sequence + 1);
    check(
      stale.error?.message === 'Session belongs to another tab. Recover first.',
      'Conexão anterior não perdeu a posse da sessão',
    );
    const active = ok(
      await focus(b2.client, 'resume', clientTwo, recovered.sequence + 1),
      'Retomada pela nova conexão falhou',
    );
    check(
      active.status === 'active' && active.validated_ms === 0,
      'Recuperação alterou tempo confirmado',
    );
    pass('Sessão isolada entre usuários e posse transferida entre conexões de B');

    // Real wall time: model a client without heartbeats, without altering remote timestamps.
    await new Promise((resolve) => setTimeout(resolve, 8500));
    const interrupted = ok(
      await focus(b2.client, 'heartbeat', clientTwo, active.sequence + 1),
      'Confirmação após lacuna falhou',
    );
    check(
      interrupted.status === 'interrupted' && interrupted.validated_ms === 0,
      'Lacuna acima do limite recebeu crédito',
    );
    const premature = await focus(b2.client, 'complete', clientTwo, interrupted.sequence + 1);
    check(
      premature.error?.message === 'Insufficient confirmed time',
      'Conclusão sem tempo confirmado foi aceita',
    );
    const cancelled = ok(
      await focus(b2.client, 'cancel', clientTwo, interrupted.sequence + 1),
      'Encerramento da sessão de teste falhou',
    );
    check(
      cancelled.status === 'cancelled' && cancelled.validated_ms === 0,
      'Encerramento alterou tempo',
    );
    const credit = ok(
      await b.client.from('focus_credits').select('session_id').eq('session_id', id),
      'Falha ao conferir ausência de crédito',
    );
    const reward = ok(
      await b.client.from('focus_rewards').select('session_id').eq('session_id', id),
      'Falha ao conferir ausência de recompensa',
    );
    check(
      !credit.length && !reward.length && snapshot(await state(b.client)) === snapshot(before),
      'Sessão interrompida/encerrada gerou progresso ou recompensa',
    );
    pass('Lacuna real interrompe, conclusão precoce é rejeitada e encerramento não gera crédito');
    console.log(
      JSON.stringify({
        focus_remote_checks_passed: 3,
        test_session_status: 'cancelled',
        credited_minutes: 0,
      }),
    );
  } finally {
    if (started) {
      const current = await b.client.from('focus_sessions').select('status').eq('id', id).single();
      if (!current.error && !['cancelled', 'completed', 'expired'].includes(current.data.status)) {
        const rec = await focus(b.client, 'recover', clientOne, 0);
        if (!rec.error) {
          const cleanup = await focus(b.client, 'cancel', clientOne, rec.data.sequence + 1);
          check(
            !cleanup.error,
            'Não foi possível encerrar a sessão criada pelo teste; confira B antes de repetir',
          );
        } else
          throw new Error(
            'Não foi possível recuperar a sessão criada pelo teste; confira B antes de repetir',
          );
      }
    }
  }
}

try {
  const env = process.env;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  check(
    env.POMINS_REMOTE_TESTS === 'development-only',
    'Pendente: habilite explicitamente os testes de desenvolvimento no arquivo local',
  );
  check(
    url && key && env.POMINS_TEST_PROJECT_URL === url,
    'Pendente: confirme no arquivo de teste a URL do projeto de desenvolvimento',
  );
  check(!key.startsWith('sb_secret_'), 'Chave privilegiada proibida');
  if (!key.startsWith('sb_publishable_')) {
    let role;
    try {
      role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role;
    } catch {}
    check(role === 'anon', 'Somente chave publishable ou anon é aceita');
  }
  for (const name of [
    'POMINS_TEST_A_EMAIL',
    'POMINS_TEST_A_PASSWORD',
    'POMINS_TEST_B_EMAIL',
    'POMINS_TEST_B_PASSWORD',
  ])
    check(
      env[name],
      'Pendente: preencha as duas contas de teste somente no arquivo local ignorado',
    );

  const a = await login(url, key, env.POMINS_TEST_A_EMAIL, env.POMINS_TEST_A_PASSWORD, 'A');
  const b = await login(url, key, env.POMINS_TEST_B_EMAIL, env.POMINS_TEST_B_PASSWORD, 'B');
  check(a.userId !== b.userId, 'As contas precisam ser diferentes');
  pass('Login real de duas contas distintas');

  if (process.argv.includes('--focus-only')) {
    await validateFocus(a, b, url, key, env);
  } else {
    const open = ok(
      await a.client
        .from('focus_sessions')
        .select('id')
        .in('status', ['active', 'paused', 'interrupted']),
      'Falha ao conferir sessões abertas',
    );
    check(open.length === 0, 'Conclua ou encerre a sessão aberta da conta A antes do teste');
    let roomA = await state(a.client);
    let roomB = await state(b.client);
    const residentA = roomA.residents[0];
    check(residentA, 'A conta A precisa ter um adulto');
    const lastMinute = roomA.credits.find((credit) => free(credit) === 1);
    check(
      lastMinute,
      'A conta A precisa ter uma sessão concluída com exatamente 1 minuto livre para testar a disputa',
    );
    const requests = ok(
      await a.client.from('allocation_requests').select('payload').limit(1),
      'Falha ao ler pedido próprio',
    );
    check(
      requests.length === 1,
      'A conta A precisa ter uma distribuição anterior para testar repetição',
    );

    if (!roomB.residents.length) {
      roomB = ok(
        await command(b.client, 'create', {
          name: 'Bento Teste',
          appearance: {
            body: 'male',
            skin: '#d8a17d',
            hairStyle: 'plain',
            hairColor: '#49352e',
            eyeColor: '#628472',
            clothing: 'longsleeve',
            clothingColor: '#8975aa',
          },
        }),
        'Falha ao criar adulto da conta B',
      );
    }
    const residentB = roomB.residents[0];
    check(
      !roomB.residents.some((resident) => resident.id === residentA.id),
      'Quarto B contém morador de A',
    );
    check(
      !roomA.residents.some((resident) => resident.id === residentB.id),
      'Quarto A contém morador de B',
    );

    for (const [outsider, owner, room, resident] of [
      [b, a, roomA, residentA],
      [a, b, roomB, residentB],
    ]) {
      for (const [table, column, value] of [
        ['characters', 'id', resident.id],
        ['profiles', 'id', owner.userId],
        ['wallets', 'user_id', owner.userId],
        ['focus_sessions', 'user_id', owner.userId],
        ['focus_credits', 'user_id', owner.userId],
        ['focus_allocations', 'user_id', owner.userId],
        ['allocation_requests', 'user_id', owner.userId],
        ['households', 'id', room.household.id],
      ]) {
        const rows = ok(
          await outsider.client.from(table).select('*').eq(column, value),
          `Falha ao testar leitura cruzada em ${table}`,
        );
        check(rows.length === 0, `Leitura cruzada permitida em ${table}`);
      }
      const denied = await command(outsider.client, 'activity', {
        characterId: resident.id,
        activity: 'sleep',
      });
      check(denied.error, 'RPC permitiu alterar personagem de outra conta');
    }
    check(snapshot(await state(a.client)) === snapshot(roomA), 'Tentativa cruzada alterou A');
    check(snapshot(await state(b.client)) === snapshot(roomB), 'Tentativa cruzada alterou B');
    pass('RLS de leitura e RPC de atividade isoladas nos dois sentidos');

    const foreignCredit = await command(b.client, 'allocate', {
      requestId: randomUUID(),
      lines: [
        {
          sessionId: lastMinute.session_id,
          characterId: residentB.id,
          activity: 'study',
          minutes: 1,
        },
      ],
    });
    check(foreignCredit.error, 'B conseguiu consumir crédito de A');
    check(
      snapshot(await state(b.client)) === snapshot(roomB),
      'Tentativa de crédito cruzado alterou B',
    );
    check(
      snapshot(await state(a.client)) === snapshot(roomA),
      'Tentativa de crédito cruzado alterou A',
    );
    pass('Crédito de A não pode ser gasto por B');

    ok(
      await command(a.client, 'allocate', requests[0].payload),
      'Repetição do pedido original falhou',
    );
    check(
      snapshot(await state(a.client)) === snapshot(roomA),
      'Repetição duplicou ou alterou o progresso',
    );
    pass('Repetição exata de distribuição sem crédito ou consumo duplicado');

    const beforeCredits = ok(
      await a.client.from('focus_credits').select('session_id,eligible_minutes,allocated_minutes'),
      'Falha ao conferir créditos',
    );
    const beforeRewards = ok(
      await a.client.from('focus_rewards').select('session_id,account_xp,coins,energy'),
      'Falha ao conferir recompensas',
    );
    const readBalances = async () => ({
      profile: ok(
        await a.client.from('profiles').select('account_xp').eq('id', a.userId).single(),
        'Falha ao conferir XP da conta',
      ),
      wallet: ok(
        await a.client.from('wallets').select('coins,energy').eq('user_id', a.userId).single(),
        'Falha ao conferir carteira',
      ),
    });
    const beforeBalances = await readBalances();
    // Send the existing values: if a permission is unexpectedly broad, do not change XP/saldo.
    const directWrites = await Promise.all([
      a.client
        .from('profiles')
        .update({ account_xp: beforeBalances.profile.account_xp })
        .eq('id', a.userId)
        .select('id'),
      a.client
        .from('wallets')
        .update(beforeBalances.wallet)
        .eq('user_id', a.userId)
        .select('user_id'),
      a.client
        .from('characters')
        .update({ skills: residentA.skills })
        .eq('id', residentA.id)
        .select('id'),
    ]);
    check(
      directWrites.every((result) => result.error || result.data?.length === 0),
      'Escrita direta em XP, carteira ou atributos foi permitida',
    );
    pass('Escrita direta em XP, carteira e atributos bloqueada');
    ok(
      await a.client
        .rpc('focus_command', {
          p_action: 'complete',
          p_id: lastMinute.session_id,
          p_client: randomUUID(),
          p_sequence: 0,
        })
        .single(),
      'Repetição da conclusão falhou',
    );
    const afterCredits = ok(
      await a.client.from('focus_credits').select('session_id,eligible_minutes,allocated_minutes'),
      'Falha ao reconferir créditos',
    );
    const afterRewards = ok(
      await a.client.from('focus_rewards').select('session_id,account_xp,coins,energy'),
      'Falha ao reconferir recompensas',
    );
    const ordered = (rows) =>
      JSON.stringify(rows.sort((x, y) => x.session_id.localeCompare(y.session_id)));
    check(
      ordered(beforeCredits) === ordered(afterCredits) &&
        ordered(beforeRewards) === ordered(afterRewards) &&
        JSON.stringify(beforeBalances) === JSON.stringify(await readBalances()),
      'Conclusão repetida modificou créditos ou recompensas',
    );
    pass('Conclusão repetida não gera novo crédito ou recompensa');

    const rollbackId = randomUUID();
    const line = {
      sessionId: lastMinute.session_id,
      characterId: residentA.id,
      activity: 'study',
      minutes: 1,
    };
    const failed = await command(a.client, 'allocate', {
      requestId: rollbackId,
      lines: [line, line],
    });
    check(
      failed.error?.message === 'Insufficient minutes',
      'Pedido acima do saldo não falhou como esperado',
    );
    check(
      snapshot(await state(a.client)) === snapshot(roomA),
      'Erro transacional deixou alterações parciais',
    );
    const rolledBack = ok(
      await a.client.from('allocation_requests').select('id').eq('id', rollbackId),
      'Falha ao conferir rollback do pedido',
    );
    check(rolledBack.length === 0, 'Pedido inválido persistiu após rollback');
    pass('Falha na segunda linha desfaz primeira linha, pedido e progresso');

    const a2 = await login(
      url,
      key,
      env.POMINS_TEST_A_EMAIL,
      env.POMINS_TEST_A_PASSWORD,
      'A (conexão independente)',
    );
    const race = await Promise.all([
      command(a.client, 'allocate', { requestId: randomUUID(), lines: [line] }),
      command(a2.client, 'allocate', { requestId: randomUUID(), lines: [line] }),
    ]);
    check(
      race.filter((result) => !result.error).length === 1,
      'A disputa não produziu exatamente um vencedor',
    );
    check(
      race.filter((result) => result.error?.message === 'Insufficient minutes').length === 1,
      'A disputa não rejeitou o segundo consumo',
    );
    const finalA = await state(a.client);
    check(balance(finalA) === balance(roomA) - 1, 'A disputa consumiu saldo incorreto');
    check(
      finalA.credits.every((credit) => free(credit) >= 0),
      'Saldo negativo após a disputa',
    );
    check(
      finalA.allocations.length === roomA.allocations.length + 1,
      'Quantidade incorreta de distribuições na disputa',
    );
    check(
      finalA.residents.find((resident) => resident.id === residentA.id).progress_minutes ===
        residentA.progress_minutes + 1,
      'Progresso duplicado ou perdido na disputa',
    );
    check(snapshot(await state(b.client)) === snapshot(roomB), 'A disputa alterou a conta B');
    roomA = finalA;
    pass('Duas conexões disputam o último minuto: só um pedido consome saldo');
    console.log(
      JSON.stringify({
        remote_checks_passed: passed.length,
        available_minutes_A: balance(roomA),
        allocated_minutes_A: roomA.credits.reduce(
          (sum, credit) => sum + credit.allocated_minutes,
          0,
        ),
        account_B_unchanged_after_creation: true,
      }),
    );
  }
} catch (error) {
  // Never print SDK errors, response bodies or credentials.
  console.error(
    error instanceof Error && !('status' in error)
      ? error.message
      : 'Falha inesperada no teste remoto; resultado não aprovado',
  );
  process.exitCode = 1;
} finally {
  await Promise.allSettled(clients.map((client) => client.auth.signOut({ scope: 'local' })));
}
