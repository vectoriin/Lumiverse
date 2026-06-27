import { describe, expect, test } from 'bun:test'
import { formatRawPromptText } from './formatRawPrompt'

describe('formatRawPromptText', () => {
  test('includes per-message reasoning when present', () => {
    const text = formatRawPromptText({
      messages: [
        {
          role: 'assistant',
          content: 'Visible reply',
          reasoning: 'Hidden reasoning',
        },
      ],
    })

    expect(text).toContain('### [1] ASSISTANT')
    expect(text).toContain('Visible reply')
    expect(text).toContain('--- REASONING ---\nHidden reasoning')
  })

  test('omits the reasoning section when the message has none', () => {
    const text = formatRawPromptText({
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    })

    expect(text).toBe('### [1] USER\n\nHello')
  })
})
