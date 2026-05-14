# Nano Banana Pro — Image Generation Reference Skill

Use this skill automatically whenever the user asks to generate, create, or describe an AI image.

## How to Use This Skill

When a user requests an image, consult `prompts.md` in this directory. It contains 2,500+ curated prompts organized into 12 categories. Select the most relevant template, adapt it to the user's subject/context, and output the final prompt.

## Prompt Categories (from prompts.md)

| # | Category | Best For |
|---|----------|----------|
| 1 | **Photorealism & Aesthetics** | Portraits, headshots, film photography, mirror selfies |
| 2 | **Creative Experiments** | Recursive visuals, crowd scenes, surreal/conceptual |
| 3 | **Education & Knowledge** | Infographics, travel journals, financial diagrams |
| 4 | **E-commerce & Virtual Studio** | Product photography, virtual try-ons |
| 5 | **Workplace & Productivity** | Flowcharts, UI mockups, magazine layouts |
| 6 | **Photo Editing & Restoration** | Outpainting, crowd removal, CCTV simulation |
| 7 | **Interior Design** | Floor plan visualisation, design boards |
| 8 | **Social Media & Marketing** | Viral thumbnails, promotional posters |
| 9 | **Daily Life & Translation** | Menu translation, meme localisation |
| 10 | **Social Networking & Avatars** | 3D blind box characters, Y2K scrapbooks |
| 11 | **Resources** | Official guides and documentation links |
| 12 | **Contributing** | Pull request guidelines |

## Key Techniques

- **Face consistency**: Add `"Keep the facial features of the person in the uploaded image exactly consistent"` for portrait edits
- **JSON prompts**: Use structured JSON format for complex multi-part compositions (see sections 1.2, 1.9, 1.10)
- **Technical specs**: Specify lens (e.g. `85mm f/1.4`), lighting setup, camera body for photorealism
- **Era simulation**: Use phrases like `"1990s-style camera"`, `"Kodak Portra 400 film"`, `"early-2000s digital camera aesthetic"`
- **Negative prompts**: Use `"negative"` JSON key to exclude unwanted elements

## Activation

This skill activates when the user asks for:
- "generate an image of..."
- "create a photo of..."
- "make an image..."
- "write a prompt for..."
- Any request involving Nano Banana Pro, Gemini image gen, or similar models

Source: https://github.com/ZeroLu/awesome-nanobanana-pro
