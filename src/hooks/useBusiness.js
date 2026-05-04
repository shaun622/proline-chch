import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useBusiness() {
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from('businesses').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle()
    setBusiness(data ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { business, loading, refresh: load }
}
