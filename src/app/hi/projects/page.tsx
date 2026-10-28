import { ProjectsPage, projectsMetadata } from '@/components/pages/ProjectsPage'

export const metadata = projectsMetadata('hi')

export default function Projects() {
  return <ProjectsPage locale="hi" />
}
