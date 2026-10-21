# AI Sorix

AI Sorix is a multi-model AI platform: side-by-side chat across leading models, image generation (Imagine), presentations (Deck), voice, agents, projects, and more. Payments support bKash, SSLCommerz and Stripe.

**Live app:** https://sorixai.lovable.app

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Supabase (Postgres with row-level security, Auth, Edge Functions in `supabase/functions`)
- **AI:** OpenRouter multi-model pipeline
- **Payments:** SSLCommerz, bKash, Stripe (verified server-side in `payment-webhook`)

## Development

You need Node.js and npm.

```sh
npm i
npm run dev
```

Environment variables are in `.env` (Supabase URL and public keys only). Never commit service-role keys or any other secret; set them as Supabase edge function secrets.

## Lovable

This project is also edited in [Lovable](https://lovable.dev/projects/ea2973e8-9d55-4229-828f-0f92a56755cb). Changes pushed to `main` sync into Lovable, and Lovable edits are committed back here.
