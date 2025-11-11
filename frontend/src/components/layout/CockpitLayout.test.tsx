import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CockpitColumn,
  CockpitHeaderZone,
  CockpitLayout,
  CockpitMainArea,
  CockpitRosterSection,
  CockpitSpotlightSection,
  CockpitTelemetryRail,
} from './CockpitLayout'

describe('CockpitLayout', () => {
  it('spans header across all columns and orders sections responsively', () => {
    const { getByTestId } = render(
      <CockpitLayout data-testid="layout">
        <CockpitHeaderZone data-testid="header">
          <CockpitTelemetryRail data-testid="telemetry">
            <div>Mock Panel</div>
          </CockpitTelemetryRail>
        </CockpitHeaderZone>
        <CockpitColumn data-testid="left" position="left">
          <CockpitSpotlightSection data-testid="spotlight">
            Spotlight
          </CockpitSpotlightSection>
          <CockpitRosterSection data-testid="roster">
            Roster
          </CockpitRosterSection>
        </CockpitColumn>
        <CockpitColumn data-testid="center" position="center">
          <CockpitMainArea data-testid="main">Main</CockpitMainArea>
        </CockpitColumn>
      </CockpitLayout>
    )

    const layoutGrid = getByTestId('layout').firstElementChild as HTMLElement

    expect(layoutGrid.className).toContain(
      'lg:grid-cols-[320px_minmax(0,1fr)]'
    )
    expect(getByTestId('header').className).toContain('lg:col-span-full')
    expect(getByTestId('left').className).toContain('order-2')
    expect(getByTestId('center').className).toContain('order-3')
    expect(getByTestId('spotlight').className).toContain('rounded-lg')
    expect(getByTestId('roster').className).toContain('flex-1')
    expect(getByTestId('telemetry').className).toContain('sm:grid-cols-2')
  })

  it('supports reserving a right rail', () => {
    const { getByTestId } = render(
      <CockpitLayout data-testid="layout" hasRightRail>
        <CockpitHeaderZone data-testid="header">Header</CockpitHeaderZone>
        <CockpitColumn data-testid="left" position="left">
          <div>Left</div>
        </CockpitColumn>
        <CockpitColumn data-testid="center" position="center">
          <CockpitMainArea>Main</CockpitMainArea>
        </CockpitColumn>
        <CockpitColumn data-testid="right" position="right">
          <div>Right</div>
        </CockpitColumn>
      </CockpitLayout>
    )

    const layoutGrid = getByTestId('layout').firstElementChild as HTMLElement

    expect(layoutGrid.className).toContain(
      'lg:grid-cols-[320px_minmax(0,1fr)_280px]'
    )
    expect(getByTestId('right').className).toContain('order-4')
  })
})
