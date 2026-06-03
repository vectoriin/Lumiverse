# Weaver

The Weaver turns an idea into a finished character card. Instead of asking a model to write a whole character from one short prompt, it **interviews you** about your idea, gathers everything into a single coherent character "Bible," checks that Bible against a quality bar, and only then writes the card fields — one at a time, each drawn from the same source. When you're happy, **Finalize** writes a real card to your library and pairs it with a governance preset that keeps the character in character during chats.

The Weaver is best when you have an idea in your head but writing every field by hand would be slow, or when one-shot "make me a character" tools keep handing you the same generic result.

---

## Why It Works This Way

Most character generators do the same thing: you type a prompt, the model writes the whole card in one shot. The problem is that a short prompt is a near-empty space, and a model fills empty space with its **most average** guess — the same handful of names, the same tropes, the same beats, no matter how many times you reroll. Turning up the temperature or writing a cleverer prompt doesn't fix it, because the result is being pulled toward the middle of everything the model has ever seen.

The Weaver is built on the opposite idea: **the hard part isn't writing the character — models write fluently — it's getting your specific idea out of your head and refusing to let it get averaged away.** So the Weaver spends its effort up front, eliciting the particular, original details that make the character _yours_, locking them into one source of truth, and writing every field from that source. Generation is the easy last step.

Three principles fall out of that:

- **Elicit before you generate.** The interview pulls out specifics — the contradiction at the character's core, what they want, how they treat you — that a prompt alone would never surface.
- **One source, then render from it.** Everything you decide is gathered into a single gated Bible. Each card field is written from that Bible, so the description, the voice, and the first message all agree with each other.
- **A quality bar with teeth.** The Bible is checked for genericness, coherence, and tension _before_ any field is written, so you're not polishing output that was thin to begin with.

---

## When to Use the Weaver

Use the Weaver when you want to:

1. Turn an idea into a complete character card
2. Get a character that's specific and yours, not a reroll of the same tropes
3. Get help writing the parts of a card that are hard to phrase
4. Shape a character through choices instead of a blank page

It works best when you know roughly what you want but need help turning it into a finished, coherent card.

---

## When Not to Use It

Use the regular **Character Browser** when you already know the exact edits you want.

| Situation | Better Tool |
|-----------|-------------|
| You only need to fix a typo | Character editor |
| You already know the exact field text | Character editor |
| You're importing a finished card | Character import |
| You don't want generated suggestions | Character editor |

You can always edit Weaver output later in the regular character editor.

---

## The Stages

The Weaver is a sequence of stages. You move forward through them, and you can step back to an earlier one at any time. The rail along the top shows where you are.

| Stage | What happens |
|-------|--------------|
| **Dream** | You describe your idea in your own words. |
| **Read-back** | The Weaver tells you what it understood and what it still needs, so you can correct it before it commits. |
| **Interview** | One sharp question at a time pulls the specifics out of your idea. |
| **Bible** | Everything is gathered into one coherent character, checked against a quality bar. |
| **Render** | Each card field is written from the Bible, and you accept, edit, or re-render each one. |
| **Finalize** | A real card is written to your library and paired with the Weaver preset. |

After finalizing, the **Visual Studio** can generate a portrait for the card.

---

## Quick Links

| Guide | What You'll Learn |
|-------|-------------------|
| [Studio Workflow](studio-workflow.md) | Every stage in order — what each step is for, what to do, and what to expect. |
| [Visual Studio](visual-studio.md) | Generate a portrait for your card, and what each image provider supports. |
