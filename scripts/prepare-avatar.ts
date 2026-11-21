import fs from 'fs'
import path from 'path'

import sharp from 'sharp'

import { AVATAR_PATH, PORTRAIT_PATH } from '../src/data/profile'
import { profileContent } from '../src/data/profile-content'

/**
 * The portrait is chosen in TinaCMS, which commits whatever was uploaded — usually a camera
 * original of a few megabytes. It is also the LCP element on the homepage, and the site is a
 * static export that serves images byte for byte. So the site never serves the upload: this
 * makes a 256×256 JPEG from it at build time, cropped to the most salient part of the frame
 * (in a portrait, the face), and the page uses that.
 *
 * Runs before every build and dev server. The output is gitignored; the upload is the source.
 */

const SIZE = 256
/** The full view's long edge: sharp on a 2× laptop screen, still ~100 KB. */
const PORTRAIT_EDGE = 1400

async function main() {
  const source = path.join(process.cwd(), 'public', profileContent.avatar)
  const output = path.join(process.cwd(), 'public', AVATAR_PATH)

  if (!fs.existsSync(source)) {
    console.error(`❌ Profile picture not found: public${profileContent.avatar}. Upload it again in TinaCMS (Profile).`)
    process.exit(1)
  }

  fs.mkdirSync(path.dirname(output), { recursive: true })

  // Honour the camera's EXIF orientation first, so width, height and the crop below are
  // measured on the photo as it is seen, not as the sensor stored it.
  const { data, info: upright } = await sharp(source).rotate().toBuffer({ resolveWithObject: true })

  const zoom = profileContent.avatarZoom
  let image = sharp(data)
  if (zoom > 1) {
    // A square `zoom` times smaller than the photo's short side, centred across and a
    // quarter of the way down the spare height: in a portrait the face sits high.
    const side = Math.round(Math.min(upright.width, upright.height) / zoom)
    image = image.extract({
      left: Math.round((upright.width - side) / 2),
      top: Math.round((upright.height - side) * 0.25),
      width: side,
      height: side,
    })
  }

  // Unzoomed and not square, the square is chosen by salience rather than taken from the middle.
  const info = await image
    .resize(SIZE, SIZE, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(output)

  // The whole photo, for the full view. Never upscaled; loaded only when someone reaches
  // for the avatar, so it costs the first view nothing.
  const portrait = await sharp(data)
    .resize(PORTRAIT_EDGE, PORTRAIT_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true, progressive: true })
    .toFile(path.join(process.cwd(), 'public', PORTRAIT_PATH))

  const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`
  console.log(`✅ Full portrait → public${PORTRAIT_PATH} (${portrait.width}×${portrait.height}, ${kb(portrait.size)})`)
  console.log(
    `✅ Profile picture: public${profileContent.avatar} (${kb(fs.statSync(source).size)}, zoom ${zoom}) → public${AVATAR_PATH} (${info.width}×${info.height}, ${kb(info.size)})`,
  )
}

main().catch((error) => {
  console.error(`❌ Could not process the profile picture public${profileContent.avatar}:`, error.message)
  process.exit(1)
})
