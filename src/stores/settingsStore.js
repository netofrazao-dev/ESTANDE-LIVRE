import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { RENTAL_CONFIG as ENV_DEFAULTS } from '@/lib/utils'

// Store de configurações vigentes do sistema. Começa com os valores do
// .env (RENTAL_CONFIG) como fallback seguro, e sobrescreve com o que
// estiver no banco assim que carregar — assim o site nunca quebra se a
// tabela 'settings' ainda não existir (ex.: antes de rodar migration_v4).
export const useSettingsStore = create((set, get) => ({
  maxBooksPerRental: ENV_DEFAULTS.maxBooksPerRental,
  rentalDays: ENV_DEFAULTS.rentalDays,
  dailyFine: ENV_DEFAULTS.dailyFine,
  damageFee: ENV_DEFAULTS.damageFee,
  lossFee: ENV_DEFAULTS.lossFee,
  minorDamageFee: 20,
  lostAdminFee: 15,
  comboDailyFineNormal: 1.75,
  comboDailyFineReserved: 2.65,
  storeName: 'Estante Livre',
  storeAddress: '',
  storePhone: '',
  storeHours: '',
  whatsappNumber: '',
  instagramUrl: '',
  loaded: false,

  load: async () => {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single()
    if (error || !data) return // mantém os defaults do .env, sem quebrar o site

    set({
      maxBooksPerRental: data.max_books_per_rental,
      rentalDays: data.rental_days,
      dailyFine: Number(data.daily_fine),
      damageFee: Number(data.damage_fee),
      lossFee: Number(data.loss_fee),
      minorDamageFee: Number(data.minor_damage_fee ?? 20),
      lostAdminFee: Number(data.lost_admin_fee ?? 15),
      comboDailyFineNormal: Number(data.combo_daily_fine_normal ?? 1.75),
      comboDailyFineReserved: Number(data.combo_daily_fine_reserved ?? 2.65),
      storeName: data.store_name || 'Estante Livre',
      storeAddress: data.store_address || '',
      storePhone: data.store_phone || '',
      storeHours: data.store_hours || '',
      whatsappNumber: data.whatsapp_number || '',
      instagramUrl: data.instagram_url || '',
      loaded: true,
    })
  },

  // Usado pela tela de admin. Só atualiza o banco — o próprio 'load()' é
  // rechamado depois pra refletir o valor confirmado (evita drift local).
  updateSettings: async (patch) => {
    const dbPatch = {}
    if (patch.maxBooksPerRental !== undefined) dbPatch.max_books_per_rental = patch.maxBooksPerRental
    if (patch.rentalDays !== undefined) dbPatch.rental_days = patch.rentalDays
    if (patch.dailyFine !== undefined) dbPatch.daily_fine = patch.dailyFine
    if (patch.damageFee !== undefined) dbPatch.damage_fee = patch.damageFee
    if (patch.lossFee !== undefined) dbPatch.loss_fee = patch.lossFee
    if (patch.minorDamageFee !== undefined) dbPatch.minor_damage_fee = patch.minorDamageFee
    if (patch.lostAdminFee !== undefined) dbPatch.lost_admin_fee = patch.lostAdminFee
    if (patch.comboDailyFineNormal !== undefined) dbPatch.combo_daily_fine_normal = patch.comboDailyFineNormal
    if (patch.comboDailyFineReserved !== undefined) dbPatch.combo_daily_fine_reserved = patch.comboDailyFineReserved
    if (patch.storeName !== undefined) dbPatch.store_name = patch.storeName
    if (patch.storeAddress !== undefined) dbPatch.store_address = patch.storeAddress
    if (patch.storePhone !== undefined) dbPatch.store_phone = patch.storePhone
    if (patch.storeHours !== undefined) dbPatch.store_hours = patch.storeHours
    if (patch.whatsappNumber !== undefined) dbPatch.whatsapp_number = patch.whatsappNumber
    if (patch.instagramUrl !== undefined) dbPatch.instagram_url = patch.instagramUrl

    const { error } = await supabase.from('settings').update(dbPatch).eq('id', 1)
    if (error) throw error
    await get().load()
  },
}))
