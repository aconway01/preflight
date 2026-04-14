// ── RouteSchematic (D3 Pattern 2) ─────────────────────────────
//
// D3 owns the SVG. React provides a container div and an svg ref.
// Redraws on legs change or container resize via ResizeObserver.
//
// Layers (bottom → top):
//   .layer-lines      — connecting lines between airport nodes
//   .layer-waypoints  — intermediate waypoint dots
//   .layer-nodes      — airport circles with verdict color
//   .layer-labels     — identifier text below each node
//
// Node keys:
//   Each airport occurrence gets a unique key based on its position
//   in the ordered sequence: 'node-0', 'node-1', ... 'node-N'.
//   This ensures duplicate airports (e.g. circuit KIAD→KOKV→KIAD)
//   are treated as separate D3 elements and can be selected independently.
//
// Props:
//   legs:          LegState[]       — from useLegState
//   selectedNode:  string | null    — unique node key, e.g. 'node-0'
//   onSelectNode:  (key: string) => void
//   onSelectLeg:   (legId: string) => void

import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const NODE_R        = 16
const WPT_R         = 5
const SVG_HEIGHT    = 80
const H_PADDING     = 40
const LINE_Y        = SVG_HEIGHT / 2 - 4
const LABEL_OFFSET  = NODE_R + 14

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Returns:
//   airports: { key, stationId, legIndex, role }[]  — ordered left→right
//   waypoints: { key, stationId, legIndex, wptIndex }[]
//
// key is a unique positional identifier ('node-0', 'node-1', ...; 'wpt-0-0', ...).
// stationId is the human-readable ICAO code shown in labels.
// legIndex: for arrival nodes = the leg they terminate; for departure node = 0.
function deriveDisplayNodes(legs) {
  if (!legs?.length) return { airports: [], waypoints: [] }

  const airports  = []
  const waypoints = []
  let   nodeIdx   = 0

  // Departure node of leg 0
  airports.push({
    key:       `node-${nodeIdx++}`,
    stationId: legs[0].departure,
    legIndex:  0,
    role:      'dep',
  })

  for (let li = 0; li < legs.length; li++) {
    const leg = legs[li]

    // Waypoints for this leg
    leg.waypoints.forEach((wpt, wi) => {
      waypoints.push({
        key:      `wpt-${li}-${wi}`,
        stationId: wpt,
        legIndex: li,
        wptIndex: wi,
      })
    })

    // Arrival node — gets its own unique key even if stationId repeats
    airports.push({
      key:       `node-${nodeIdx++}`,
      stationId: leg.destination,
      legIndex:  li,
      role:      'arr',
    })
  }

  return { airports, waypoints }
}

// Pick fill color based on leg status.
function nodeColor(leg, isSelected) {
  if (!leg) return getCssVar('--color-text-muted')
  if (leg.status === 'fetching') return getCssVar('--color-text-muted')
  if (leg.status === 'error')    return getCssVar('--color-hazard')
  if (leg.status === 'ready') {
    if (isSelected) return getCssVar('--color-brand-gold')
    return getCssVar('--color-within')
  }
  return getCssVar('--color-text-muted')
}

export default function RouteSchematic({
  legs = [],
  selectedNode = null,
  onSelectNode,
  onSelectLeg,
}) {
  const containerRef = useRef(null)
  const svgRef       = useRef(null)
  const drawRef      = useRef(null)
  const pulseRef     = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const svgEl     = svgRef.current
    if (!container || !svgEl) return

    function draw(width) {
      const svg = d3.select(svgEl)
      svg.attr('width', width).attr('height', SVG_HEIGHT)

      const { airports, waypoints } = deriveDisplayNodes(legs)
      if (!airports.length) {
        svg.selectAll('*').remove()
        return
      }

      const usableW   = width - H_PADDING * 2
      const airportXs = airports.map((_, i) =>
        airports.length === 1
          ? width / 2
          : H_PADDING + i * (usableW / (airports.length - 1))
      )

      const colorBorder = getCssVar('--color-border')
      const colorMuted  = getCssVar('--color-text-muted')
      const colorGold   = getCssVar('--color-brand-gold')
      const colorText   = getCssVar('--color-text-primary')

      // Ensure layer groups exist in correct z-order
      if (svg.select('.layer-lines').empty())     svg.append('g').attr('class', 'layer-lines')
      if (svg.select('.layer-waypoints').empty()) svg.append('g').attr('class', 'layer-waypoints')
      if (svg.select('.layer-nodes').empty())     svg.append('g').attr('class', 'layer-nodes')
      if (svg.select('.layer-labels').empty())    svg.append('g').attr('class', 'layer-labels')

      const layerLines  = svg.select('.layer-lines')
      const layerWpts   = svg.select('.layer-waypoints')
      const layerNodes  = svg.select('.layer-nodes')
      const layerLabels = svg.select('.layer-labels')

      // ── Lines — one per leg, connecting sequential airport positions ──
      const lineData = legs.map((leg, i) => ({
        x1:       airportXs[i],
        x2:       airportXs[i + 1],
        leg,
        legIndex: i,
      }))

      const lines = layerLines.selectAll('line.leg-line')
        .data(lineData, (_, i) => i)

      lines.enter()
        .append('line')
        .attr('class', 'leg-line')
        .attr('y1', LINE_Y).attr('y2', LINE_Y)
        .attr('stroke', colorBorder).attr('stroke-width', 2)
        .attr('cursor', 'pointer')
        .on('click', (_, d) => onSelectLeg?.(d.leg.id))
        .merge(lines)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('x1', d => d.x1).attr('x2', d => d.x2)

      lines.exit().remove()

      // Wide invisible hit target
      const lineHits = layerLines.selectAll('line.leg-hit')
        .data(lineData, (_, i) => i)

      lineHits.enter()
        .append('line')
        .attr('class', 'leg-hit')
        .attr('y1', LINE_Y).attr('y2', LINE_Y)
        .attr('stroke', 'transparent').attr('stroke-width', 24)
        .attr('cursor', 'pointer')
        .on('click', (_, d) => onSelectLeg?.(d.leg.id))
        .merge(lineHits)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('x1', d => d.x1).attr('x2', d => d.x2)

      lineHits.exit().remove()

      // ── Waypoints ──
      const wptData = waypoints.map(n => {
        const x1 = airportXs[n.legIndex]     ?? H_PADDING
        const x2 = airportXs[n.legIndex + 1] ?? width - H_PADDING
        const wptCount = legs[n.legIndex]?.waypoints?.length ?? 1
        const t  = (n.wptIndex + 1) / (wptCount + 1)
        return { ...n, x: x1 + t * (x2 - x1) }
      })

      const wpts = layerWpts.selectAll('circle.wpt')
        .data(wptData, d => d.key)

      wpts.enter()
        .append('circle')
        .attr('class', 'wpt')
        .attr('cy', LINE_Y).attr('r', WPT_R)
        .attr('fill', colorBorder).attr('stroke', 'none')
        .merge(wpts)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('cx', d => d.x)

      wpts.exit().remove()

      // ── Airport nodes ──
      const nodeData = airports.map((n, i) => ({
        ...n,
        x:        airportXs[i],
        leg:      legs[n.legIndex] ?? null,
        selected: selectedNode === n.key,
      }))

      const nodes = layerNodes.selectAll('circle.airport-node')
        .data(nodeData, d => d.key)

      nodes.enter()
        .append('circle')
        .attr('class', d => `airport-node${(d.leg?.status === 'fetching') ? ' node-fetching' : ''}`)
        .attr('cy', LINE_Y).attr('r', NODE_R)
        .attr('stroke-width', 2).attr('cursor', 'pointer')
        .on('click', (_, d) => onSelectNode?.(d.key))
        .merge(nodes)
        .attr('class', d => `airport-node${(d.leg?.status === 'fetching') ? ' node-fetching' : ''}`)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('cx', d => d.x)
        .attr('fill',   d => nodeColor(d.leg, d.selected))
        .attr('stroke', d => d.selected ? colorGold : colorBorder)

      nodes.exit().remove()

      // ── Labels ──
      const labels = layerLabels.selectAll('text.node-label')
        .data(nodeData, d => d.key)

      labels.enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('y', LINE_Y + LABEL_OFFSET)
        .attr('text-anchor', 'middle')
        .attr('font-family', getCssVar('--font-sans'))
        .attr('font-size', '11px')
        .attr('cursor', 'pointer')
        .on('click', (_, d) => onSelectNode?.(d.key))
        .merge(labels)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('x',    d => d.x)
        .attr('fill', d => d.selected ? colorGold : colorText)
        .text(d => d.stationId)

      labels.exit().remove()
    }

    drawRef.current = draw
    draw(container.clientWidth || 320)

    // Pulse animation for fetching nodes
    clearInterval(pulseRef.current)
    pulseRef.current = setInterval(() => {
      const svg = d3.select(svgEl)
      const hasFetching = legs.some(l => l.status === 'fetching')
      if (!hasFetching) return
      const colorMuted = getCssVar('--color-text-muted')
      const colorGold  = getCssVar('--color-brand-gold')
      svg.selectAll('circle.node-fetching')
        .transition().duration(500).ease(d3.easeSinInOut)
        .attr('fill', function() {
          return d3.select(this).attr('fill') === colorGold ? colorMuted : colorGold
        })
    }, 600)

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) drawRef.current?.(entry.contentRect.width)
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      clearInterval(pulseRef.current)
    }
  }, [legs, selectedNode, onSelectNode, onSelectLeg])

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg ref={svgRef} style={{ display: 'block', overflow: 'visible' }} />
    </div>
  )
}
