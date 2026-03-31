'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardClient({ tasks }: { tasks: any[] }) {
  // aqui você pode usar useState, useEffect, etc.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Componente Interativo</CardTitle>
      </CardHeader>
      <CardContent>{/* lógica cliente */}</CardContent>
    </Card>
  );
}