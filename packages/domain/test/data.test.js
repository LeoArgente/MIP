/* fmt: data e hora do registro do acordo, que é hasheado. As saídas esperadas estão escritas aqui, literalmente: são
   as que o fmt dava antes de deixar de usar o toLocaleString (conferidas byte a byte na migração), e comparar com o
   toLocaleString aqui traria de volta a dependência do padrão de data do ICU.
   Os instantes estão em UTC; São Paulo é UTC-3, UTC-2 no horário de verão (até fevereiro de 2019) e, antes de 1914,
   hora local média (-3:06:28). */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt } from '@mip/domain';

const casos = (lista) => { for (const [nome, t, esperado] of lista) test(nome, () => assert.equal(fmt(t), esperado)); };

describe('fmt: texto montado à mão, "dd/mm/aaaa às hh:mm" no fuso de São Paulo', () => {
  describe('virada de ano', () => casos([
    ['último minuto do ano', Date.UTC(2026, 0, 1, 2, 59), '31/12/2025 às 23:59'],
    ['primeiro minuto do ano', Date.UTC(2026, 0, 1, 3, 0), '01/01/2026 às 00:00'],
    ['ano novo em UTC, ainda 31/12 em São Paulo', Date.UTC(2026, 0, 1, 0, 30), '31/12/2025 às 21:30'],
    ['último minuto do ano, em horário de verão', Date.UTC(2019, 0, 1, 1, 59), '31/12/2018 às 23:59'],
    ['primeiro minuto do ano, em horário de verão', Date.UTC(2019, 0, 1, 2, 0), '01/01/2019 às 00:00']
  ]));

  describe('meia-noite e meio-dia', () => casos([
    ['meia-noite é 00:00, não 24:00', Date.UTC(2026, 5, 10, 3, 0), '10/06/2026 às 00:00'],
    ['um minuto antes da meia-noite', Date.UTC(2026, 5, 10, 2, 59), '09/06/2026 às 23:59'],
    ['meio-dia', Date.UTC(2026, 5, 10, 15, 0), '10/06/2026 às 12:00'],
    ['um minuto antes do meio-dia', Date.UTC(2026, 5, 10, 14, 59), '10/06/2026 às 11:59'],
    ['meia-noite em horário de verão', Date.UTC(2019, 0, 15, 2, 0), '15/01/2019 às 00:00'],
    ['meio-dia em horário de verão', Date.UTC(2019, 0, 15, 14, 0), '15/01/2019 às 12:00']
  ]));

  describe('horário de verão antigo do Brasil', () => casos([
    ['início em 2018: o relógio pula de 23:59 para 01:00', Date.UTC(2018, 10, 4, 2, 59), '03/11/2018 às 23:59'],
    ['início em 2018: 00:00 não existe', Date.UTC(2018, 10, 4, 3, 0), '04/11/2018 às 01:00'],
    ['fim em 2019 (o último): 23:59 de verão', Date.UTC(2019, 1, 17, 1, 59), '16/02/2019 às 23:59'],
    ['fim em 2019: 23:00 acontece de novo', Date.UTC(2019, 1, 17, 2, 0), '16/02/2019 às 23:00'],
    ['início em 1985', Date.UTC(1985, 10, 2, 2, 59), '01/11/1985 às 23:59'],
    ['início em 1985: 00:00 não existe', Date.UTC(1985, 10, 2, 3, 0), '02/11/1985 às 01:00'],
    ['verão de 1932 (UTC-2)', Date.UTC(1932, 0, 15, 12, 0), '15/01/1932 às 10:00'],
    ['inverno de 1932 (UTC-3)', Date.UTC(1932, 5, 15, 12, 0), '15/06/1932 às 09:00'],
    ['antes de 1914: hora local média', Date.UTC(1900, 0, 1, 0, 0), '31/12/1899 às 20:53']
  ]));

  describe('formato', () => casos([
    ['dia, mês, hora e minuto com dois dígitos', Date.UTC(2026, 2, 5, 12, 7), '05/03/2026 às 09:07'],
    ['dez em cada campo de dois dígitos', Date.UTC(2010, 9, 10, 13, 10), '10/10/2010 às 10:10'],
    ['ano sem zeros à esquerda', Date.UTC(999, 0, 1), '31/12/998 às 20:53']
  ]));

  describe('entradas', () => casos([
    ['número (ms)', Date.UTC(2026, 9, 27, 15), '27/10/2026 às 12:00'],
    ['texto ISO', '2026-10-27T15:00:00Z', '27/10/2026 às 12:00'],
    ['Date', new Date(Date.UTC(2026, 9, 27, 15)), '27/10/2026 às 12:00'],
    ['NaN', NaN, 'Invalid Date'],
    ['texto que não é data', 'x', 'Invalid Date'],
    ['Date inválida', new Date(NaN), 'Invalid Date']
  ]));
});
