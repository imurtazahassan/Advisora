# ADVISORA frontend

React/Vite dashboard for the simulated ADVISORA application. The integrated NestJS server serves the production build from port `3000`.

For isolated development, install dependencies with `npm ci`, start the backend at `http://127.0.0.1:3000`, then run `npm run dev`. Vite binds to `127.0.0.1:5173` and proxies application API routes to the backend.

```sh
npm test
npm run build
npm run lint
```

The app labels simulated data, keeps advisory generation in `PENDING_POLICY`, and does not claim native biometric or live exchange integration.
