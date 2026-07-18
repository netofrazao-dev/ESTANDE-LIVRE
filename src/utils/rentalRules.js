// Regras de negócio de prazos e multas — usadas no Painel do Leitor e no Admin.

export const DAILY_LATE_FEE = 2.0; // R$ por dia de atraso
export const NEAR_DUE_THRESHOLD_DAYS = 3; // a partir de quantos dias restantes avisamos o leitor

export const DAMAGE_OPTIONS = [
  { value: 'none', label: 'Sem danos', fee: 0 },
  { value: 'minor_damage', label: 'Pequena avaria', fee: 15.0 },
  { value: 'destroyed', label: 'Inutilizado', fee: 80.0 },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Dias entre hoje e a data de devolução. Negativo = dias em atraso. */
export function daysUntilDue(dueDate) {
  const today = startOfDay(new Date());
  const due = startOfDay(`${dueDate}T00:00:00`);
  const diffMs = due.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function isRentalOverdue(dueDate) {
  return daysUntilDue(dueDate) < 0;
}

/** true quando faltam poucos dias (e ainda não venceu) — dispara o alerta amarelo/terracota. */
export function isDueSoon(dueDate) {
  const diff = daysUntilDue(dueDate);
  return diff >= 0 && diff <= NEAR_DUE_THRESHOLD_DAYS;
}

/** Multa estimada por atraso, com base em DAILY_LATE_FEE. Retorna 0 se não está atrasado. */
export function calculateLateFee(dueDate, dailyFee = DAILY_LATE_FEE) {
  const diff = daysUntilDue(dueDate);
  if (diff >= 0) return 0;
  const daysLate = Math.abs(diff);
  return Number((daysLate * dailyFee).toFixed(2));
}

export function damageFeeFor(condition) {
  return DAMAGE_OPTIONS.find((opt) => opt.value === condition)?.fee ?? 0;
}

export function formatCurrency(value) {
  return `R$ ${Number(value ?? 0).toFixed(2).replace('.', ',')}`;
}
