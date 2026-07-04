import { Card, CardContent } from "@/components/ui/card";

import { EnableBankingStatus } from "@/app/(private)/enable-banking-status";

export default function Home() {
  return (
    <main className="accounts-page">
      <div className="accounts-heading">
        <h1 className="accounts-title">Tus cuentas</h1>

        <Card
          size="sm"
          className="accounts-status-card py-0"
          aria-label="Estado de conexión con Enable Banking"
        >
          <CardContent className="p-0">
            <EnableBankingStatus />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
