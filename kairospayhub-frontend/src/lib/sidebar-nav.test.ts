import { describe, expect, it } from 'vitest'
import { isSidebarNavItemActive } from '@/lib/sidebar-nav'

describe('isSidebarNavItemActive', () => {
  it('highlights roster units on list and unit detail routes', () => {
    expect(isSidebarNavItemActive('/roster', { to: 'roster', end: true })).toBe(true)
    expect(
      isSidebarNavItemActive('/roster/units/93f6f837-e455-4398-864d-b74c46425330', {
        to: 'roster',
        end: true,
      }),
    ).toBe(true)
  })

  it('does not highlight roster units on membership routes', () => {
    expect(isSidebarNavItemActive('/roster/membership', { to: 'roster', end: true })).toBe(false)
  })

  it('highlights membership on roster and legacy membership routes', () => {
    expect(isSidebarNavItemActive('/roster/membership', { to: 'roster/membership', end: true })).toBe(
      true,
    )
    expect(isSidebarNavItemActive('/membership', { to: 'roster/membership', end: true })).toBe(true)
  })

  it('highlights givings campaigns on list and campaign detail routes', () => {
    expect(isSidebarNavItemActive('/givings', { to: 'givings', end: true })).toBe(true)
    expect(isSidebarNavItemActive('/givings/8570f394-e2d3-46f9-972c-e169058d8238', { to: 'givings', end: true })).toBe(
      true,
    )
    expect(
      isSidebarNavItemActive('/givings/8570f394-e2d3-46f9-972c-e169058d8238/structure/cell-1', {
        to: 'givings',
        end: true,
      }),
    ).toBe(true)
    expect(isSidebarNavItemActive('/givings/overall', { to: 'givings', end: true })).toBe(false)
    expect(isSidebarNavItemActive('/givings/transactions', { to: 'givings', end: true })).toBe(false)
  })

  it('highlights transactions on its route only', () => {
    expect(
      isSidebarNavItemActive('/givings/transactions', { to: 'givings/transactions', end: true }),
    ).toBe(true)
    expect(isSidebarNavItemActive('/givings', { to: 'givings/transactions', end: true })).toBe(false)
  })

  it('highlights overall givings on its route only', () => {
    expect(isSidebarNavItemActive('/givings/overall', { to: 'givings/overall', end: true })).toBe(
      true,
    )
    expect(isSidebarNavItemActive('/givings', { to: 'givings/overall', end: true })).toBe(false)
  })

  it('highlights settings on any settings sub-route', () => {
    expect(isSidebarNavItemActive('/settings', { to: 'settings' })).toBe(true)
    expect(isSidebarNavItemActive('/settings/branding', { to: 'settings' })).toBe(true)
    expect(isSidebarNavItemActive('/settings/account', { to: 'settings' })).toBe(true)
    expect(isSidebarNavItemActive('/settings/administrators', { to: 'settings' })).toBe(true)
    expect(isSidebarNavItemActive('/givings', { to: 'settings' })).toBe(false)
  })

  it('uses exact matching for overview', () => {
    expect(isSidebarNavItemActive('/', { to: '.', end: true })).toBe(true)
    expect(isSidebarNavItemActive('/givings', { to: '.', end: true })).toBe(false)
  })

  it('highlights events only on /events', () => {
    expect(isSidebarNavItemActive('/events', { to: 'events', end: true })).toBe(true)
    expect(isSidebarNavItemActive('/roster', { to: 'events', end: true })).toBe(false)
  })

  it('highlights attendance approvals and overview on their routes only', () => {
    expect(
      isSidebarNavItemActive('/attendance/approvals', { to: 'attendance/approvals', end: true }),
    ).toBe(true)
    expect(
      isSidebarNavItemActive('/attendance/overview', { to: 'attendance/overview', end: true }),
    ).toBe(true)
    expect(isSidebarNavItemActive('/attendance/submissions', { to: 'attendance', end: true })).toBe(
      false,
    )
    expect(isSidebarNavItemActive('/attendance/approvals', { to: 'attendance/overview', end: true })).toBe(
      false,
    )
  })
})
