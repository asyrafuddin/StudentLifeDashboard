/**
 * Test setup. Component tests opt into a simulated browser (jsdom) with a
 * `// @vitest-environment jsdom` comment; pure logic tests run in plain Node.
 */
import { afterEach } from 'vitest'

if (typeof window !== 'undefined') {
  // Adds matchers like expect(element).toBeInTheDocument().
  await import('@testing-library/jest-dom/vitest')
  const { cleanup, configure } = await import('@testing-library/react')
  afterEach(() => cleanup())
  // "findBy…" waits up to 1 s by default; allow more when the whole suite runs at once.
  configure({ asyncUtilTimeout: 3000 })

  // jsdom lacks a few browser APIs that Radix UI (dialogs, menus) relies on.
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
