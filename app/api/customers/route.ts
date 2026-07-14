import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createCustomerSchema, validationError } from '@/lib/validations'
import { evaluateCustomerCompleteness } from '@/lib/utils'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: dbUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!dbUser) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })

  const body = await request.json()
  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error), { status: 400 })
  }

  const reviewData = evaluateCustomerCompleteness(parsed.data.name, parsed.data.address)

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('customers')
    .insert({ ...parsed.data, ...reviewData })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
