// Builds the TinaCMS admin into public/admin, which the static export then ships at /admin.
//
// It needs Tina Cloud credentials (NEXT_PUBLIC_TINA_CLIENT_ID and TINA_TOKEN, set in Vercel).
// Without them it skips rather than failing, so CI and deploys keep working; the site itself
// never depends on Tina, it only reads the content files Tina writes.
import { spawnSync } from 'node:child_process'

if (!process.env.NEXT_PUBLIC_TINA_CLIENT_ID || !process.env.TINA_TOKEN) {
  console.warn('[tina] NEXT_PUBLIC_TINA_CLIENT_ID / TINA_TOKEN not set: skipping the /admin build.')
  process.exit(0)
}

const result = spawnSync('npx', ['tinacms', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)
