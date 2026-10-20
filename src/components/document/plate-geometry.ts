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
