# Studio Workflow

The Weaver studio walks you through six stages, in order: **Dream → Read-back → Interview → Bible → Render → Finalize**. The rail at the top shows where you are; you can always step back to an earlier stage, and your work is kept as you go.

This page covers each stage: what it's for, what to do, and what to expect next.

---

## 1. Dream

**What it's for:** this is your idea in your own words — the raw material everything else is built from.

**What to do:** open the Weaver, write a few sentences about the character, and click **Read my dream**. You don't need to be tidy or complete; you need to be _specific_.

!!! tip "Specific in, specific out"
    The single biggest lever on your result is how particular your dream is. Include the premise, the mood, the character's relationship to `{{user}}`, the genre, any constraints, and anything you _don't_ want. A thin, generic dream gives the Weaver nothing to hold onto, and the result drifts toward the average. A pointed detail — a contradiction, a fear, a specific habit — pulls the whole character toward something that's actually yours.

**What to expect:** the Weaver reads your dream and moves you to Read-back.

---

## 2. Read-back

**What it's for:** before the Weaver commits to anything, it shows you what it understood and what it still needs. This is your chance to correct a misread early, while it's cheap.

**What you'll see:**

- **From your dream** — the concrete facts the Weaver pulled out. Click the pencil on any fact to fix or sharpen it.
- **What's next** — everything still missing, sorted into what the Weaver will **ask you** about, what it will **write itself**, and the in-between (part yours, part its). Some slots only appear when your dream implies them (for example, a relationship that changes over time), tagged as **detected**.

!!! note "Why it asks about some things and writes others"
    The Weaver interviews you about the parts that make a character _specific_ — their values, the contradiction at their core, how they treat `{{user}}`. It writes the rest — like the name, physical form, and voice — itself, drawn from that core. You beat generic results by getting the core right, not by being quizzed on every field.

**What to do:** correct anything wrong, then continue to the Interview.

---

## 3. Interview

**What it's for:** this is where your specific idea actually gets pulled out. Rather than a blank box, each question offers a few sharp, divergent options to react to — which is far easier than inventing from nothing, and surfaces choices you wouldn't have thought to make.

**What you'll see:** one question at a time, framed around a single theme, with a handful of captioned options. For each, you can:

| Action | What it does |
|--------|--------------|
| **Pick** | Choose one option as your answer. |
| **Blend** | Pick two and combine them. |
| **Re-spread** | Reject the options and get a fresh set, nudged toward a direction you type. |
| **Write your own** | Skip the options and type the answer yourself. |

The progress rail shows answered, current, and upcoming questions. Expect roughly seven to ten questions, most-important first.

!!! tip "Your choices teach the Weaver your taste"
    Every time you re-spread, blend, or write your own, the Weaver learns what you tend to reach for and carries it into later questions — and into future sessions. The more you steer, the more its suggestions start to feel like yours.

**What to do:** answer the questions. If you've given it enough, you can **Finish** early — you don't have to answer all of them.

---

## 4. Bible

**What it's for:** the Weaver gathers everything — your facts, your interview answers, and the parts it writes to fit them — into one coherent character, called the Bible. This is the single source of truth every card field is later written from, which is what makes the finished fields agree with each other.

Before you go further, the Bible is checked against a quality bar that looks for the things that make characters fall flat: vagueness, internal contradictions that don't hold together, and a lack of real tension. Catching that here is the point — it's cheaper to fix the source than to polish thin output later.

**What you'll see:**

- A plain-language **brief** — the character in a paragraph, the headline you react to.
- The underlying entries, each tagged with where it came from: **Yours** (from you), **Written** (the Weaver wrote it), or **Inferred** (filled in from context).
- The **quality check** result — a pass, or a note on what's still thin.

**What to do:** read the brief. Edit anything that's off, then **re-check**, or **rebuild** to regenerate from your material. When it looks right, continue to Render. You can proceed even if the check flagged something — you hold the final say — but expect more generic fields if the source was thin.

---

## 5. Render

**What it's for:** now the card fields get written, each one **from the frozen Bible** — never from each other. That's what keeps the description, the voice, and the first message consistent. Each field is checked on its own for faithfulness to the Bible and for drifting back toward the generic.

**The fields:**

| Field | What it is |
|-------|------------|
| **Name** | Carried straight from the Bible. |
| **Description** | The load-bearing character sheet, in tagged sections. |
| **Personality** | A voice-and-speech spec — how the character actually sounds. |
| **Scenario** | The opening situation and what's at stake with `{{user}}`. |
| **First message** | The character's opening, in their own voice. |
| **Example messages** | A few sample exchanges that show range. |

**What you can do to any field:**

| Action | Result |
|--------|--------|
| **Accept** | Mark the field as signed off. |
| **Edit** | Hand-edit the text yourself; your edit is kept and tagged. |
| **Re-render** | Write the field again from the Bible. |
| **Nudge** | Re-render with a short steer ("leaner", "more guarded") — which also feeds your taste. |

!!! note "If you change the Bible later"
    Fields are written from a specific version of the Bible. If you go back and change the Bible, the affected fields are marked **stale** so you know to re-render them. Hand-edited fields are never overwritten without your say-so.

**What to do:** walk down the fields, accept the keepers, nudge the near-misses. Once every field is ready, **Continue to finalize**.

---

## 6. Finalize

**What it's for:** this writes a real character card to your library and pairs it with its governance.

Finalize follows a deliberate split: **the card carries _who_ the character is** (the fields you just rendered), and a reusable **preset carries _how_ to play them** (the deliberation and anti-pattern rules that keep any character specific and in-character). The card's own system prompt is left empty so the card stays clean and portable, and the **Lumiverse Weaver** preset — installed once and reused by every Weaver card — does the governing. The card also gets a small constant "re-anchor" so the character stays on-spine even in long chats.

**What to do:** click **Finalize**, then **Start chat** to open a fresh chat with the character and the Weaver preset already selected.

!!! note "Starting a chat later"
    "Start chat" selects the Lumiverse Weaver preset for you. If you instead open a chat with the card some other way, select the **Lumiverse Weaver** preset on your connection to get the same governance.

---

## A Typical Run

1. **Dream** your concept — be specific about the premise, mood, and what makes this character _this_ character.
2. **Read-back:** fix anything the Weaver misread.
3. **Interview:** answer the questions, steering with re-spread or your own answers; finish when it has enough.
4. **Bible:** read the brief, tighten anything off, pass the check.
5. **Render:** accept the fields you like, nudge the rest.
6. **Finalize**, then **Start chat**.
7. Optionally, open the [Visual Studio](visual-studio.md) to generate a portrait.
