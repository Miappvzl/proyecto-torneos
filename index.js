
require('dotenv').config();
const express = require('express');

// 2. ¡NUEVO! Importamos el creador de cliente de Supabase

const { createClient } = require('@supabase/supabase-js');

// 4. ¡NUEVO! Creamos nuestro cliente de Supabase
// Esta variable 'supabase' es la que usaremos para hablar con la BD
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- El resto de tu código sigue igual ---
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

async function obtenerTasaBCV() {
  const API_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';
  try {
    const respuesta = await fetch(API_URL);
    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }
    const datos = await respuesta.json();
    return datos.promedio; // La devolvemos en lugar de imprimirla
  } catch (error) {
    console.error('¡Falló la conexión con DolarAPI!', error.message);
    return null; // Devuelve null si hay un error
  }
}


    // --- ¡NUEVO! MIDDLEWARES ---
    // 1. Le dice a Express cómo leer datos de formulario (formato URL-encoded)
    app.use(express.urlencoded({ extended: true }));
    // 2. Le dice a Express cómo leer datos en formato JSON
    app.use(express.json());
    // 3. Le dice a Express que la carpeta "public" contiene archivos estáticos (HTML, CSS)
    //app.use(express.static('public'));
    // --- FIN DE MIDDLEWARES ---

    // --- NUEVA RUTA PRINCIPAL (FORMULARIO DINÁMICO) ---

  // 3. Enviamos el formulario HTML completo como respuesta
  // (Este es el mismo HTML de tu archivo /public/index.html, pero con el
  

  // 4. Enviamos el HTML completo



// La ruta principal ahora solo sirve el index.html de la carpeta 'public'
app.get('/', (req, res) => {
  // res.sendFile ya no es necesario, express.static lo hace automático
  // Pero si quieres ser explícito, puedes usar:
  res.sendFile(__dirname + '/public/index.html');
});

// --- NUEVO ENDPOINT DE API PARA DATOS DEL FORMULARIO ---

app.get('/api/datos-formulario', async (req, res) => {
  console.log('Petición recibida en /api/datos-formulario');

  try {
    // 1. Obtenemos la Tasa
    const tasaBCV = await obtenerTasaBCV(); // ¡Asegúrate que esta función exista!

    // 2. Obtenemos los Torneos
    const { data: torneos, error } = await supabase
      .from('torneos')
      .select('id, nombre');

    if (error) {
      throw new Error(`Error de Supabase: ${error.message}`);
    }

    // 3. Enviamos ambos datos como un solo JSON
    res.json({
      tasa: tasaBCV,
      montoBs: (tasaBCV * 1.5).toFixed(2),
      listaTorneos: torneos
    });

  } catch (err) {
    console.error('Error en /api/datos-formulario:', err.message);
    res.status(500).json({ error: 'No se pudieron cargar los datos' });
  }
});

// --- NUEVA RUTA PARA CREAR UN TORNEO DE PRUEBA ---

app.get('/crear-torneo', async (req, res) => {
  console.log('Recibida petición en /crear-torneo');
  console.log('Intentando insertar en Supabase...');

  // Usamos el cliente de Supabase para insertar
  const { data, error } = await supabase
    .from('torneos') // 1. En la tabla 'torneos'
    .insert([         // 2. Inserta este objeto
      { nombre: 'Torneo de Prueba (desde Express)' }
    ])
    .select(); // 3. Devuélveme el registro que acabas de crear

  // 4. Manejamos la respuesta
  if (error) {
    console.error('Error al insertar en Supabase:', error.message);
    return res.send(`<h1>¡Error al crear el torneo!</h1>
                     <p>${error.message}</p>
                     <p><strong>Mentor-duda:</strong> ¿Desactivaste RLS (Row Level Security) en la tabla 'torneos'?</p>`);
  }

  console.log('¡Torneo creado con éxito!', data);
  res.send(`<h1>¡Torneo Creado Exitosamente en la BD!</h1>
             <pre>${JSON.stringify(data, null, 2)}</pre>`);
});


// --- FIN DE LA NUEVA RUTA ---


// ... (justo después de tu ruta /crear-torneo) ...

// --- NUEVA RUTA PARA REGISTRAR JUGADORES (RECIBE DATOS DEL FORMULARIO) ---

// --- RUTA ACTUALIZADA PARA REGISTRAR JUGADOR E INSCRIBIRLO ---

app.post('/registrar-jugador', async (req, res) => {
  console.log('Recibida petición en /registrar-jugador (v2)');

  // 1. Extraemos TODOS los datos del formulario (incluyendo el torneo_id)
  const { 
    nombre_completo, 
    cod_id, 
    email, 
    cedula, 
    telefono, 
    banco,
    torneo_id // ¡Aquí está el nuevo dato!
  } = req.body;

  console.log('Inscribiendo en Torneo ID:', torneo_id);

  // --- PASO 1: Crear el Jugador (o buscarlo si ya existe) ---
  // (Por ahora, lo crearemos siempre. Luego podemos mejorarlo para 
  //  evitar duplicados, pero mantengámoslo simple)

  const { data: nuevoJugador, error: errorJugador } = await supabase
    .from('jugadores')
    .insert([
      {
        nombre_completo: nombre_completo,
        cod_id: cod_id,
        email: email,
        cedula: cedula,
        telefono: telefono,
        banco: banco
      }
    ])
    .select() // ¡MUY IMPORTANTE: .select() nos devuelve el jugador creado!
    .single(); // .single() nos devuelve un objeto, no un array [ ]

  if (errorJugador) {
    console.error('Error al crear jugador:', errorJugador.message);
    return res.send(`<h1>Error al crear el jugador:</h1><p>${errorJugador.message}</p>`);
  }

  console.log('Jugador creado con éxito:', nuevoJugador);

  // --- PASO 2: Crear la Inscripción ---
  // Usamos el ID del jugador que acabamos de crear (nuevoJugador.id)
  // y el ID del torneo que vino del formulario (torneo_id)

  const { data: nuevaInscripcion, error: errorInscripcion } = await supabase
    .from('inscripciones')
    .insert([
      {
        jugador_id: nuevoJugador.id, // ID del jugador recién creado
        torneo_id: torneo_id,        // ID del torneo seleccionado
        // pago_verificado y kills usarán sus valores por defecto (false y 0)
      }
    ])
    .select();

  if (errorInscripcion) {
    console.error('Error al crear la inscripción:', errorInscripcion.message);
    // Ojo: Aquí podríamos querer "borrar" al jugador que creamos
    // para no dejar datos sueltos, pero por ahora lo dejamos así.
    return res.send(`<h1>Error al crear la inscripción:</h1><p>${errorInscripcion.message}</p>`);
  }

  console.log('¡Inscripción creada con éxito!', nuevaInscripcion);

  // 4. ¡Respuesta final!
  res.send(`<h1>¡Registro e Inscripción Exitosos, ${nombre_completo}!</h1>
             <p>Has sido registrado en la base de datos y tu inscripción 
                al torneo ha sido procesada.</p>
             <p>Tu próximo paso es pagar la entrada de $1.5 (o ${req.body.montoBs || 'calcula el monto'}) 
                a los datos de Pago Móvil del organizador.</p>
             <a href="/">Volver al inicio</a>`);
});

// --- FIN DE LA RUTA ACTUALIZADA ---
// --- FIN DE LA NUEVA RUTA ---




// --- RUTA DEL PANEL DE ADMIN (V2) CON DOS TABLAS ---

app.get('/admin', async (req, res) => {
  console.log('Petición recibida en /admin (V2)');

  // --- 1. PRIMERA CONSULTA: Pagos PENDIENTES ---
  // (Esta consulta es la misma que ya tenías)
  const { data: pendientes, error: errorPendientes } = await supabase
    .from('inscripciones')
    .select(`
      id,
      jugadores ( nombre_completo, telefono, banco, cedula ),
      torneos ( nombre )
    `)
    .eq('pago_verificado', false);

  if (errorPendientes) {
    return res.send(`<h1>Error al cargar pendientes: ${errorPendientes.message}</h1>`);
  }

  // --- 2. SEGUNDA CONSULTA: Jugadores VERIFICADOS ---
  // (Buscamos lo opuesto: pago_verificado == true)
  const { data: verificados, error: errorVerificados } = await supabase
    .from('inscripciones')
    .select(`
      id,
      kills,
      jugadores ( nombre_completo ),
      torneos ( nombre )
    `)
    .eq('pago_verificado', true); // <-- La única diferencia

  if (errorVerificados) {
    return res.send(`<h1>Error al cargar verificados: ${errorVerificados.message}</h1>`);
  }

  // --- 3. Construimos la Tabla de PENDIENTES ---
  // (Este código es el mismo que ya tenías)
  let filasPendientes = '';
  if (pendientes && pendientes.length > 0) {
    filasPendientes = pendientes.map(insc => {
      return `
        <tr>
          <td>${insc.jugadores.nombre_completo}</td>
          <td>${insc.jugadores.telefono}</td>
          <td>${insc.jugadores.cedula}</td>
          <td>${insc.torneos.nombre}</td>
          <td>
            <form action="/verificar-pago" method="POST">
              <input type="hidden" name="inscripcion_id" value="${insc.id}">
              <button type="submit">Verificar Pago</button>
            </form>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    filasPendientes = '<tr><td colspan="5">¡No hay pagos pendientes!</td></tr>';
  }

  // --- 4. Construimos la Tabla de VERIFICADOS (¡NUEVO!) ---
  let filasVerificadas = '';
  if (verificados && verificados.length > 0) {
    filasVerificadas = verificados.map(insc => {
      return `
        <tr>
          <td>${insc.jugadores.nombre_completo}</td>
          <td>${insc.torneos.nombre}</td>
          <td>
            <form action="/guardar-kills" method="POST" style="display: flex;">
              <input type="hidden" name="inscripcion_id" value="${insc.id}">
              <input 
                type="number" 
                name="kills" 
                value="${insc.kills}" 
                min="0" 
                style="width: 60px; margin-right: 5px;"
              >
              <button type="submit">Guardar</button>
            </form>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    filasVerificadas = '<tr><td colspan="3">No hay jugadores verificados.</td></tr>';
  }

  // --- 5. Enviamos el HTML con AMBAS tablas ---
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF8">
      <title>Panel de Admin</title>
      <style>
        /* (Tus mismos estilos CSS) */
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        h1, h2 { color: #333; }
      </style>
    </head>
    <body>
      <h1>Panel de Administración</h1>

      <h2>Pagos Pendientes</h2>
      <p>Jugadores que aún no han pagado la entrada de $1.5.</p>
      <table>
        <thead>
          <tr>
            <th>Nombre del Jugador</th>
            <th>Teléfono</th>
            <th>Cédula</th>
            <th>Torneo</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${filasPendientes}
        </tbody>
      </table>

      <h2>Jugadores Verificados (Registro de Kills)</h2>
      <p>Jugadores que ya pagaron. Registra sus kills aquí al terminar la partida.</p>
      <table>
        <thead>
          <tr>
            <th>Nombre del Jugador</th>
            <th>Torneo</th>
            <th>Kills (Registrar)</th>
          </tr>
        </thead>
        <tbody>
          ${filasVerificadas}
        </tbody>
      </table>

    </body>
    </html>
  `);
});

// --- FIN DE LA RUTA ADMIN (V2) ---


// --- NUEVA RUTA PARA VERIFICAR UN PAGO (UPDATE) ---

app.post('/verificar-pago', async (req, res) => {
  // 1. Obtenemos el ID de la inscripción desde el formulario oculto
  const { inscripcion_id } = req.body;

  console.log(`Recibida petición para verificar inscripción ID: ${inscripcion_id}`);

  // 2. Le decimos a Supabase que ACTUALICE (update) la fila
  const { data, error } = await supabase
    .from('inscripciones')
    .update({ pago_verificado: true }) // 2a. Pon esta columna en 'true'
    .eq('id', inscripcion_id);         // 2b. Solo donde el ID coincida

  if (error) {
    console.error('Error al verificar el pago:', error.message);
    return res.send(`<h1>Error al verificar: ${error.message}</h1>`);
  }

  console.log('Pago verificado con éxito:', data);

  // 3. ¡LA MEJOR PARTE!
  // Redirigimos al admin de vuelta a la página /admin.
  // Como el jugador ya está verificado, ya no aparecerá en la lista.
  res.redirect('/admin');
});

// --- FIN DE LA RUTA DE VERIFICACIÓN ---

// --- NUEVA RUTA PARA GUARDAR KILLS (UPDATE) ---

app.post('/guardar-kills', async (req, res) => {
  // 1. Obtenemos el ID de la inscripción Y el número de kills
  const { inscripcion_id, kills } = req.body;

  console.log(`Guardando ${kills} kills para la inscripción ID: ${inscripcion_id}`);

  // 2. Le decimos a Supabase que ACTUALICE (update) la fila
  const { data, error } = await supabase
    .from('inscripciones')
    .update({ kills: kills })           // 2a. Pon la columna 'kills'
    .eq('id', inscripcion_id);         // 2b. Solo donde el ID coincida

  if (error) {
    console.error('Error al guardar kills:', error.message);
    return res.send(`<h1>Error al guardar: ${error.message}</h1>`);
  }

  console.log('Kills guardadas con éxito:', data);

  // 3. Redirigimos al admin de vuelta a /admin
  res.redirect('/admin');
});

// --- FIN DE LA RUTA DE KILLS ---

// --- RUTA FINAL: REPORTE DE PAGOS A JUGADORES ---

app.get('/reporte', async (req, res) => {
  console.log('Petición recibida en /reporte');

  // 1. Obtenemos la Tasa BCV (¡la necesitamos para los cálculos!)
  const tasaBCV = await obtenerTasaBCV();
  if (!tasaBCV) {
    return res.send('<h1>Error al obtener la Tasa BCV.</h1>');
  }

  // 2. Traemos a todos los jugadores que pagaron
  // ¡Necesitamos sus 'kills' y sus datos de pago (de la tabla 'jugadores')!
  const { data: jugadoresPagados, error } = await supabase
    .from('inscripciones')
    .select(`
      kills,
      jugadores ( nombre_completo, telefono, cedula, banco )
    `)
    .eq('pago_verificado', true) // Solo los que pagaron
    .gt('kills', 0); // Y solo los que tengan más de 0 kills

  if (error) {
    return res.send(`<h1>Error al cargar reporte: ${error.message}</h1>`);
  }

  // 3. Calculamos y construimos la tabla
  let filasDelReporte = '';
  let totalPagadoEnDolares = 0;
  let totalPagadoEnBolivares = 0;

  if (jugadoresPagados && jugadoresPagados.length > 0) {
    filasDelReporte = jugadoresPagados.map(insc => {
      const jugador = insc.jugadores; // Para leer más fácil

      const montoDolares = insc.kills * 1.00; // $1 por kill
      const montoBolivares = montoDolares * tasaBCV;

      // Sumamos a los totales
      totalPagadoEnDolares += montoDolares;
      totalPagadoEnBolivares += montoBolivares;

      return `
        <tr>
          <td>${jugador.nombre_completo}</td>
          <td>${insc.kills}</td>
          <td>${jugador.telefono}</td>
          <td>${jugador.cedula}</td>
          <td>${jugador.banco}</td>
          <td>$${montoDolares.toFixed(2)}</td>
          <td><strong>${montoBolivares.toFixed(2)} Bs.</strong></td>
        </tr>
      `;
    }).join('');
  } else {
    filasDelReporte = '<tr><td colspan="7">Ningún jugador verificado tiene kills registradas.</td></tr>';
  }

  // 4. Enviamos el HTML del Reporte
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF8">
      <title>Reporte de Pagos</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .total { background: #e0f7fa; font-size: 1.1em; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Reporte de Pagos (Kills)</h1>
      <p>Lista de pagos a realizar a los jugadores. (Tasa BCV usada: ${tasaBCV} Bs.)</p>

      <table>
        <thead>
          <tr>
            <th>Nombre del Jugador</th>
            <th>Kills</th>
            <th>Teléfono (Pago Móvil)</th>
            <th>Cédula</th>
            <th>Banco</th>
            <th>Monto ($)</th>
            <th>Monto a Pagar (Bs.)</th>
          </tr>
        </thead>
        <tbody>
          ${filasDelReporte}
        </tbody>
        <tfoot>
          <tr class="total">
            <td colspan="5">TOTALES A PAGAR:</td>
            <td>$${totalPagadoEnDolares.toFixed(2)}</td>
            <td>${totalPagadoEnBolivares.toFixed(2)} Bs.</td>
          </tr>
        </tfoot>
      </table>
      <br>
      <a href="/admin">Volver al Panel de Admin</a>
    </body>
    </html>
  `);
});

// --- FIN DE LA RUTA REPORTE ---


// 5. ¡MODIFICADO! Iniciamos el servidor y comprobamos Supabase




  app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo exitosamente en http://localhost:${PORT}`);
      
      // Como ya configuraste tus claves, solo imprimimos el éxito.
      console.log('✅ Cliente de Supabase inicializado.');
    });
