// Cada livro de uma locação vira uma linha própria na tabela `rentals` —
// mas quando o leitor aluga 3 livros de uma vez, as 3 linhas nascem no
// mesmo instante exato (mesma transação no banco) e com o mesmo método
// de entrega. Agrupamos por isso pra exibir como um "pedido" só, em vez
// de 3 linhas soltas e repetidas.
//
// Locações de combo já têm um id de agrupamento explícito
// (combo_checkout_id) — usamos ele quando existe, e caímos pro par
// usuário+horário como fallback pros checkouts normais.
export function groupRentalsIntoOrders(rentals = []) {
  const groups = new Map()

  for (const r of rentals) {
    const key = r.combo_checkout_id
      ? `combo:${r.combo_checkout_id}`
      : `${r.user_id}|${r.rented_at}`

    if (!groups.has(key)) {
      groups.set(key, {
        orderId: key,
        userId: r.user_id,
        user: r.user,
        rentedAt: r.rented_at,
        deliveryMethod: r.delivery_method,
        deliveryAddress: r.delivery_address,
        isCombo: !!r.combo_checkout_id,
        items: [],
      })
    }
    groups.get(key).items.push(r)
  }

  return Array.from(groups.values()).map((order) => {
    const totalPrice = order.items.reduce((sum, i) => sum + (i.price || 0), 0)
    const allPaid = order.items.every((i) => i.price === 0 || i.rental_paid)
    const anyPaid = order.items.some((i) => i.rental_paid)
    const allDelivered = order.items.every((i) => i.delivered_at)
    const anyDelivered = order.items.some((i) => i.delivered_at)
    const anyActive = order.items.some((i) => i.status === 'active')
    const anyLate = order.items.some((i) => i.status === 'active' && new Date(i.due_date) < new Date())

    return {
      ...order,
      totalPrice,
      allPaid,
      anyPaid,
      allDelivered,
      anyDelivered,
      anyActive,
      anyLate,
      bookCount: order.items.length,
    }
  }).sort((a, b) => new Date(b.rentedAt) - new Date(a.rentedAt))
}
