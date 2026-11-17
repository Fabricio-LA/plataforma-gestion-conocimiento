import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, authService, categoryService, documentService } from './services/api';
import type { Documento, Usuario, VersionDocumento, Etiqueta } from './types';

type Props = { fail: (e: unknown) => void };

export function Health() {
  const [status, setStatus] = useState('Comprobando conexión…');
  const [busy, setBusy] = useState(false);
  const isOk = status === 'API disponible';

  async function check() {
    setBusy(true);
    try {
      const r = await apiRequest<{ status: string }>('/health');
      setStatus(r.status === 'ok' ? 'API disponible' : 'API sin confirmar');
    } catch {
      setStatus('No se puede conectar con la API');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void check(); }, []);

  return (
    <aside className={`health-bar ${isOk ? 'health-ok' : 'health-warn'}`}>
      <div className="health-status">
        <span className="health-dot" />
        <span role="status">{status}</span>
      </div>
      <button className="health-btn" disabled={busy} onClick={() => void check()}>
        {busy ? 'Verificando…' : 'Reintentar'}
      </button>
    </aside>
  );
}

export function Registration({ fail }: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const d = new FormData(f);
    setBusy(true);
    try {
      await authService.register({
        nombre: String(d.get('nombre')),
        email: String(d.get('email')),
        password: String(d.get('password')),
      });
      setNotice('Cuenta ANALISTA creada con éxito. Ya puedes iniciar sesión.');
      f.reset();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="action-details registration-details">
      <summary>Registrar una cuenta de analista</summary>
      <form onSubmit={submit}>
        <label>Nombre<input name="nombre" required /></label>
        <label>Correo<input name="email" type="email" required /></label>
        <label>Contraseña<input name="password" type="password" required autoComplete="new-password" /></label>
        <button disabled={busy}>{busy ? 'Registrando…' : 'Registrar'}</button>
      </form>
      {notice && <p role="status" className="notice-banner">{notice}</p>}
    </details>
  );
}

export function Catalogs({ fail }: Props) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>, tag: boolean) {
    e.preventDefault();
    const f = e.currentTarget;
    const d = new FormData(f);
    setBusy(true);
    try {
      if (tag) {
        await categoryService.crearEtiqueta(String(d.get('nombre')));
      } else {
        await categoryService.crearCategoria({
          nombre: String(d.get('nombre')),
          descripcion: String(d.get('descripcion')),
        });
      }
      setNotice('Creado exitosamente. Disponible de inmediato en los formularios y filtros.');
      f.reset();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="status-card">
      <h1>Categorías y etiquetas</h1>
      <p className="status-description">Administra las taxonomías y etiquetas del sistema para organizar y catalogar el conocimiento del equipo.</p>
      <div className="catalogs-grid">
        <form className="catalog-form" onSubmit={e => void submit(e, false)}>
          <h2>Crear nueva categoría</h2>
          <label>Nombre de la categoría<input name="nombre" required placeholder="Ej. Seguridad y Cumplimiento" /></label>
          <label>Descripción<textarea name="descripcion" rows={3} placeholder="Breve descripción del alcance..." /></label>
          <button disabled={busy}>{busy ? 'Creando…' : 'Crear categoría'}</button>
        </form>
        <form className="catalog-form" onSubmit={e => void submit(e, true)}>
          <h2>Crear nueva etiqueta</h2>
          <label>Nombre de la etiqueta<input name="nombre" required placeholder="Ej. OAuth2, Docker..." /></label>
          <button disabled={busy}>{busy ? 'Creando…' : 'Crear etiqueta'}</button>
        </form>
      </div>
      {notice && <p role="status" className="notice-banner">{notice}</p>}
    </section>
  );
}

export function TagSelector({ fail }: Props) {
  const [tags, setTags] = useState<Etiqueta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoryService.listarEtiquetas().then(r => setTags(r.etiquetas)).catch(fail).finally(() => setLoading(false));
  }, []);

  return (
    <div className="tag-selector-group">
      <label>
        Etiquetas existentes (puedes seleccionar varias)
        <select multiple name="etiquetaSeleccionada" disabled={loading} className="multi-select" size={Math.min(6, Math.max(3, tags.length))}>
          {tags.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
        </select>
      </label>
      {loading ? <p>Cargando etiquetas…</p> : tags.length === 0 && <p>No hay etiquetas existentes.</p>}
      <label>
        Otras etiquetas (separadas por comas)
        <input name="etiquetas" placeholder="Ej. Microservicios, Docker, API REST" />
      </label>
    </div>
  );
}

export function DocumentActions({ doc, user, versions, refresh, fail }: Props & { doc: Documento; user: Usuario; versions: VersionDocumento[]; refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const allowed = user.rol !== 'ANALISTA' || doc.estado !== 'PUBLICADO';

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function edit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    await run(() => documentService.actualizar(doc.id, {
      titulo: String(d.get('titulo')),
      contenido: String(d.get('contenido')),
      mensajeCambio: String(d.get('motivo')),
    }));
  }

  return (
    <section className="workflow-section">
      {allowed && (
        <details className="action-details">
          <summary>Editar documento</summary>
          <form key={doc.actualizadoEn} onSubmit={edit}>
            <label>Título<input name="titulo" defaultValue={doc.titulo} required /></label>
            <label>Contenido<textarea name="contenido" defaultValue={doc.contenidoActual} required rows={6} /></label>
            <label>Motivo del cambio<input name="motivo" required placeholder="Ej. Actualización de directivas" /></label>
            <button disabled={busy}>{busy ? 'Guardando…' : 'Guardar nueva versión'}</button>
          </form>
        </details>
      )}
      {allowed && (
        <details className="action-details">
          <summary>Restaurar una versión</summary>
          <div className="restore-versions-list">
            {versions.map(v => (
              <button className="secondary restore-btn" key={v.id} disabled={busy} onClick={() => {
                if (window.confirm(`¿Restaurar versión ${v.numeroVersion}? Se creará una nueva versión con ese contenido.`))
                  void run(() => documentService.restaurarVersion(doc.id, v.id));
              }}>
                Restaurar versión {v.numeroVersion}
              </button>
            ))}
          </div>
        </details>
      )}
      {(user.id === doc.autorId || user.rol === 'ADMIN') && (
        <button className="secondary danger-btn" disabled={busy} onClick={() => {
          if (window.confirm(`¿Eliminar definitivamente «${doc.titulo}» y su historial?`))
            void run(async () => { await documentService.eliminar(doc.id); location.hash = '/buscar'; });
        }}>
          Eliminar documento
        </button>
      )}
    </section>
  );
}
