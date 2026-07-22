export default function Privacy() {
  return (
    <div className="container-book py-16 md:py-24">
      <div className="max-w-2xl mx-auto">
        <div className="eyebrow mb-2">Documento legal</div>
        <h1 className="font-display text-display-md mb-2">Política de Privacidade</h1>
        <p className="text-sm text-cafe/60 mb-10">Última atualização: julho de 2026.</p>

        <div className="space-y-8 text-sm leading-relaxed text-cafe/85">
          <section>
            <h2 className="font-display text-xl mb-3">1. Quem somos</h2>
            <p className="text-pretty">
              A Estante Livre é uma locadora de livros. Este documento explica quais dados
              coletamos de você, leitor, para que servem e como você pode exercer seus
              direitos sobre eles, em conformidade com a Lei Geral de Proteção de Dados
              (Lei nº 13.709/2018 — LGPD).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">2. Quais dados coletamos</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome completo e e-mail, para identificação e comunicação sobre seus empréstimos</li>
              <li>Telefone (opcional), para contato em caso de urgência sobre um empréstimo</li>
              <li>Senha, armazenada de forma criptografada — nunca temos acesso a ela em texto puro</li>
              <li>Histórico de empréstimos: quais livros você retirou, datas, devoluções, multas e reservas</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">3. Para que usamos esses dados</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Gerenciar seus empréstimos, prazos e eventuais multas</li>
              <li>Enviar avisos de vencimento, atraso e disponibilidade de reservas por e-mail</li>
              <li>Cumprir obrigações legais e resolver disputas sobre o comodato dos livros</li>
            </ul>
            <p className="mt-3 text-pretty">
              Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins de
              marketing. Usamos provedores de infraestrutura (banco de dados e envio de e-mail)
              apenas como operadores técnicos, sob as mesmas obrigações de confidencialidade.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">4. Por quanto tempo guardamos</h2>
            <p className="text-pretty">
              Mantemos seus dados enquanto sua conta estiver ativa e pelo tempo necessário para
              cumprir obrigações legais e resolver eventuais pendências financeiras. Você pode
              solicitar a exclusão da sua conta a qualquer momento, respeitado o prazo de guarda
              de registros financeiros exigido por lei.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">5. Seus direitos</h2>
            <p className="text-pretty">
              Você pode, a qualquer momento, solicitar a confirmação de quais dados temos sobre
              você, correção de informações incorretas, portabilidade ou exclusão da sua conta.
              Basta entrar em contato pelos canais listados no rodapé do site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">6. Segurança</h2>
            <p className="text-pretty">
              Seus dados são armazenados com criptografia em repouso e em trânsito, com acesso
              restrito por regras de segurança em nível de linha (Row Level Security) — cada
              leitor só enxerga os próprios dados, e apenas administradores autorizados acessam
              o painel de gestão.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">7. Alterações a esta política</h2>
            <p className="text-pretty">
              Podemos atualizar esta política periodicamente. Mudanças relevantes serão
              comunicadas por e-mail ou aviso no site.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
