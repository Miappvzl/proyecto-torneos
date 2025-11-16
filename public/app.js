// Este código se ejecuta en el NAVEGADOR del cliente

// Espera a que todo el HTML esté cargado
window.addEventListener('DOMContentLoaded', () => {
  console.log('¡Página cargada! Pidiendo datos al servidor...');
  
  // Busca los elementos en el HTML donde pondremos los datos
  const divTasa = document.getElementById('info-tasa-bcv'); // Necesitarás un <div>
  const selectTorneos = document.getElementById('torneo_id'); // Tu <select>

  // Llama a nuestra nueva API en el backend
  fetch('/api/datos-formulario')
    .then(respuesta => respuesta.json())
    .then(datos => {
      console.log('Datos recibidos del servidor:', datos);

      // 1. Rellena la información de la Tasa BCV
      if (divTasa) {
        divTasa.innerHTML = `
          <b>Tasa BCV del día: ${datos.tasa} Bs. </b> <br>
          <b>Monto de Inscripción: $1.50 = ${datos.montoBs} Bs.</b>
        `;
      }
      
      // 2. Rellena la lista de Torneos
      if (selectTorneos) {
        if (datos.listaTorneos && datos.listaTorneos.length > 0) {
          datos.listaTorneos.forEach(torneo => {
            const opcion = document.createElement('option');
            opcion.value = torneo.id;
            opcion.textContent = torneo.nombre;
            selectTorneos.appendChild(opcion);
          });
        } else {
          selectTorneos.innerHTML = '<option value="" disabled>No hay torneos disponibles</option>';
        }
      }
    })
    .catch(error => {
      console.error('Error al pedir datos:', error);
      if (divTasa) {
        divTasa.innerHTML = 'Error al cargar la tasa BCV.';
      }
    });
});