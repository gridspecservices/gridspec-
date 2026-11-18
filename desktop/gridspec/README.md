# GridSpec Desktop

GridSpec Desktop is an installable Windows and macOS shell around the published GridSpec workspace. It uses the same account, database, uploaded evidence, and work-order review process as the web app. An internet connection is required; records are not stored as an offline copy on the computer.

## Build installers

Run builds on the matching operating system:

```sh
pnpm install
pnpm --filter @workspace/gridspec-desktop run build:win
pnpm --filter @workspace/gridspec-desktop run build:mac
```

The Windows command produces an x64 NSIS installer. The macOS command produces a universal DMG for Intel and Apple Silicon Macs. The build workflow in `.github/workflows/gridspec-desktop.yml` can create both as downloadable build artifacts from a connected GitHub repository.

## Install and trust

The installers are unsigned. Windows may show a SmartScreen warning. macOS Gatekeeper may prevent opening the app until the user confirms the app in System Settings or opens it through Finder’s **Open** command. Before broad distribution, sign the Windows installer with the company’s code-signing certificate and sign/notarize the macOS app with an Apple Developer ID. Signing credentials should be added to the build provider’s protected secrets, never committed to this repository.

## Updates

The app connects to `https://handy-darkcyan-softwaresuite.replit.app`. New desktop-shell releases must be installed separately; automatic desktop-app updates are not configured.
