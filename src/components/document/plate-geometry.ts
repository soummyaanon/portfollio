/**
 * The plate's own geometry: one free parameter and a seat, handed to the shader as uniforms
 * rather than repeated as constants at both ends. The GLSL used to carry `rs` and the seat as
 * literals with copies here and a comment asking whoever edited one to remember the other.
 *
 * In plate units: the canvas's height runs from −1 to 1, y up, x scaled by the aspect. Its
 * own module so the Endurance, which orbits the hole on a canvas laid over the plate, reads
 * the same numbers without pulling in the shader.
 */
export const PLATE_RS = 0.075
export const PLATE_SEAT_X = 0
export const PLATE_SEAT_Y = 0.03
/** √27/2 — the photon capture radius in units of rs. The edge of the black disc, not the horizon. */
export const CAPTURE_RATIO = 2.598

/**
 * The Endurance's orbit about the hole, and the one clock everything around the hole keeps:
 * an ellipse from 0.74 to 1.16 plate units, taking `period` screen seconds for the Newtonian
 * orbit of the same size.
 */
export const ENDURANCE_ORBIT = { a: 0.95, e: 0.22, period: 120 } as const

/**
 * Kepler's law on that clock: a circular orbit at radius r turns at KEPLER / r^1.5 radians per
 * screen second. The disk's gas and the ship's orbit are the same physics at different radii,
 * so the inner edge of the disk laps the hole in about 14 s, its outer edge in about 72 s and
 * the ship, further out, in about 120 s.
 */
export const KEPLER = ((2 * Math.PI) / ENDURANCE_ORBIT.period) * ENDURANCE_ORBIT.a ** 1.5
