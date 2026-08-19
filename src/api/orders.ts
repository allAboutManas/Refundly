import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type {
  Json,
  OrderEventRow,
  OrderRow,
  RefundDetailRow,
} from '@/lib/database.types'
import type { OrderEventType } from '@/domain'

export type OrderWithRefund = OrderRow & { refund: RefundDetailRow | null }

export const ordersKey = (userId?: string) => ['orders', userId] as const
export const orderKey = (id: string) => ['order', id] as const
export const orderEventsKey = (id: string) => ['order-events', id] as const

type RawOrder = OrderRow & { refund_details: RefundDetailRow[] | null }

function toOrderWithRefund(row: RawOrder): OrderWithRefund {
  const { refund_details, ...order } = row
  return { ...order, refund: refund_details?.[0] ?? null }
}

export function useOrders() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ordersKey(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<OrderWithRefund[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, refund_details(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as unknown as RawOrder[]).map(toOrderWithRefund)
    },
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: orderKey(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<OrderWithRefund | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, refund_details(*)')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return data ? toOrderWithRefund(data as unknown as RawOrder) : null
    },
  })
}

export function useOrderEvents(id: string | undefined) {
  return useQuery({
    queryKey: orderEventsKey(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<OrderEventRow[]> => {
      const { data, error } = await supabase
        .from('order_events')
        .select('*')
        .eq('order_id', id!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}

/** Append an audit event to an order (PRD §63/64). Best-effort. */
export async function appendOrderEvent(
  orderId: string,
  eventType: OrderEventType,
  eventDate: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await supabase.from('order_events').insert({
    order_id: orderId,
    event_type: eventType,
    event_date: eventDate,
    metadata: metadata as Json,
  })
}

export interface CreateOrderInput {
  id?: string
  platform_id: string | null
  account_id: string | null
  custom_platform_name?: string | null
  order_id: string
  product_name: string
  refund_amount: number
  currency?: string
  order_date?: string | null
  delivery_date?: string | null
  // For back-dated ("existing") orders that were already delivered when added.
  is_delivered?: boolean
  return_window_close_date?: string | null
  review_status?: OrderRow['review_status']
  notes?: string | null
}

export function useCreateOrder() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<OrderRow> => {
      const { data, error } = await supabase
        .from('orders')
        .insert({ ...input, user_id: user!.id })
        .select('*')
        .single()
      if (error) throw error
      await appendOrderEvent(data.id, 'ORDER_CREATED', data.order_date, {
        product_name: data.product_name,
      })
      // Existing order added as already-delivered → record the delivery event too,
      // so the timeline and reminders line up with the real dates.
      if (data.is_delivered && data.delivery_date) {
        await appendOrderEvent(data.id, 'DELIVERED', data.delivery_date)
      }
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ordersKey(user?.id) }),
  })
}

export function useDeleteOrder() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ordersKey(user?.id) }),
  })
}

/** Invalidate all queries touching a single order. */
function useInvalidateOrder() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return (id: string) => {
    qc.invalidateQueries({ queryKey: ordersKey(user?.id) })
    qc.invalidateQueries({ queryKey: orderKey(id) })
    qc.invalidateQueries({ queryKey: orderEventsKey(id) })
  }
}

const nowIso = () => new Date().toISOString()

export function useUpdateOrderFields() {
  const invalidate = useInvalidateOrder()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<OrderRow> }) => {
      const { error } = await supabase.from('orders').update(patch).eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: (id) => invalidate(id),
  })
}

export function useMarkDelivered() {
  const invalidate = useInvalidateOrder()
  return useMutation({
    mutationFn: async (input: {
      id: string
      deliveryDate: string
      returnWindowDate: string | null
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({
          is_delivered: true,
          delivery_date: input.deliveryDate,
          return_window_close_date: input.returnWindowDate,
          review_status: 'PENDING',
        })
        .eq('id', input.id)
      if (error) throw error
      await appendOrderEvent(input.id, 'DELIVERED', input.deliveryDate)
      return input.id
    },
    onSuccess: (id) => invalidate(id),
  })
}

export function useUpdateReviewStatus() {
  const invalidate = useInvalidateOrder()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      eventDate,
    }: {
      id: string
      status: OrderRow['review_status']
      eventDate: string | null
    }) => {
      const { error } = await supabase.from('orders').update({ review_status: status }).eq('id', id)
      if (error) throw error
      if (status !== 'PENDING') {
        await appendOrderEvent(id, 'REVIEW_CHECKED', eventDate, { status })
      }
      return id
    },
    onSuccess: (id) => invalidate(id),
  })
}

export function useSaveRefundForm() {
  const invalidate = useInvalidateOrder()
  return useMutation({
    mutationFn: async (input: {
      id: string
      filledDate: string
      timelineValue: number
      timelineUnit: 'CALENDAR_DAYS' | 'WORKING_DAYS'
      expectedDate: string
      refundAmount?: number
    }) => {
      const { error } = await supabase
        .from('refund_details')
        .update({
          refund_form_filled: true,
          refund_form_filled_at: nowIso(),
          refund_form_filled_date: input.filledDate,
          timeline_value: input.timelineValue,
          timeline_unit: input.timelineUnit,
          expected_refund_date: input.expectedDate,
        })
        .eq('order_id', input.id)
      if (error) throw error
      if (typeof input.refundAmount === 'number') {
        await supabase.from('orders').update({ refund_amount: input.refundAmount }).eq('id', input.id)
      }
      await appendOrderEvent(input.id, 'REFUND_FORM_FILLED', input.filledDate, {
        timeline_value: input.timelineValue,
        timeline_unit: input.timelineUnit,
        expected_refund_date: input.expectedDate,
      })
      return input.id
    },
    onSuccess: (id) => invalidate(id),
  })
}

export function useMarkRefundRequested() {
  const invalidate = useInvalidateOrder()
  return useMutation({
    mutationFn: async ({ id, requestedDate }: { id: string; requestedDate: string }) => {
      const { error } = await supabase
        .from('refund_details')
        .update({ refund_requested: true, refund_requested_at: nowIso() })
        .eq('order_id', id)
      if (error) throw error
      await appendOrderEvent(id, 'REFUND_REQUESTED', requestedDate)
      return id
    },
    onSuccess: (id) => invalidate(id),
  })
}

export function useMarkRefundReceived() {
  const invalidate = useInvalidateOrder()
  return useMutation({
    mutationFn: async (input: {
      id: string
      amount: number
      receivedDate: string
      reference?: string | null
    }) => {
      const { error } = await supabase
        .from('refund_details')
        .update({
          refund_received: true,
          refund_received_at: nowIso(),
          refund_received_date: input.receivedDate,
          actual_refund_amount: input.amount,
          payment_reference: input.reference ?? null,
        })
        .eq('order_id', input.id)
      if (error) throw error
      await appendOrderEvent(input.id, 'REFUND_RECEIVED', input.receivedDate, {
        amount: input.amount,
      })
      await appendOrderEvent(input.id, 'COMPLETED', input.receivedDate)
      return input.id
    },
    onSuccess: (id) => invalidate(id),
  })
}

/**
 * Undo a "refund received" mark (paid by mistake). Clears the received flags and
 * removes the terminal timeline events so the order reopens and can be edited again.
 */
export function useUndoRefundReceived() {
  const invalidate = useInvalidateOrder()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('refund_details')
        .update({
          refund_received: false,
          refund_received_at: null,
          refund_received_date: null,
          actual_refund_amount: null,
          payment_reference: null,
        })
        .eq('order_id', id)
      if (error) throw error
      await supabase
        .from('order_events')
        .delete()
        .eq('order_id', id)
        .in('event_type', ['REFUND_RECEIVED', 'COMPLETED'])
      return id
    },
    onSuccess: (id) => invalidate(id),
  })
}
