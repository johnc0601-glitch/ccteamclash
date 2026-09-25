<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Deployment preflight

Vercel automatically builds connected branches. Do not push an intermediate or known-broken commit to a Vercel-connected branch.

Before every push to a Vercel-connected preview or production branch:

1. Finish the coherent change locally instead of pushing partial compile states.
2. Run `npm run build` using the same branch state that will be pushed.
3. If the build or TypeScript check fails, fix it locally and rerun `npm run build`. Do not push until it passes.
4. Push only after the preflight build is green.
5. After pushing, verify the Vercel deployment reaches READY before treating the preview as reviewable.

When iterating quickly, batch related edits into a validated commit rather than using Vercel as the type-check loop. This reduces failed preview deployments and failure-notification email noise.
