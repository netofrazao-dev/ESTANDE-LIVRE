import { useState } from 'react';
import Button from '../ui/Button';
import {
  DAMAGE_OPTIONS,
  calculateLateFee,
  damageFeeFor,
  formatCurrency,
  isRentalOverdue,
  daysUntilDue,
} from '../../utils/rentalRules';

/**
 * ReturnConfirmModal — checklist rápido de execução do contrato no momento
 * da devolução: condição do livro + confirmação de recebimento de multa.
 *
 * onConfirm({ book_condition_returned, late_fee_accumulated })
 */
export default function ReturnConfirmModal({ rental, onClose, onConfirm, isSubmitting = false }) {
  const [condition, setCondition] = useState('none');
  const [feeReceived, setFeeReceived] = useState(false);

  if (!rental) return null;

  const overdue = isRentalOverdue(rental.due_date);
  const daysLate = overdue ? Math.abs(daysUntilDue(rental.due_date)) : 0;
  const lateFee = calculateLateFee(rental.due_date);
  const damageFee = damageFeeFor(condition);
  const totalFee = Number((lateFee + damageFee).toFixed(2));

  const requiresFeeConfirmation = lateFee > 0;
  const canConfirm = !requiresFeeConfirmation || feeReceived;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(rental.id, {
      book_condition_returned: condition,
      late_fee_accumulated: totalFee,
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-wood-900/45 px-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-md border border-wood-200 bg-parchment-light p-6 shadow-shelf"
      >
        <h2 className="font-serif text-xl font-semibold text-wood-800">Confirmar devolução</h2>
        <p className="mt-1 font-sans text-sm text-wood-500">
          <span className="font-semibold text-wood-700">{rental.books?.title}</span> — {rental.users?.full_name}
        </p>

        {/* Situação do prazo */}
        <div className="mt-4 rounded-sm border border-wood-200 bg-parchment px-4 py-3">
          {overdue ? (
            <p className="font-sans text-sm text-terracotta-700">
              Atrasado há <span className="font-bold">{daysLate} dia{daysLate > 1 ? 's' : ''}</span> ·
              multa por atraso: <span className="font-bold">{formatCurrency(lateFee)}</span>
            </p>
          ) : (
            <p className="font-sans text-sm text-moss-700">Devolvido dentro do prazo — sem multa por atraso.</p>
          )}
        </div>

        {/* O livro sofreu danos? */}
        <fieldset className="mt-5">
          <legend className="mb-2 font-sans text-sm font-semibold text-wood-700">
            O livro sofreu danos?
          </legend>
          <div className="space-y-2">
            {DAMAGE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`
                  flex cursor-pointer items-center justify-between rounded-sm border px-3.5 py-2.5
                  font-sans text-sm transition-colors duration-200
                  ${
                    condition === opt.value
                      ? 'border-moss-400 bg-moss-50 text-wood-800'
                      : 'border-wood-200 bg-parchment text-wood-600 hover:bg-wood-50'
                  }
                `}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="book_condition"
                    value={opt.value}
                    checked={condition === opt.value}
                    onChange={() => setCondition(opt.value)}
                    className="h-4 w-4 accent-moss-600"
                  />
                  {opt.label}
                </span>
                <span className={opt.fee > 0 ? 'font-semibold text-terracotta-700' : 'text-wood-400'}>
                  {opt.fee > 0 ? `+ ${formatCurrency(opt.fee)}` : '—'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Confirmação de recebimento da multa */}
        {requiresFeeConfirmation && (
          <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-sm border border-terracotta-200 bg-terracotta-50 px-3.5 py-2.5 font-sans text-sm text-terracotta-800">
            <input
              type="checkbox"
              checked={feeReceived}
              onChange={(e) => setFeeReceived(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-terracotta-600"
            />
            <span>
              Confirmo o recebimento da multa por atraso de{' '}
              <span className="font-bold">{formatCurrency(lateFee)}</span>.
            </span>
          </label>
        )}

        {/* Total */}
        <div className="mt-4 flex items-center justify-between border-t border-dashed border-wood-300 pt-3">
          <span className="font-sans text-sm font-semibold text-wood-700">Total a registrar</span>
          <span className="font-serif text-lg font-bold text-wood-800">{formatCurrency(totalFee)}</span>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
            isLoading={isSubmitting}
          >
            Confirmar devolução
          </Button>
        </div>
      </div>
    </div>
  );
}
