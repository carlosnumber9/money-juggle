import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const nextSteps = [
  "Configurar acceso con enlace mágico",
  "Proteger el acceso con una lista de correos permitidos",
  "Crear el primer espacio privado"
];

export default function Home() {
  return (
    <main className="home">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">money-juggle</p>
        <h1 id="page-title">Tu base financiera ya está lista.</h1>
        <p className="intro">
          La app Next.js ya tiene preparada la conexión base con Supabase. La
          autenticación, los datos financieros y las conexiones bancarias
          llegarán en pasos pequeños y revisables.
        </p>
      </section>

      <Card className="mt-14" aria-labelledby="next-title">
        <CardHeader>
          <CardTitle id="next-title">Próximos pasos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button disabled>Próximo: acceso por email</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
