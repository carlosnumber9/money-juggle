import { Card, CardContent } from "@/components/ui/card";

import { BankConnectionsPanel } from "@/app/(private)/bank-connections-panel";
import { EnableBankingStatus } from "@/app/(private)/enable-banking-status";

type HomeProps = {
  searchParams?: Promise<{
    bank_connection_status?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;

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
      <BankConnectionsPanel status={params?.bank_connection_status} />
    </main>
  );
}
