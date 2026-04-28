import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { MultiIndustryPicker } from './MultiIndustryPicker'

function Harness({
  initial = [],
  max,
  onChangeSpy,
}: {
  initial?: string[]
  max?: number
  onChangeSpy?: (v: string[]) => void
}) {
  const [value, setValue] = useState<string[]>(initial)
  return (
    <MultiIndustryPicker
      value={value}
      onChange={(next) => {
        setValue(next)
        onChangeSpy?.(next)
      }}
      max={max}
    />
  )
}

describe('MultiIndustryPicker', () => {
  it('renders empty state with placeholder', () => {
    render(<Harness />)
    expect(
      screen.getByPlaceholderText(/select all industries/i)
    ).toBeInTheDocument()
  })

  it('shows the dropdown when input has focus and is empty', () => {
    render(<Harness />)
    // Initial render: query empty + no chips → dropdown visible by design
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Mining/i })).toBeInTheDocument()
  })

  it('adds a chip when an option is clicked and clears the input', () => {
    const spy = vi.fn()
    render(<Harness onChangeSpy={spy} />)
    fireEvent.mouseDown(screen.getByRole('option', { name: /Plastics & Chemicals/i }))
    fireEvent.click(screen.getByRole('option', { name: /Plastics & Chemicals/i }))
    expect(spy).toHaveBeenLastCalledWith(['Plastics & Chemicals'])
    expect(
      screen.getByRole('listitem', { name: undefined })
    ).toHaveTextContent('Plastics & Chemicals')
  })

  it('removes a chip via its remove button', () => {
    const spy = vi.fn()
    render(<Harness initial={['Mining']} onChangeSpy={spy} />)
    const removeBtn = screen.getByRole('button', { name: /Remove Mining/i })
    fireEvent.click(removeBtn)
    expect(spy).toHaveBeenLastCalledWith([])
  })

  it('removes the last chip on Backspace when input is empty', () => {
    const spy = vi.fn()
    render(<Harness initial={['Mining', 'Plastics & Chemicals']} onChangeSpy={spy} />)
    const input = screen.getByRole('combobox')
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(spy).toHaveBeenLastCalledWith(['Mining'])
  })

  it('enforces the cap and shows the limit message at the boundary', () => {
    const spy = vi.fn()
    render(<Harness max={2} initial={['Mining', 'Plastics & Chemicals']} onChangeSpy={spy} />)
    expect(
      screen.getByText(/Maximum 2 industries selected/i)
    ).toBeInTheDocument()
    // Combobox is removed at cap
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('hides already-selected items from the dropdown', () => {
    render(<Harness initial={['Mining']} />)
    // With chips present, dropdown is hidden until the user types — focus the
    // combobox and type a single space-equivalent character to make the
    // listbox render so we can assert on its contents.
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'M' } })
    const options = screen
      .getAllByRole('option')
      .map((el) => el.textContent ?? '')
    expect(options.some((t) => /^Mining/.test(t))).toBe(false)
    expect(options.some((t) => /Manufacturing/.test(t))).toBe(true)
  })

  it('filter is case-insensitive', () => {
    render(<Harness />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'MIN' } })
    const options = screen
      .getAllByRole('option')
      .map((el) => el.textContent ?? '')
    expect(options.length).toBeGreaterThan(0)
    expect(options.every((t) => /min/i.test(t))).toBe(true)
  })

  it('Enter on the input adds the first match', () => {
    const spy = vi.fn()
    render(<Harness onChangeSpy={spy} />)
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'plastics' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // Whatever the first option is for "plastics" — assert *something* added
    expect(spy).toHaveBeenCalled()
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0] as string[]
    expect(lastCall).toHaveLength(1)
    expect(lastCall[0]).toMatch(/plastics/i)
  })

  it('"Other" option opens a free-text input that produces an other:<slug> value', () => {
    const spy = vi.fn()
    render(<Harness onChangeSpy={spy} />)
    fireEvent.mouseDown(screen.getByRole('option', { name: /^Other$/i }))
    fireEvent.click(screen.getByRole('option', { name: /^Other$/i }))
    const otherInput = screen.getByLabelText(/Other industry/i)
    fireEvent.change(otherInput, { target: { value: 'Marine Logistics' } })
    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }))
    expect(spy).toHaveBeenLastCalledWith(['other:marine-logistics'])
    // Chip renders the humanised label
    expect(
      screen.getByRole('listitem')
    ).toHaveTextContent('Marine Logistics')
  })
})
