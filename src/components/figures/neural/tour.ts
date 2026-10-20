import { CORE, RING, X, type Layer } from './topology'

/**
 * The guided tour: one stop per part of the sculpture, in the order a signal meets them. Each
 * stop says what to look at (the camera's height and zoom), what to light (the rest dims), where
 * the indicator rides (a point on the part, as a height and a radius about the upright axis),
 * and what to say. Plain data, so the copy and the framing are read in one place.
 *
 * Heights are in the sculpture's standing frame: the network is laid out along +x and stood up
 * so that x = −h, which puts the inputs at the top.
 */

export type Highlight =
  | { readonly kind: 'all' }
  | { readonly kind: 'layers'; readonly layers: readonly { layer: Layer; side?: -1 | 1 }[] }
  | { readonly kind: 'connections' }
  | { readonly kind: 'core' }

export interface TourStop {
  readonly id: string
  readonly name: string
  readonly title: string
  readonly body: string
  readonly facts: string
  readonly camera: { readonly height: number; readonly zoom: number }
  /**
   * Where the indicator sits, or null for a stop about the whole figure: a point on the part's
   * ring, toward the front of the view, which `snap` moves onto the nearest node or connection
   * so the indicator always lands on something real.
   */
  readonly anchor: { readonly height: number; readonly radius: number; readonly snap?: 'node' | 'edge' } | null
  readonly highlight: Highlight
  /** How much faster signals enter while this stop is showing. */
  readonly traffic?: number
}

export const TOUR: readonly TourStop[] = [
  {
    id: 'overview',
    name: 'The network',
    title: 'A neural network, built as an object',
    body: 'Sixty-six nodes, a hundred and eight connections and one core. Signals enter at the top and leave at the bottom. Scroll to take it apart, one part at a time.',
    facts: '66 nodes · 108 connections · 1 core',
    camera: { height: 0, zoom: 1 },
    anchor: null,
    highlight: { kind: 'all' },
  },
  {
    id: 'inputs',
    name: 'Input layer',
    title: 'Inputs',
    body: 'Where data enters. Each node holds one number (a pixel, a piece of a word, a sensor reading) and hands it down its connection to the first processing ring.',
    facts: '24 nodes · the widest ring',
    camera: { height: X.input - 1.4, zoom: 1.45 },
    anchor: { height: X.input, radius: RING.input, snap: 'node' },
    highlight: { kind: 'layers', layers: [{ layer: 'input' }, { layer: 'outer', side: -1 }] },
  },
  {
    id: 'encoder',
    name: 'Encoder',
    title: 'Encoder',
    body: 'Two rings that compress. Each node weighs everything that reaches it and passes on a single activation, so raw detail is distilled into features: twelve nodes, then six larger ones.',
    facts: '12 + 6 nodes · ring links share context',
    camera: { height: (X.outer + X.inner) / 2, zoom: 1.6 },
    anchor: { height: X.outer, radius: RING.outer, snap: 'node' },
    highlight: { kind: 'layers', layers: [{ layer: 'outer', side: -1 }, { layer: 'inner', side: -1 }] },
  },
  {
    id: 'connections',
    name: 'Weights',
    title: 'Connections',
    body: 'Every tube is a connection, and in a real network each one carries a learned weight. Training is the slow adjustment of every one of them until the outputs come out right.',
    facts: '108 connections · none of them cross',
    camera: { height: 3.6, zoom: 1.25 },
    anchor: { height: (X.input + X.outer) / 2, radius: (RING.input + RING.outer) / 2, snap: 'edge' },
    highlight: { kind: 'connections' },
  },
  {
    id: 'core',
    name: 'Latent core',
    title: 'The core',
    body: 'The bottleneck. Everything the network has worked out about an input is squeezed through twelve ports into one compact representation, the glass sphere at the centre. Click it to send a wave through the whole network.',
    facts: '12 ports · 3 orbital rings · nested frames',
    camera: { height: 0, zoom: 2.1 },
    anchor: { height: 0, radius: CORE.shell },
    highlight: { kind: 'core' },
  },
  {
    id: 'decoder',
    name: 'Decoder',
    title: 'Decoder',
    body: 'The mirror of the encoder. It expands the compact representation back out, six nodes to twelve, rebuilding the detail the answer needs.',
    facts: '6 + 12 nodes',
    camera: { height: -(X.outer + X.inner) / 2, zoom: 1.6 },
    anchor: { height: -X.outer, radius: RING.outer, snap: 'node' },
    highlight: { kind: 'layers', layers: [{ layer: 'inner', side: 1 }, { layer: 'outer', side: 1 }] },
  },
  {
    id: 'outputs',
    name: 'Output layer',
    title: 'Outputs',
    body: 'The answer: one value per output. Depending on the network that is a class, a probability, or the next action an agent takes.',
    facts: '6 nodes · each held in a chrome collar',
    camera: { height: -X.output + 1.4, zoom: 1.6 },
    anchor: { height: -X.output, radius: RING.output, snap: 'node' },
    highlight: { kind: 'layers', layers: [{ layer: 'outer', side: 1 }, { layer: 'output' }] },
  },
  {
    id: 'signals',
    name: 'Forward pass',
    title: 'Signals',
    body: 'Each moving light is a forward pass along one path: input, encoder, core, decoder, output. A node glows when a signal reaches it, and the core warms with the traffic through it.',
    facts: 'Hover a node to trace it · click to fire it',
    camera: { height: 0, zoom: 1 },
    anchor: null,
    highlight: { kind: 'all' },
    traffic: 3,
  },
]
