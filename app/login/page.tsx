// app/login/page.tsx
import { Suspense } from 'react';
import LoginClient from '../login/LoginClient';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}