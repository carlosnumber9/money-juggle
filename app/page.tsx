const nextSteps = [
  "Preparar el proyecto Supabase",
  "Configurar acceso con enlace mágico",
  "Proteger el acceso con una lista de correos permitidos"
];

export default function Home() {
  return (
    <main className="home">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">money-juggle</p>
        <h1 id="page-title">Tu base financiera ya está lista.</h1>
        <p className="intro">
          Esta primera versión solo confirma que la app Next.js funciona. Las
          conexiones bancarias, autenticación y datos llegarán en pasos pequeños
          y revisables.
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
