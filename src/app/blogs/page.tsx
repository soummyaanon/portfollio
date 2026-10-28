import { WritingPage, writingMetadata } from '@/components/pages/WritingPage'

export const metadata = writingMetadata('en')

export default function Writing() {
  return <WritingPage locale="en" />
}
