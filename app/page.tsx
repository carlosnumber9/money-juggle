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

      <section className="next-section" aria-labelledby="next-title">
        <h2 id="next-title">Próximos pasos</h2>
        <ul>
          {nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
