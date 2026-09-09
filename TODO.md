# Code Cleanup Plan

## Goal

Remove unnecessary/dead code, fix code issues, and clean up the BLGF Region II Document
Tracking System codebase without changing runtime behavior.

## Steps

- [x] 1. Remove stray/dead scratch files and legacy cleanup targets.
- [x] 2. Verify that no unused `.before-*` backup JSON files remain in `backend/data/`.
- [x] 3. Verify that `backend/server.ts` contains only one document-delete route.
- [x] 4. Remove unused `_queueSync` parameter from `createNotification` and update call sites.
- [x] 5. Type `appPromise` in `backend/vercel-handler.ts` with `ReturnType<typeof createApp>`.
- [x] 6. Run `npm run lint` to confirm both frontend and backend still type-check cleanly.

## Verification

- [x] `npm run lint` passes (no TypeScript errors).
- [x] Build still succeeds (`npm run build`).
