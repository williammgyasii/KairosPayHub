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

  it('uses exact matching for overview and settings', () => {
    expect(isSidebarNavItemActive('/', { to: '.', end: true })).toBe(true)
    expect(isSidebarNavItemActive('/givings', { to: '.', end: true })).toBe(false)
    expect(isSidebarNavItemActive('/settings', { to: 'settings', end: true })).toBe(true)
    expect(isSidebarNavItemActive('/settings/profile', { to: 'settings', end: true })).toBe(false)
  })
})
