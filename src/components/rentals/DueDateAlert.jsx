import { daysUntilDue, isRentalOverdue, isDueSoon, calculateLateFee, formatCurrency } from '../../utils/rentalRules';

/**
 * DueDateAlert — alerta elegante para o Painel do Leitor.
 *  - Atrasado: fundo terracota escuro, mostra multa estimada.
 *  - Vence em breve (≤ 3 dias): fundo terracota suave, "Faltam X dias".
 *  - Dentro do prazo: nada é renderizado (mantém a UI limpa).
 */
export default function DueDateAlert({ dueDate }) {
  const overdue = isRentalOverdue(dueDate);
  const dueSoon = isDueSoon(dueDate);

  if (!overdue && !dueSoon) return null;

  if (overdue) {
    const daysLate = Math.abs(daysUntilDue(dueDate));
    const lateFee = calculateLateFee(dueDate);

    return (
      <div className="flex items-start gap-2.5 rounded-sm border border-terracotta-300 bg-terracotta-50 px-3.5 py-2.5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <p className="font-sans text-sm font-semibold text-terracotta-800">
            Atrasado há {daysLate} dia{daysLate > 1 ? 's' : ''}
          </p>
          <p className="font-sans text-sm text-terracotta-700">
            Multa estimada: <span className="font-bold">{formatCurrency(lateFee)}</span> — devolva o quanto antes.
          </p>
        </div>
      </div>
    );
  }

  const daysLeft = daysUntilDue(dueDate);
  return (
    <div className="flex items-start gap-2.5 rounded-sm border border-terracotta-200 bg-terracotta-50/60 px-3.5 py-2.5">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="font-sans text-sm font-medium text-terracotta-700">
        {daysLeft === 0
          ? 'Vence hoje — devolva para evitar multa.'
          : `Faltam ${daysLeft} dia${daysLeft > 1 ? 's' : ''} para devolver.`}
      </p>
    </div>
  );
}
