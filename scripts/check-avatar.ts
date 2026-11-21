import fs from 'fs'
import path from 'path'

import { person } from '../src/data/profile'

/**
 * The portrait is set in TinaCMS, and it is the LCP element on the homepage. The site is a
 * static export with images served as-is, so whatever file is chosen ships byte for byte.
 * This stops a straight-off-the-phone photo (often 2–5 MB) from quietly making the first
 * view slow: the build fails with a message saying what to do instead.
 */

const MAX_BYTES = 60 * 1024

const file = path.join(process.cwd(), 'public', person.avatar)

if (!fs.existsSync(file)) {
  console.error(`❌ Profile picture not found: public${person.avatar}. Upload it in TinaCMS (Profile) or fix content/profile.json.`)
  process.exit(1)
}

const bytes = fs.statSync(file).size
if (bytes > MAX_BYTES) {
  console.error(
    `❌ Profile picture public${person.avatar} is ${Math.round(bytes / 1024)} KB; the limit is ${MAX_BYTES / 1024} KB.\n` +
      '   Resize it to about 256×256 and save as JPEG or WebP (e.g. squoosh.app), then upload it again.',
  )
  process.exit(1)
}

console.log(`✅ Profile picture public${person.avatar}: ${Math.round(bytes / 1024)} KB`)
