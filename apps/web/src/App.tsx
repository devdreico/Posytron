import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useDB } from "./lib/store";
import { Rail } from "./components/Shell";
import { AiDock } from "./components/AiDock";

const Login = lazy(() => import("./pages/Login").then((m) => ({ default: m.Login })));
const Register = lazy(() => import("./pages/Register").then((m) => ({ default: m.Register })));
const Onboarding = lazy(() => import("./pages/Onboarding").then((m) => ({ default: m.Onboarding })));
const Setup = lazy(() => import("./pages/Setup").then((m) => ({ default: m.Setup })));
const Hero = lazy(() => import("./pages/Hero").then((m) => ({ default: m.Hero })));
const Caja = lazy(() => import("./pages/Caja").then((m) => ({ default: m.Caja })));
const Inventario = lazy(() => import("./pages/Inventario").then((m) => ({ default: m.Inventario })));
const Admin = lazy(() => import("./pages/Administracion").then((m) => ({ default: m.Admin })));
const Red = lazy(() => import("./pages/Red").then((m) => ({ default: m.Red })));
const Clientes = lazy(() => import("./pages/Clientes").then((m) => ({ default: m.Clientes })));
const Procesos = lazy(() => import("./pages/Procesos").then((m) => ({ default: m.Procesos })));
const Herramientas = lazy(() => import("./pages/Herramientas").then((m) => ({ default: m.Herramientas })));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin").then((m) => ({ default: m.SuperAdmin })));

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-moss" />
        Cargando
      </div>
    </div>
  );
}

/** Exige sesión activa y que el slug de la URL coincida con el del negocio. */
function Guard({ children }: { children: ReactNode }) {
  const db = useDB();
  const { slug } = useParams();
  const { pathname } = useLocation();

  if (!db.tenant) return <Navigate to="/" replace />;

  if (db.tenant.slug !== slug) {
    const rest = pathname.split("/").slice(2).join("/");
    return <Navigate to={`/${db.tenant.slug}${rest ? `/${rest}` : ""}`} replace />;
  }

  if (!db.session) return <Navigate to="/" replace />;

  if (db.tenant.status === "onboarding_pending" && !pathname.endsWith("/onboarding")) {
    return <Navigate to={`/${slug}/onboarding`} replace />;
  }

  if (db.tenant.status === "setup_running" && !pathname.endsWith("/setup")) {
    return <Navigate to={`/${slug}/setup`} replace />;
  }

  return <>{children}</>;
}

/** Guard + shell del producto (rail, barra superior, copiloto). */
function Page({ children }: { children: ReactNode }) {
  return (
    <Guard>
      <div className="flex min-h-screen bg-paper">
        <Rail />
        <div className="min-w-0 flex-1">{children}</div>
        <AiDock />
      </div>
    </Guard>
  );
}

function Root() {
  const db = useDB();
  if (db.tenant && db.session) {
    if (db.tenant.status === "onboarding_pending") return <Navigate to={`/${db.tenant.slug}/onboarding`} replace />;
    if (db.tenant.status === "setup_running") return <Navigate to={`/${db.tenant.slug}/setup`} replace />;
    return <Navigate to={`/${db.tenant.slug}`} replace />;
  }
  return <Login />;
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/admin" element={<SuperAdmin />} />

          <Route
            path="/:slug/onboarding"
            element={
              <Guard>
                <Onboarding />
              </Guard>
            }
          />
          <Route
            path="/:slug/setup"
            element={
              <Guard>
                <Setup />
              </Guard>
            }
          />

          <Route path="/:slug" element={<Page><Hero /></Page>} />
          <Route path="/:slug/caja" element={<Page><Caja /></Page>} />
          <Route path="/:slug/inventario" element={<Page><Inventario /></Page>} />
          <Route path="/:slug/administracion/*" element={<Page><Admin /></Page>} />
          <Route path="/:slug/red" element={<Page><Red /></Page>} />
          <Route path="/:slug/clientes" element={<Page><Clientes /></Page>} />
          <Route path="/:slug/procesos" element={<Page><Procesos /></Page>} />
          <Route path="/:slug/herramientas" element={<Page><Herramientas /></Page>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
