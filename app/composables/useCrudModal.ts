import type { Ref } from 'vue'

/**
 * Factorise la machine à états commune aux CRUD add/edit/delete (client, groupe,
 * site) : un seul formulaire réutilisé par add/edit (jamais ouverts ensemble),
 * loading/error partagés, toasts de succès. `create`/`update`/`remove` restent
 * à la charge de l'appelant (stratégie de mise à jour de la liste variable :
 * refetch pour les clients, mutation locale pour groupes/sites).
 */
export interface CrudModalConfig<TItem, TForm> {
  emptyForm : () => TForm
  toForm    : (item: TItem) => TForm
  /** Retourne un message d'erreur si le formulaire est invalide, sinon null. */
  validate ?: (form: TForm) => string | null
  create    : (form: TForm) => Promise<TItem>
  update    : (target: TItem, form: TForm) => Promise<TItem>
  remove    : (target: TItem) => Promise<void>
  createdMsg: string
  updatedMsg: string
  deletedMsg: string
}

function extractError(e: unknown): string {
  if (e && typeof e === 'object') {
    const obj = e as { data?: { message?: string; statusMessage?: string }; message?: string }
    return obj.data?.message ?? obj.data?.statusMessage ?? obj.message ?? 'Erreur'
  }
  return 'Erreur'
}

export function useCrudModal<TItem, TForm>(config: CrudModalConfig<TItem, TForm>) {
  const { add: toast } = useToast()

  const addOpen      = ref(false)
  const editTarget   = ref<TItem | null>(null)
  const deleteTarget = ref<TItem | null>(null)
  const form         = ref(config.emptyForm()) as Ref<TForm>
  const loading      = ref(false)
  const error        = ref('')

  function resetState(): void {
    loading.value = false
    error.value   = ''
  }

  function openAdd(prefill?: Partial<TForm>): void {
    form.value = { ...config.emptyForm(), ...prefill }
    addOpen.value = true
    resetState()
  }
  function openEdit(item: TItem): void {
    form.value = config.toForm(item)
    editTarget.value = item
    resetState()
  }
  function openDelete(item: TItem): void {
    deleteTarget.value = item
    resetState()
  }

  function closeAdd():    void { if (!loading.value) addOpen.value      = false }
  function closeEdit():   void { if (!loading.value) editTarget.value   = null  }
  function closeDelete(): void { if (!loading.value) deleteTarget.value = null  }

  /** true si invalide (et remplit `error`) */
  function isInvalid(): boolean {
    const msg = config.validate?.(form.value)
    if (msg) { error.value = msg; return true }
    return false
  }

  async function confirmAdd(): Promise<TItem | null> {
    if (isInvalid()) return null
    loading.value = true; error.value = ''
    try {
      const created = await config.create(form.value)
      addOpen.value = false
      toast(config.createdMsg)
      return created
    } catch (e: unknown) {
      error.value = extractError(e)
      toast(error.value, 'error')
      return null
    } finally { loading.value = false }
  }

  async function confirmEdit(): Promise<TItem | null> {
    if (!editTarget.value || isInvalid()) return null
    loading.value = true; error.value = ''
    try {
      const updated = await config.update(editTarget.value, form.value)
      editTarget.value = null
      toast(config.updatedMsg)
      return updated
    } catch (e: unknown) {
      error.value = extractError(e)
      toast(error.value, 'error')
      return null
    } finally { loading.value = false }
  }

  async function confirmDelete(): Promise<TItem | null> {
    if (!deleteTarget.value) return null
    const target = deleteTarget.value
    loading.value = true; error.value = ''
    try {
      await config.remove(target)
      deleteTarget.value = null
      toast(config.deletedMsg)
      return target
    } catch (e: unknown) {
      error.value = extractError(e)
      toast(error.value, 'error')
      return null
    } finally { loading.value = false }
  }

  return {
    addOpen, editTarget, deleteTarget, form, loading, error,
    openAdd, openEdit, openDelete,
    closeAdd, closeEdit, closeDelete,
    confirmAdd, confirmEdit, confirmDelete,
  }
}
