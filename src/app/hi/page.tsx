import { HomePage, homeMetadata } from '@/components/pages/HomePage'

export const metadata = homeMetadata('hi')

export default function Home() {
  return <HomePage locale="hi" />
}
