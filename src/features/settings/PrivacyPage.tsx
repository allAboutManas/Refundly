import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui'

const POINTS = [
  ['We store only what we need', 'Your orders, refund details, accounts and reminder preferences — nothing more.'],
  ['We never ask for store passwords', 'Refundly never requests your Amazon, Flipkart or other platform passwords.'],
  ['Your data is isolated', 'Row Level Security ensures no one else can read your orders, refunds or images.'],
  ['You’re in control', 'Delete any order or image at any time, or wipe all your data from Settings.'],
  ['Images are private', 'Product photos are stored in a private bucket only you can access.'],
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Privacy" description="What we store and how it's protected." back />
      <Card padded={false} className="divide-y divide-border">
        {POINTS.map(([title, body]) => (
          <div key={title} className="px-4 py-4">
            <p className="font-semibold text-text">{title}</p>
            <p className="mt-0.5 text-sm text-text-2">{body}</p>
          </div>
        ))}
      </Card>
    </div>
  )
}
