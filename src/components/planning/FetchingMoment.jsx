// ── FetchingMoment ────────────────────────────────────────────
//
// Shown while per-leg weather data is being fetched.
// Displays a horizontal node chain — one node per leg endpoint —
// with a pulsing animation on nodes that are still loading.
//
// Props:
//   routeLegs: { from, to, waypoints }[]  — leg definitions
//   onBack: () => void                    — abort and return to route entry

import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

// Derive the ordered list of node labels from routeLegs.
// e.g. [{from:'KIAD',to:'KOKV'}] → ['KIAD','KOKV']
function deriveNodes(routeLegs) {
  if (!routeLegs?.length) return []
  const nodes = [routeLegs[0].from]
  for (const leg of routeLegs) nodes.push(leg.to)
  return nodes
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

const NODE_R      = 10
const H_PADDING   = 32
const SVG_HEIGHT  = 64
const LINE_Y      = SVG_HEIGHT / 2

export default function FetchingMoment({ routeLegs = [], onBack }) {
  const svgRef    = useRef(null)
  const frameRef  = useRef(null)

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const nodes = deriveNodes(routeLegs)
    if (!nodes.length) return

    const width = svgRef.current.clientWidth || 320

    const usableWidth = width - H_PADDING * 2
    const spacing     = nodes.length > 1 ? usableWidth / (nodes.length - 1) : 0
    const xs          = nodes.map((_, i) =>
      nodes.length === 1
        ? width / 2
        : H_PADDING + i * spacing
    )

    const colorMuted  = getCssVar('--color-text-muted')
    const colorBorder = getCssVar('--color-border')
    const colorGold   = getCssVar('--color-brand-gold')
    const colorText   = getCssVar('--color-text-primary')

    svg.selectAll('*').remove()

    // Lines between nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      svg.append('line')
        .attr('x1', xs[i])
        .attr('y1', LINE_Y)
        .attr('x2', xs[i + 1])
        .attr('y2', LINE_Y)
        .attr('stroke', colorBorder)
        .attr('stroke-width', 2)
    }

    // Node circles
    svg.selectAll('circle.node')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('class', 'node node-fetching')
      .attr('cx', (_, i) => xs[i])
      .attr('cy', LINE_Y)
      .attr('r',  NODE_R)
      .attr('fill', colorMuted)
      .attr('stroke', colorBorder)
      .attr('stroke-width', 2)

    // Labels below nodes
    svg.selectAll('text.node-label')
      .data(nodes)
      .enter()
      .append('text')
      .attr('class', 'node-label')
      .attr('x', (_, i) => xs[i])
      .attr('y', LINE_Y + NODE_R + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', colorText)
      .attr('font-family', getCssVar('--font-sans'))
      .attr('font-size', '11px')
      .text(d => d)

    // Pulse animation — alternating opacity on circles
    let tick = 0
    function pulse() {
      tick++
      svg.selectAll('circle.node-fetching')
        .transition()
        .duration(600)
        .ease(d3.easeSinInOut)
        .attr('fill', (_, i) => {
          const phase = (tick + i) % 3
          if (phase === 0) return colorGold
          if (phase === 1) return colorMuted
          return colorBorder
        })
    }

    frameRef.current = setInterval(pulse, 700)
    return () => clearInterval(frameRef.current)
  }, [routeLegs])

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '48px 24px 24px' }}
    >
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        style={{
          background:    'none',
          border:        'none',
          cursor:        'pointer',
          color:         'var(--color-text-muted)',
          fontFamily:    'var(--font-sans)',
          fontSize:      'var(--text-label)',
          padding:       '0 0 32px',
          textAlign:     'left',
          alignSelf:     'flex-start',
        }}
      >
        ← Back
      </button>

      {/* Route schematic */}
      <svg
        ref={svgRef}
        width="100%"
        height={SVG_HEIGHT}
        style={{ display: 'block', overflow: 'visible' }}
      />

      {/* Status label */}
      <p style={{
        marginTop:  '32px',
        fontFamily: 'var(--font-sans)',
        fontSize:   'var(--text-label)',
        color:      'var(--color-text-muted)',
        textAlign:  'center',
      }}>
        Fetching weather briefing…
      </p>
    </div>
  )
}
