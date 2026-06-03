# Visual Studio

Once a card has taken shape, the **Visual Studio** generates a portrait for it. It runs through your existing **image-gen connections** — the same ones the [Image Generation](../image-generation/index.md) feature uses — so any provider you've already set up is available here, with no extra configuration.

Portraits are generated at a tall 2:3 aspect ratio (832 × 1216) suited to character art. You generate as many candidates as you like, then promote the one you want to the character's avatar.

---

## How It Works

1. Pick an **image-gen connection** — the provider on that connection decides what controls you get.
2. Write a **prompt** (and optional negative prompt), or use **Suggest Tags** to draft one from the character.
3. Adjust **size**, **seed**, and any provider-specific controls.
4. **Generate.** Progress streams in, and finished images appear as candidates.
5. Pick a candidate and **set it as the character's avatar**.

!!! tip "Suggest Tags"
    **Suggest Tags** reads the finalized character and drafts a starting prompt from it — a fast way to get a likeness that matches the card instead of typing tags from scratch. Treat it as a first draft and edit freely.

For connecting and configuring a provider in the first place, see [Image Generation → Setup & Providers](../image-generation/setup.md).

---

## Providers

The Visual Studio supports six providers. What you can control depends on which one the connection uses.

| Provider | Runs | What you control | Notes |
|----------|------|------------------|-------|
| **ComfyUI** | Local | Prompt, negative, size, seed — plus any node fields you mapped | Requires an imported, mapped workflow (see below). |
| **SwarmUI** | Local | Prompt, negative, size, seed | Works two ways — see below. |
| **SD WebUI API** | Local | Prompt, negative, size, seed | Standard Stable Diffusion WebUI / Forge API. |
| **NovelAI** | Cloud | Prompt, resolution, seed | Danbooru-style tags work best. |
| **NanoGPT** | Cloud | Prompt, size, seed | Model aggregator — pick the model on the connection. |
| **Google Gemini** | Cloud | Prompt, aspect ratio | Prose prompts; size is set by the portrait aspect ratio. |

!!! warning "Pollinations isn't available here"
    Pollinations works for general [image generation](../image-generation/index.md) but is **not** supported in the Visual Studio. If your only image-gen connection is Pollinations, set up one of the providers above to generate portraits.

### ComfyUI

ComfyUI gives you the most control, but it needs a one-time setup on the connection first: **import your workflow and map its fields** (at minimum, map a node field as the _positive prompt_). See [Image Generation → Setup & Providers](../image-generation/setup.md) for importing and mapping.

Once a workflow is mapped, the Visual Studio fills your prompt, negative prompt, size, and seed into the nodes you mapped — and any **extra fields you mapped** (steps, CFG, sampler, scheduler, checkpoint, or custom node inputs) appear as controls you can tune per generation.

!!! warning "Map a workflow before generating"
    Without an imported workflow that has at least a positive-prompt mapping, ComfyUI portrait generation can't run. The studio will tell you to import one first.

### SwarmUI

SwarmUI works two ways:

- **Plain** — pick a model on the connection and generate from a prompt with size and seed. No workflow needed.
- **With a workflow** — if you've imported and mapped a ComfyUI workflow on the SwarmUI connection, it behaves like ComfyUI above, with your mapped fields as controls.

### SD WebUI API, NovelAI, NanoGPT, Google Gemini

These are prompt-driven: write a prompt (and negative prompt where supported), set size or aspect ratio and seed, and generate. NovelAI leans on Danbooru-style tags; Gemini takes prose and uses the portrait aspect ratio; NanoGPT routes to whichever model you selected on the connection. Each provider's tunable parameters (from your connection's defaults) are available in the controls.

---

## Setting the Avatar

When you've generated a portrait you like, select it and set it as the character's avatar. It becomes the card's image immediately — no re-upload, no extra step. You can keep generating and swap the avatar as often as you like.
