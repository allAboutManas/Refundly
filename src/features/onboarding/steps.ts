/** The order lifecycle, as shown on the How It Works screen (PRD §8, brief §10). */
export interface LifecycleStep {
  emoji: string
  title: string
  description: string
}

export const LIFECYCLE_STEPS: LifecycleStep[] = [
  {
    emoji: '🛒',
    title: 'Add your order',
    description:
      'Tell us where you bought it, which account you used, the order ID, product and expected refund.',
  },
  {
    emoji: '📦',
    title: 'Product delivered',
    description: "Once it arrives, mark it delivered and tell us when the return window closes.",
  },
  {
    emoji: '⭐',
    title: 'Review reminder',
    description: "We'll remind you to check your review or rating a few days after delivery.",
  },
  {
    emoji: '🔒',
    title: 'Return window closes',
    description: 'When the return window ends, we let you know the refund form is ready.',
  },
  {
    emoji: '📝',
    title: 'Fill the refund form',
    description: 'Mark the form filled and choose whether the refund takes calendar or working days.',
  },
  {
    emoji: '📅',
    title: 'We calculate the date',
    description: 'Working days skip weekends and holidays — we compute the expected refund date for you.',
  },
  {
    emoji: '💰',
    title: 'Refund follow-up',
    description: "If the refund is late, we keep reminding you until you mark it received.",
  },
  {
    emoji: '✅',
    title: 'Refund received',
    description: 'Mark it paid and we stop the reminders. Lifecycle complete.',
  },
]
