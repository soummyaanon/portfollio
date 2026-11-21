import { defineConfig } from 'tinacms'

/**
 * TinaCMS: the admin at /admin edits the repo's own files and commits them, so the site stays
 * a static export with no server or database. Locally (`npm run dev`) it edits the files on
 * disk; in production it signs in through Tina Cloud, which commits to GitHub and lets Vercel
 * redeploy.
 *
 * What it edits:
 *   - content/projects.json — every project card, in site order (drag to reorder)
 *   - src/blogs/*.md         — blog posts, front matter plus a raw Markdown body
 */

const branch =
  process.env.NEXT_PUBLIC_TINA_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'master'

const DATE = /^\d{4}-\d{2}-\d{2}$/
const SLUG = /^[a-z0-9-]+$/

/** The prose fields a project has in each language. Hindi is required so the Hindi page never falls back. */
const proseFields = (language: string) =>
  [
    { type: 'string', name: 'tagline', label: `Tagline (${language})`, required: true },
    { type: 'string', name: 'linkLabel', label: `Link label (${language})`, required: true, description: 'e.g. "Visit site", "Download for macOS"' },
    { type: 'string', name: 'summary', label: `Summary (${language})`, required: true, ui: { component: 'textarea' } },
    {
      type: 'string',
      name: 'capabilities',
      label: `Capabilities (${language})`,
      list: true,
      required: true,
      description: 'One line each. Keep the same number of lines in English and Hindi.',
    },
  ] as const

export default defineConfig({
  branch,
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  token: process.env.TINA_TOKEN,

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      // Images are served from public/, and fields store them as "/name.webp".
      mediaRoot: '',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name: 'profile',
        label: 'Profile',
        path: 'content',
        format: 'json',
        match: { include: 'profile' },
        ui: {
          // One file, always there: it can be edited, not added or deleted.
          allowedActions: { create: false, delete: false },
        },
        fields: [
          {
            type: 'image',
            name: 'avatar',
            label: 'Profile picture',
            required: true,
            description:
              'Any photo (JPEG, PNG or WebP); straight from your phone is fine. The site crops it to a square and shrinks it to 256×256 when it builds.',
          },
          {
            type: 'number',
            name: 'avatarZoom',
            label: 'Profile picture zoom',
            description: '1 shows the whole photo; 2 is twice as close. Zooms toward the upper middle, where a face usually is. Between 1 and 4.',
          },
        ],
      },
      {
        name: 'projects',
        label: 'Projects',
        path: 'content',
        format: 'json',
        match: { include: 'projects' },
        ui: {
          // One file holds the whole list, so it can be reordered; it cannot be added or deleted.
          allowedActions: { create: false, delete: false },
        },
        fields: [
          {
            type: 'object',
            name: 'projects',
            label: 'Projects',
            list: true,
            description: 'Order here is order on the site. Turn on "Featured" to show a project on the homepage.',
            ui: {
              itemProps: (item: { name?: string; featured?: boolean }) => ({
                label: `${item?.featured ? '★ ' : ''}${item?.name || 'New project'}`,
              }),
            },
            fields: [
              { type: 'string', name: 'name', label: 'Name', required: true, isTitle: true },
              {
                type: 'string',
                name: 'id',
                label: 'ID',
                required: true,
                description: 'Lowercase words joined by hyphens, e.g. "engineering-os". Do not change once published.',
                ui: {
                  validate: (value?: string) => (value && !SLUG.test(value) ? 'Use lowercase letters, numbers and hyphens' : undefined),
                },
              },
              {
                type: 'string',
                name: 'status',
                label: 'Status',
                required: true,
                options: [
                  { value: 'live', label: 'Live' },
                  { value: 'in-development', label: 'In development' },
                  { value: 'experimental', label: 'Experimental (no longer developed)' },
                ],
              },
              { type: 'boolean', name: 'featured', label: 'Featured on homepage' },
              { type: 'string', name: 'url', label: 'URL', required: true },
              { type: 'image', name: 'image', label: 'Thumbnail', description: 'About 1600×800 WebP, shown in greyscale until hovered.' },
              { type: 'image', name: 'logo', label: 'Logo' },
              ...proseFields('English'),
              { type: 'object', name: 'hi', label: 'Hindi', required: true, fields: [...proseFields('Hindi')] },
              // The project's own page (/projects/<id>/). English only, all optional: the page
              // shows the sections that are filled in.
              {
                type: 'string',
                name: 'why',
                label: 'Page: why I built it',
                description: 'First person. Separate paragraphs with a blank line.',
                ui: { component: 'textarea' },
              },
              { type: 'string', name: 'howItWorks', label: 'Page: how it works', list: true, description: 'One step per line, in order.' },
              { type: 'string', name: 'stack', label: 'Page: built with', list: true, description: 'One technology per line.' },
              { type: 'string', name: 'install', label: 'Page: install command', description: 'Shown as "Try it", e.g. "brew install …".' },
              { type: 'string', name: 'source', label: 'Page: source code URL', description: 'Public repositories only.' },
              { type: 'string', name: 'platform', label: 'Platform', description: 'What it runs on, e.g. "macOS". Blank means Web.' },
            ],
          },
        ],
      },
      {
        name: 'post',
        label: 'Blog posts',
        path: 'src/blogs',
        format: 'md',
        ui: {
          filename: {
            // The file name is the URL: /blogs/<slug>/
            slugify: (values: { slug?: string; title?: string }) =>
              (values?.slug || values?.title || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
          },
        },
        fields: [
          { type: 'string', name: 'title', label: 'Title', required: true, isTitle: true },
          {
            type: 'string',
            name: 'slug',
            label: 'Slug',
            required: true,
            description: 'The URL, e.g. "inside-yc-qm". Keep it the same as the file name.',
            ui: { validate: (value?: string) => (value && !SLUG.test(value) ? 'Use lowercase letters, numbers and hyphens' : undefined) },
          },
          {
            type: 'string',
            name: 'date',
            label: 'Date',
            required: true,
            description: 'YYYY-MM-DD',
            ui: { validate: (value?: string) => (value && !DATE.test(value) ? 'Use YYYY-MM-DD' : undefined) },
          },
          { type: 'string', name: 'excerpt', label: 'Excerpt', required: true, ui: { component: 'textarea' } },
          { type: 'string', name: 'description', label: 'SEO description', ui: { component: 'textarea' } },
          { type: 'string', name: 'tags', label: 'Tags', list: true },
          {
            // Raw Markdown, saved exactly as typed, so code blocks and Mermaid diagrams survive.
            type: 'string',
            name: 'body',
            label: 'Body (Markdown)',
            isBody: true,
            ui: { component: 'textarea' },
          },
        ],
      },
    ],
  },
})
