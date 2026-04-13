// ── RouteSchematic (D3 Pattern 2) ─────────────────────────────
//
// D3 owns the SVG. React provides a <div> container and a <svg> ref.
// Redraws on legs change or container resize via ResizeObserver.
//
// Layers (bottom → top):
//   .layer-lines      — connecting lines between nodes
//   .layer-waypoints  — intermediate waypoint dots
//   .layer-nodes      — airport circles with verdict color
//   .layer-labels     — identifier text below each node
//
// Node verdict colors:
//   'ready'    → --color-within (green) if weather ok, --color-marginal, --color-below, --color-hazard
//   'fetching' → pulsing --color-text-muted
//   'idle'/'error' → --color-text-muted
//
// Props:
//   legs:          LegState[]       — from useLegState
//   selectedNode:  string | null    — currently selected airport id
//   onSelectNode:  (id) => void
//   onSelectLeg:   (legId) => void

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

// Derive display nodes from legs
// Returns [{ id, type:'airport'|'waypoint', legIndex, wptIndex? }]
function deriveDisplayNodes(legs) {
  if (!legs?.length) return []
  const nodes = [{ id: legs[0].departure, type: 'airport' }]
  for (let li = 0; li < legs.length; li++) {
    const leg = legs[li]
    leg.waypoints.forEach((wpt, wi) => {
      nodes.push({ id: wpt, type: 'waypoint', legIndex: li, wptIndex: wi })
    })
    nodes.push({ id: leg.destination, type: 'airport', legIndex: li })
  }
  return nodes
}

// Map leg status to fill color
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

      const displayNodes = deriveDisplayNodes(legs)
      const airports     = displayNodes.filter(n => n.type === 'airport')
      const waypoints    = displayNodes.filter(n => n.type === 'waypoint')

      const usableW = width - H_PADDING * 2
      const airportXs = airports.map((_, i) =>
        airports.length === 1
          ? width / 2
          : H_PADDING + i * (usableW / (airports.length - 1))
      )

      // Map airport id to x position
      const airportXMap = {}
      airports.forEach((n, i) => { airportXMap[n.id] = airportXs[i] })

      // Compute waypoint x positions — interpolated between surrounding airports
      // For each waypoint, find its leg's from/to airports
      const wptXMap = {}
      waypoints.forEach(n => {
        const leg = legs[n.legIndex]
        if (!leg) return
        const x1 = airportXMap[leg.departure]    ?? H_PADDING
        const x2 = airportXMap[leg.destination]  ?? width - H_PADDING
        const wptCount = leg.waypoints.length
        const t = (n.wptIndex + 1) / (wptCount + 1)
        wptXMap[n.id] = x1 + t * (x2 - x1)
      })

      const colorBorder   = getCssVar('--color-border')
      const colorMuted    = getCssVar('--color-text-muted')
      const colorText     = getCssVar('--color-text-primary')
      const colorSelected = getCssVar('--color-brand-gold')

      // Ensure layer groups exist in correct z-order
      if (svg.select('.layer-lines').empty())     svg.append('g').attr('class', 'layer-lines')
      if (svg.select('.layer-waypoints').empty()) svg.append('g').attr('class', 'layer-waypoints')
      if (svg.select('.layer-nodes').empty())     svg.append('g').attr('class', 'layer-nodes')
      if (svg.select('.layer-labels').empty())    svg.append('g').attr('class', 'layer-labels')

      const layerLines = svg.select('.layer-lines')
      const layerWpts  = svg.select('.layer-waypoints')
      const layerNodes = svg.select('.layer-nodes')
      const layerLabels = svg.select('.layer-labels')

      // ── Lines ──
      const lineData = legs.map((leg, i) => ({
        x1: airportXMap[leg.departure]   ?? H_PADDING,
        x2: airportXMap[leg.destination] ?? width - H_PADDING,
        leg,
        legIndex: i,
      }))

      const lines = layerLines.selectAll('line.leg-line')
        .data(lineData, (_, i) => i)

      lines.enter()
        .append('line')
        .attr('class', 'leg-line')
        .attr('y1', LINE_Y)
        .attr('y2', LINE_Y)
        .attr('stroke', colorBorder)
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer')
        .on('click', (_, d) => onSelectLeg?.(d.leg.id))
        .merge(lines)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('x1', d => d.x1)
        .attr('x2', d => d.x2)

      lines.exit().remove()

      // Wide invisible hit target for leg tap
      const lineHits = layerLines.selectAll('line.leg-hit')
        .data(lineData, (_, i) => i)

      lineHits.enter()
        .append('line')
        .attr('class', 'leg-hit')
        .attr('y1', LINE_Y)
        .attr('y2', LINE_Y)
        .attr('stroke', 'transparent')
        .attr('stroke-width', 24)
        .attr('cursor', 'pointer')
        .on('click', (_, d) => onSelectLeg?.(d.leg.id))
        .merge(lineHits)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('x1', d => d.x1)
        .attr('x2', d => d.x2)

      lineHits.exit().remove()

      // ── Waypoint dots ──
      const wptData = waypoints.map(n => ({ ...n, x: wptXMap[n.id] ?? H_PADDING }))

      const wpts = layerWpts.selectAll('circle.wpt')
        .data(wptData, d => `${d.legIndex}-${d.wptIndex}`)

      wpts.enter()
        .append('circle')
        .attr('class', 'wpt')
        .attr('cy', LINE_Y)
        .attr('r', WPT_R)
        .attr('fill', colorBorder)
        .attr('stroke', 'none')
        .merge(wpts)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('cx', d => d.x)

      wpts.exit().remove()

      // ── Airport nodes ──
      const nodeData = airports.map((n, i) => {
        // Departure node belongs to legs[0], destination of leg i belongs to legs[i]
        const legForNode = n.legIndex != null ? legs[n.legIndex] : legs[0]
        return {
          ...n,
          x:    airportXs[i],
          leg:  legForNode,
          selected: selectedNode === n.id,
        }
      })

      const nodes = layerNodes.selectAll('circle.airport-node')
        .data(nodeData, d => d.id)

      nodes.enter()
        .append('circle')
        .attr('class', d => `airport-node${d.leg?.status === 'fetching' ? ' node-fetching' : ''}`)
        .attr('cy', LINE_Y)
        .attr('r', NODE_R)
        .attr('stroke-width', 2)
        .attr('cursor', 'pointer')
        .on('click', (_, d) => onSelectNode?.(d.id))
        .merge(nodes)
        .attr('class', d => `airport-node${d.leg?.status === 'fetching' ? ' node-fetching' : ''}`)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('cx', d => d.x)
        .attr('fill', d => nodeColor(d.leg, d.selected))
        .attr('stroke', d => d.selected ? colorSelected : colorBorder)

      nodes.exit().remove()

      // ── Labels ──
      const labels = layerLabels.selectAll('text.node-label')
        .data(nodeData, d => d.id)

      labels.enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('y', LINE_Y + LABEL_OFFSET)
        .attr('text-anchor', 'middle')
        .attr('font-family', getCssVar('--font-sans'))
        .attr('font-size', '11px')
        .attr('cursor', 'pointer')
        .on('click', (_, d) => onSelectNode?.(d.id))
        .merge(labels)
        .transition().duration(300).ease(d3.easeQuadOut)
        .attr('x', d => d.x)
        .attr('fill', d => d.selected ? colorSelected : colorText)
        .text(d => d.id)

      labels.exit().remove()
    }

    drawRef.current = draw

    // Initial draw
    draw(container.clientWidth || 320)

    // Pulse for fetching nodes
    clearInterval(pulseRef.current)
    pulseRef.current = setInterval(() => {
      const svg = d3.select(svgEl)
      const hasFetching = legs.some(l => l.status === 'fetching')
      if (!hasFetching) return
      const colorMuted = getCssVar('--color-text-muted')
      const colorGold  = getCssVar('--color-brand-gold')
      svg.selectAll('circle.node-fetching')
        .transition()
        .duration(500)
        .ease(d3.easeSinInOut)
        .attr('fill', function() {
          const cur = d3.select(this).attr('fill')
          return cur === colorGold ? colorMuted : colorGold
        })
    }, 600)

    // ResizeObserver
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        drawRef.current?.(entry.contentRect.width)
      }
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
