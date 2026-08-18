import type { OrderView } from '@/domain'
import type { OrderWithRefund } from '@/api/orders'

/** Map a database order (+ its refund row) into the pure-domain OrderView. */
export function toOrderView(o: OrderWithRefund): OrderView {
  return {
    orderDate: o.order_date,
    isDelivered: o.is_delivered,
    deliveryDate: o.delivery_date,
    returnWindowCloseDate: o.return_window_close_date,
    reviewStatus: o.review_status,
    refund: o.refund
      ? {
          refundFormFilled: o.refund.refund_form_filled,
          timelineValue: o.refund.timeline_value,
          timelineUnit: o.refund.timeline_unit,
          expectedRefundDate: o.refund.expected_refund_date,
          refundRequested: o.refund.refund_requested,
          refundReceived: o.refund.refund_received,
        }
      : null,
  }
}
