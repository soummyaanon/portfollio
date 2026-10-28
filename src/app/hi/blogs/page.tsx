import { WritingPage, writingMetadata } from '@/components/pages/WritingPage'

export const metadata = writingMetadata('hi')

export default function Writing() {
  return <WritingPage locale="hi" />
}
