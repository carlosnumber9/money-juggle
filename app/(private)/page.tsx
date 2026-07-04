import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const implementedSteps = [
  "Acceso con enlace mágico",
  "Lista de emails permitidos",
  "Primera zona privada protegida"
];

export default function Home() {
  return (
    <main className="home">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">money-juggle</p>
        <h1 id="page-title">Tu espacio privado ya está listo.</h1>
        <p className="intro">
          La app ya puede pedir enlaces mágicos, validar el callback de Supabase
          y proteger esta pantalla con una lista de emails permitidos. Los datos
          financieros y las conexiones bancarias llegarán en pasos pequeños y
          revisables.
        </p>
      </section>

      <Card className="mt-14" aria-labelledby="next-title">
        <CardHeader>
          <CardTitle id="next-title">MVP disponible</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3">
            {implementedSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </CardContent>
        <CardFooter>
          <Button disabled>Próximo: modelo de datos</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
