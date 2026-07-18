/**
 * RentalTermsBox — bloco de "Termos de Locação" com visual de documento antigo.
 * Controlado externamente: `accepted` + `onAcceptedChange`.
 */
export default function RentalTermsBox({ accepted, onAcceptedChange }) {
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-sm font-semibold text-wood-800">Termos de Locação</h3>

      <div
        className="
          max-h-40 overflow-y-auto rounded-sm border border-wood-300/70 bg-parchment-aged
          px-4 py-3 font-serif text-[13px] leading-relaxed text-wood-700
          shadow-[inset_0_1px_4px_rgba(44,29,17,0.15)]
        "
      >
        <p className="mb-2">
          <strong>1. Prazo de locação.</strong> Cada livro alugado tem prazo de devolução de 14
          (quatorze) dias corridos a partir da data de retirada, indicado na sua sacola e no
          Painel do Leitor.
        </p>
        <p className="mb-2">
          <strong>2. Multa por atraso.</strong> A devolução após o prazo previsto gera multa
          diária de R$ 2,00 por livro, acumulada até a efetiva devolução do exemplar.
        </p>
        <p className="mb-2">
          <strong>3. Danos ao acervo.</strong> Livros devolvidos com avarias leves (manchas,
          dobras, capa danificada) estão sujeitos a taxa de reparo. Exemplares devolvidos
          inutilizados ou não devolvidos serão cobrados pelo valor integral de reposição.
        </p>
        <p className="mb-2">
          <strong>4. Limite por aluguel.</strong> É permitido reservar até 3 (três) livros por
          sacola/aluguel simultâneo.
        </p>
        <p>
          <strong>5. Boa conservação.</strong> O leitor se compromete a manter os livros em
          local seco, longe de umidade e manuseá-los com cuidado durante todo o período de
          locação.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 font-sans text-sm text-wood-700">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="
            mt-0.5 h-4 w-4 shrink-0 rounded-sm border-wood-400 text-moss-600
            accent-moss-600 focus:ring-2 focus:ring-moss-300
          "
        />
        <span>
          Declaro que li e aceito as{' '}
          <span className="font-semibold text-wood-800">
            Políticas de Locação, Prazos e Multas por Atraso ou Danos
          </span>
          .
        </span>
      </label>
    </div>
  );
}
