# Greyspace Companion

A quick-capture companion app for the Greyspace journal system. Built as a Progressive Web App (PWA) for fast, privacy-first note taking.

**Philosophy**: Clarity over completion, compassion over compliance

## Features

### Three Capture Methods
- **Text Scratchpad**: Write thoughts as they come, no friction
- **Voice Memos**: Record audio with automatic transcription (requires HTTPS)
- **Photo Capture**: Snap photos of notes, receipts, whiteboards - anything you need to remember

### Organization
- **Smart Timeline**: Captures grouped by Today, Yesterday, This Week, Earlier This Month, Older
- **Search**: Find captures across all types - searches text, transcripts, and captions
- **Collapsible Groups**: Keep your timeline clean and scannable

### Privacy First
- **Local Storage**: Everything stays on your device by default
- **No Tracking**: No analytics, no server communication
- **Offline Ready**: Works without internet connection
- **PWA Install**: Add to home screen like a native app

## Running Locally

```bash
# Using Node
npx serve

# Or Python
python3 -m http.server 8000
```

Then navigate to `localhost:3000` (or whatever port is shown)

## Installing as PWA

1. Open in Chrome/Edge/Safari
2. Look for "Install" prompt in address bar
3. Click to add to home screen
4. Opens in full-screen mode like a native app

## Tech Stack

- Vanilla JavaScript (no frameworks for simplicity)
- localStorage for data persistence
- Service Worker for PWA capabilities
- Web Speech API for voice transcription (HTTPS required)
- Mobile-first responsive design
- Custom fonts: Literata (display) + Work Sans (body)

## Design Philosophy

The UI embraces **warm minimalism** - refined and calm without feeling sterile. Typography choices (Literata serif + Work Sans sans) create a sense of care and craft. The warm amber accent (#D97706) provides energy without aggression. Generous spacing and soft shadows create breathing room that honors the "clarity over completion" ethos.

This isn't another blue-gradient productivity app. It's a tool designed for ADHD brains that celebrates what you *did* capture, not what you missed.

## Roadmap

- [ ] Optional cloud sync (off by default)
- [ ] Export to text/JSON
- [ ] Tags/categories
- [ ] Weekly/monthly stats view
- [ ] Celebration moments (confetti at milestones)
- [ ] Integration with paper journal prompts
- [ ] OCR for photo text extraction

## Development

The app follows a local-first, privacy-preserving architecture. All data is stored in browser localStorage. Voice transcription uses Web Speech API (requires HTTPS in production). Photos are stored as base64-encoded strings.

Built with care for wandering minds.
