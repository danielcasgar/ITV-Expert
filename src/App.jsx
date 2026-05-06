import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
// IMPORTACIONES DE FIREBASE
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase'; 

function App() {
  const [paginaActual, setPaginaActual] = useState('login');
  const [usuarioActual, setUsuarioActual] = useState(null);

  // Jerarquía de roles
  const [esMaestro, setEsMaestro] = useState(false);
  const [esJefe, setEsJefe] = useState(false);

  // Gestión de Cuentas (NUBE)
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosPendientes, setUsuariosPendientes] = useState([]);
  const [usuarioExpandido, setUsuarioExpandido] = useState(null);

  // Login y registro
  const [loginInput, setLoginInput] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [nombreRegistro, setNombreRegistro] = useState('');
  const [estacionRegistro, setEstacionRegistro] = useState('');
  const [inspectorRegistro, setInspectorRegistro] = useState('');
  const [emailRegistro, setEmailRegistro] = useState('');
  const [passwordRegistro, setPasswordRegistro] = useState('');

  // Cambio de contraseña
  const [mostrarCambioPass, setMostrarCambioPass] = useState(false);
  const [passAntigua, setPassAntigua] = useState('');
  const [nuevaPass1, setNuevaPass1] = useState('');
  const [nuevaPass2, setNuevaPass2] = useState('');

  // Vehículos (NUBE)
  const [vehiculosGuardados, setVehiculosGuardados] = useState([]);
  const [busqueda, setBusqueda] = useState({ marca: '', modelo: '' });
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [vehiculoDetalle, setVehiculoDetalle] = useState(null);
  const [editandoVehiculo, setEditandoVehiculo] = useState(false);
  const [filtroCompletados, setFiltroCompletados] = useState(false);

  // Formularios
  const [nuevoVehiculo, setNuevoVehiculo] = useState({ marca: '', modelo: '', anoInicio: '', anoFin: 'Actualidad', categoria: 'M/N' });
  const [fotos, setFotos] = useState({ frontal: { url: null, puntos: {} }, perfil: { url: null, puntos: {} } });

  // Marcadores y Modales
  const [modoMarcado, setModoMarcado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [puntoActual, setPuntoActual] = useState({ vista: '', tipo: '', x: 0, y: 0, isEdit: false });
  const [detallePopup, setDetallePopup] = useState({ descripcion: '', fotoDetalle: null });
  const [vehiculoModal, setVehiculoModal] = useState(null);

  // ESTADOS DE NEUMÁTICOS
  const [numEjesConfig, setNumEjesConfig] = useState(2);
  const [medidasManuales, setMedidasManuales] = useState({ todas: '', eje1: '', eje2: '', eje3: '', eje4: '' });
  const [medidasFicha, setMedidasFicha] = useState([]);
  const [procesandoOCR, setProcesandoOCR] = useState(false);

  const estadoEjesInicial = [
    { id: 1, gemela: false, ruedas: { izq: '', der: '', izqExt: '', izqInt: '', derInt: '', derExt: '' } },
    { id: 2, gemela: false, ruedas: { izq: '', der: '', izqExt: '', izqInt: '', derInt: '', derExt: '' } },
    { id: 3, gemela: false, ruedas: { izq: '', der: '', izqExt: '', izqInt: '', derInt: '', derExt: '' } },
    { id: 4, gemela: false, ruedas: { izq: '', der: '', izqExt: '', izqInt: '', derInt: '', derExt: '' } }
  ];
  const [ejesNeumaticos, setEjesNeumaticos] = useState(estadoEjesInicial);

  // ==========================================
  // COMPRESIÓN DE IMÁGENES
  // ==========================================
  const compressImageBase64 = (file, maxWidth = 1024, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  useEffect(() => {
    // 1. ESCUCHAR USUARIOS EN LA NUBE EN TIEMPO REAL
    const unsubUsuarios = onSnapshot(collection(db, 'usuarios'), (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (allUsers.length === 0) {
        // Crear cuenta maestra inicial en la base de datos si está vacía
        const maestro = { nombre: "Daniel Castillo García", estacion: "3902", inspector: "A22", email: "danielcasgar89@gmail.com", password: "Dc13708562gh", esMaestro: true, esJefe: false, activo: true, solicitaReset: false, fotoPerfil: null };
        addDoc(collection(db, 'usuarios'), maestro);
      } else {
        setUsuarios(allUsers.filter(u => u.activo));
        setUsuariosPendientes(allUsers.filter(u => !u.activo));
        
        // Actualizar datos del usuario logueado en tiempo real por si le cambian permisos
        setUsuarioActual(prev => {
          if (!prev) return null;
          const userDb = allUsers.find(u => u.id === prev.id);
          if (!userDb || !userDb.activo) {
            setPaginaActual('login'); // Echa al usuario si lo borran o desactivan
            return null;
          }
          setEsMaestro(userDb.esMaestro || false);
          setEsJefe(userDb.esJefe || false);
          return userDb;
        });
      }
    }, (error) => {
      console.error("Error al escuchar usuarios en Firebase:", error);
    });

    // 2. ESCUCHAR LOS VEHÍCULOS EN LA NUBE EN TIEMPO REAL
    const unsubVehiculos = onSnapshot(collection(db, 'vehiculos'), (snapshot) => {
      const vehiculosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVehiculosGuardados(vehiculosData);
      setVehiculoDetalle(prevDetalle => {
        if (!prevDetalle) return null;
        const actualizado = vehiculosData.find(v => v.id === prevDetalle.id);
        return actualizado || null;
      });
    }, (error) => {
      console.error("Error al escuchar vehículos en Firebase:", error);
    });

    return () => { unsubUsuarios(); unsubVehiculos(); };
  }, []);

  useEffect(() => {
    if (busqueda.marca || busqueda.modelo) {
      setResultadosBusqueda(vehiculosGuardados.filter(v => 
        v.marca.toLowerCase().includes(busqueda.marca.toLowerCase()) && 
        v.modelo.toLowerCase().includes(busqueda.modelo.toLowerCase())
      ));
    }
  }, [vehiculosGuardados, busqueda]);
  const hacerLogin = () => {
    const user = usuarios.find(u => u.email.toLowerCase() === loginInput.toLowerCase() && u.password === passwordLogin && u.activo);
    if (user) {
      setUsuarioActual(user); setEsMaestro(user.esMaestro || false); setEsJefe(user.esJefe || false);
      setPaginaActual('buscar'); setLoginInput(''); setPasswordLogin('');
    } else alert("Credenciales incorrectas o cuenta inactiva o pendiente de autorización.");
  };

  const registrarUsuario = async () => {
    if (!nombreRegistro || !estacionRegistro || !inspectorRegistro || !emailRegistro || !passwordRegistro) return alert("Completa todos los campos del registro.");
    const nuevo = { nombre: nombreRegistro, estacion: estacionRegistro, inspector: inspectorRegistro, email: emailRegistro, password: passwordRegistro, esMaestro: false, esJefe: false, activo: false, solicitaReset: false, fotoPerfil: null };
    try {
      await addDoc(collection(db, 'usuarios'), nuevo);
      alert("Solicitud enviada correctamente. Espera a que un responsable autorice tu cuenta.");
      setNombreRegistro(''); setEstacionRegistro(''); setInspectorRegistro(''); setEmailRegistro(''); setPasswordRegistro('');
    } catch (error) {
      alert("Error al conectar con la base de datos.");
    }
  };

  const solicitarResetContrasena = async () => {
    const email = prompt("Introduce tu correo electrónico para solicitar una nueva contraseña:");
    if (!email) return;
    const userToReset = [...usuarios, ...usuariosPendientes].find(u => u.email.toLowerCase() === email.toLowerCase());
    if (userToReset) {
      await updateDoc(doc(db, 'usuarios', userToReset.id), { solicitaReset: true });
    }
    alert("Si el correo existe, se notificará al responsable para restablecer tu contraseña.");
  };

  const resetearPasswordResponsable = async (id) => {
    if (!window.confirm("¿Restablecer la contraseña a 'Itv1234*' ?")) return;
    await updateDoc(doc(db, 'usuarios', id), { password: 'Itv1234*', solicitaReset: false });
    alert("Contraseña restablecida a: Itv1234*");
  };

  const cambiarPasswordPropia = async () => {
    if (!passAntigua || !nuevaPass1 || !nuevaPass2) return alert("Por favor, completa todos los campos.");
    if (passAntigua !== usuarioActual.password) return alert("La contraseña antigua no es correcta.");
    if (nuevaPass1 !== nuevaPass2) return alert("Las contraseñas nuevas no coinciden.");
    
    await updateDoc(doc(db, 'usuarios', usuarioActual.id), { password: nuevaPass1 });
    setMostrarCambioPass(false); setPassAntigua(''); setNuevaPass1(''); setNuevaPass2('');
    alert("Tu contraseña ha sido actualizada con éxito.");
  };

  const cambiarFotoPerfil = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await compressImageBase64(file, 400, 0.8); // Perfil más pequeño
    await updateDoc(doc(db, 'usuarios', usuarioActual.id), { fotoPerfil: base64 });
  };

  const ascenderAJefe = async (id) => {
    if (!window.confirm("¿Hacer a este usuario Jefe de Estación?")) return;
    await updateDoc(doc(db, 'usuarios', id), { esJefe: true });
  };

  const quitarJefe = async (id) => {
    if (!window.confirm("¿Quitar el rango de Jefe de Estación?")) return;
    await updateDoc(doc(db, 'usuarios', id), { esJefe: false });
  };

  // --- LÓGICA DE VEHÍCULOS Y COMPLETADOS ---
  const getPuntosMarcados = (v) => {
    const pts = [];
    if (v.fotos?.frontal?.puntos) Object.keys(v.fotos.frontal.puntos).forEach(k => pts.push(k));
    if (v.fotos?.perfil?.puntos) Object.keys(v.fotos.perfil.puntos).forEach(k => pts.push(k));
    return pts;
  };

  const isCompletado = (v) => {
    const pts = getPuntosMarcados(v);
    const cat = v.categoria || 'M/N';
    if (cat === 'M/N') return ['bastidor', 'obd', 'bateria', 'r24db'].every(p => pts.includes(p));
    if (cat === 'L') return ['bastidor', 'bateria', 'r24db'].every(p => pts.includes(p));
    if (cat === 'O') return ['bastidor'].every(p => pts.includes(p));
    return false;
  };

  const buscarVehiculo = () => {
    setResultadosBusqueda(vehiculosGuardados.filter(v => v.marca.toLowerCase().includes(busqueda.marca.toLowerCase()) && v.modelo.toLowerCase().includes(busqueda.modelo.toLowerCase())));
  };

  const listadoFiltrado = filtroCompletados ? vehiculosGuardados.filter(v => isCompletado(v)) : resultadosBusqueda;

  const verPuntoDirecto = (vehiculo, vista, tipo) => {
    setVehiculoModal(vehiculo);
    const p = vehiculo.fotos[vista].puntos[tipo];
    if (p) {
      setPuntoActual({ vista, tipo, x: p.x, y: p.y, isEdit: false });
      setDetallePopup({ descripcion: p.descripcion || '', fotoDetalle: p.fotoDetalle || null });
      setModalAbierto(true);
    }
  };

  // FIREBASE CRUD VEHICULOS
  const bloquearVehiculo = async (id, e) => {
    e.stopPropagation();
    if(!window.confirm("¿Marcar como revisado y bloquear edición para inspectores?")) return;
    try {
      await updateDoc(doc(db, 'vehiculos', id), { bloqueado: true });
    } catch (error) {
      console.error("Error al bloquear:", error);
      alert("Error al comunicar con la nube.");
    }
  };

  const desbloquearVehiculo = async (id, e) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'vehiculos', id), { bloqueado: false });
    } catch (error) {
      console.error("Error al desbloquear:", error);
    }
  };

  const handleFotoVehiculo = async (vista, e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await compressImageBase64(file, 1024, 0.6); // Comprimir para evitar error 1MB
    
    if (isEdit) {
      setVehiculoDetalle(prev => ({...prev, fotos: { ...prev.fotos, [vista]: { ...prev.fotos[vista], url: base64 } }}));
    } else {
      setFotos(prev => ({ ...prev, [vista]: { ...prev[vista], url: base64 } }));
    }
  };

  const marcarPunto = (vista, e, isEdit = false) => {
    if (!modoMarcado) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPuntoActual({ vista, tipo: modoMarcado, x: (((e.clientX - rect.left) / rect.width) * 100).toFixed(1), y: (((e.clientY - rect.top) / rect.height) * 100).toFixed(1), isEdit });
    setModalAbierto(true);
  };

  const guardarDetalle = () => {
    const { vista, tipo, x, y, isEdit } = puntoActual;
    const punto = { x, y, descripcion: detallePopup.descripcion, fotoDetalle: detallePopup.fotoDetalle };
    const otraVista = vista === 'frontal' ? 'perfil' : 'frontal';

    if (isEdit) {
      setVehiculoDetalle(prev => {
        const nuevosPuntosOtraVista = { ...prev.fotos[otraVista].puntos };
        delete nuevosPuntosOtraVista[tipo];
        return {
          ...prev, fotos: {
            ...prev.fotos,
            [vista]: { ...prev.fotos[vista], puntos: { ...prev.fotos[vista].puntos, [tipo]: punto } },
            [otraVista]: { ...prev.fotos[otraVista], puntos: nuevosPuntosOtraVista }
          }
        };
      });
    } else {
      setFotos(prev => {
        const nuevosPuntosOtraVista = { ...prev[otraVista].puntos };
        delete nuevosPuntosOtraVista[tipo];
        return {
          ...prev,
          [vista]: { ...prev[vista], puntos: { ...prev[vista].puntos, [tipo]: punto } },
          [otraVista]: { ...prev[otraVista], puntos: nuevosPuntosOtraVista }
        };
      });
    }
    setModalAbierto(false); setModoMarcado(null); setVehiculoModal(null);
  };

  const guardarVehiculo = async () => {
    if (!nuevoVehiculo.marca || !nuevoVehiculo.modelo) return alert("Marca y Modelo obligatorios.");
    const vehiculoFinal = { 
      ...nuevoVehiculo, 
      fotos: JSON.parse(JSON.stringify(fotos)),
      bloqueado: false,
      modificadoPor: { 
        estacion: usuarioActual?.estacion || "", 
        inspector: usuarioActual?.inspector || "", 
        nombre: usuarioActual?.nombre || "" 
      }
    };
    try {
      await addDoc(collection(db, 'vehiculos'), vehiculoFinal);
      alert("¡El vehículo se ha guardado correctamente en la nube!");
      setNuevoVehiculo({ marca: '', modelo: '', anoInicio: '', anoFin: 'Actualidad', categoria: 'M/N' });
      setFotos({ frontal: { url: null, puntos: {} }, perfil: { url: null, puntos: {} } });
      setModoMarcado(null);
      setDetallePopup({ descripcion: '', fotoDetalle: null });
      setPuntoActual({ vista: '', tipo: '', x: 0, y: 0, isEdit: false });
      const fileFrontal = document.getElementById('new-frontal'); if (fileFrontal) fileFrontal.value = '';
      const filePerfil = document.getElementById('new-perfil'); if (filePerfil) filePerfil.value = '';
    } catch (error) {
      console.error("Error al guardar vehículo:", error);
      alert("Hubo un problema al guardar el vehículo en la nube. Revisa si la foto sigue siendo muy grande. Error: " + error.message);
    }
  };

  const eliminarVehiculo = async (id) => {
    if (!esMaestro) return alert("Solo la cuenta Maestra puede eliminar.");
    if (!window.confirm("¿Eliminar este vehículo definitivamente de la base de datos en la nube?")) return;
    try {
      await deleteDoc(doc(db, 'vehiculos', id));
      setVehiculoDetalle(null);
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("Hubo un error al intentar eliminar el vehículo.");
    }
  };

  const guardarEdicion = async () => {
    const vehiculoActualizado = { 
      ...vehiculoDetalle, 
      modificadoPor: { estacion: usuarioActual?.estacion || "", inspector: usuarioActual?.inspector || "", nombre: usuarioActual?.nombre || "" } 
    };
    const { id, ...dataSinId } = vehiculoActualizado; 
    try {
      await updateDoc(doc(db, 'vehiculos', id), dataSinId);
      setEditandoVehiculo(false);
      alert("Los cambios han sido guardados en la nube.");
    } catch (error) {
      console.error("Error al actualizar:", error);
      alert("Error al actualizar el vehículo. ¿Foto muy grande? Error: " + error.message);
    }
  };
  // ==========================================
  // LÓGICA ROBUSTA DE NEUMÁTICOS
  // ==========================================
  const parsearDiametros = (medidaTexto) => {
    let limpia = medidaTexto.toUpperCase().replace(/C/g, '').trim();
    const regex = /(\d{3})(?:\/(\d{2,3}))?\s*[A-Z\-]?\s*(\d{2,3})/;
    const match = limpia.match(regex);
    if (!match) return null;
    
    const ancho = parseInt(match[1], 10);
    const perfil = match[2] ? parseInt(match[2], 10) : 80;
    const llanta = parseInt(match[3], 10);
    
    const D_Formula = (2 * ancho * (perfil / 100)) + (llanta * 25.4);
    const D_ETRTO = D_Formula;
    return { D_Formula, D_ETRTO, original: medidaTexto.toUpperCase() };
  };

  const calcularDesviacionPorcentaje = (f, m) => {
    return (Math.abs(m - f) / f) * 100;
  };

  const esEquivalente = (diametroFicha, diametroMontado) => {
    if (!diametroFicha || !diametroMontado) return false;
    const diferencia = Math.abs(diametroMontado - diametroFicha) / diametroFicha;
    return diferencia <= 0.03; 
  };

  const actualizarMedidasManuales = (campo, valor) => {
    const nuevasMedidas = { ...medidasManuales, [campo]: valor };
    setMedidasManuales(nuevasMedidas);
    procesarTextoFicha(nuevasMedidas);
  };

  const procesarTextoFicha = (manuales) => {
    const detectadas = [];
    
    const extraerDeTexto = (texto, ejesValidosAsignados) => {
      if(!texto) return;
      const lineas = texto.split(/[\n,;]/);
      lineas.forEach(linea => {
        const match = linea.match(/(\d{3})(?:\/(\d{2,3}))?\s*[A-Za-z\-]?\s*(\d{2,3})[C]?(?:\s*M\+S)?/gi);
        if (match) {
          match.forEach(m => {
            const isMS = m.toUpperCase().includes('M+S');
            const calculos = parsearDiametros(m);
            if (calculos) {
              detectadas.push({
                 id: Date.now() + Math.random(),
                original: m.toUpperCase().trim(),
                ejes: ejesValidosAsignados,
                isMS: isMS,
                datos: calculos
              });
            }
          });
        }
      });
    };

    extraerDeTexto(manuales.todas, [1, 2, 3, 4]);
    extraerDeTexto(manuales.eje1, [1]);
    extraerDeTexto(manuales.eje2, [2]);
    extraerDeTexto(manuales.eje3, [3]);
    extraerDeTexto(manuales.eje4, [4]);

    setMedidasFicha(detectadas);
  };

  const ejecutarOCRGratuito = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcesandoOCR(true);
    
    Tesseract.recognize(file, 'spa')
      .then(({ data: { text } }) => {
        actualizarMedidasManuales('todas', medidasManuales.todas + (medidasManuales.todas ? '\n' : '') + text);
        setProcesandoOCR(false);
      })
      .catch(err => {
        alert("Error al leer la imagen. Asegúrate de que tenga buena iluminación.");
        setProcesandoOCR(false);
      });
  };

  const comprobarEquivalenciaRueda = (medidaMontada, ejeId) => {
    if (!medidaMontada) return null;
    const montadoDatos = parsearDiametros(medidaMontada);
    if (!montadoDatos) return { apto: false, msg: "Formato inválido" };

    const comparablesFicha = medidasFicha.filter(m => m.ejes.includes(ejeId) && !m.isMS);
    if (comparablesFicha.length === 0) return { apto: false, msg: "Falta base en Ficha" };

    let equivalentesCon = [];
    let menorPorcentajeFallo = Infinity; 

    for (let ficha of comparablesFicha) {
      const { D_Formula: fForm, D_ETRTO: fEtrto } = ficha.datos;
      const { D_Formula: mForm, D_ETRTO: mEtrto } = montadoDatos;

      if (esEquivalente(fEtrto, mEtrto) || esEquivalente(fEtrto, mForm) || esEquivalente(fForm, mForm) || esEquivalente(fForm, mEtrto)) {
        equivalentesCon.push(ficha.original);
      } else {
        const p1 = calcularDesviacionPorcentaje(fEtrto, mEtrto);
        const p2 = calcularDesviacionPorcentaje(fForm, mForm);
        const pMin = Math.min(p1, p2);
        if (pMin < menorPorcentajeFallo) menorPorcentajeFallo = pMin;
      }
    }

    if (equivalentesCon.length > 0) {
      return { apto: true, msg: `${equivalentesCon.join(' | ')}` };
    }
    
    const porcentajeTxt = menorPorcentajeFallo !== Infinity ? menorPorcentajeFallo.toFixed(2) + "%" : "";
    return { apto: false, msg: `Supera ±3% (${porcentajeTxt})` };
  };

  // --- COMPONENTES VISUALES ---
  const LogoItevelesa = () => (
    <div className="flex flex-col items-center mb-4">
      <h1 className="text-5xl font-black text-center italic uppercase tracking-tighter mb-2 text-gray-100 shadow-black drop-shadow-md">
        ITV <span className="text-[#2980b9]">EXPERT</span>
      </h1>
      
      <svg viewBox="0 0 700 150" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[250px] mx-auto drop-shadow-xl">
        <circle cx="80" cy="50" r="18" fill="#34495e" fillOpacity="0.5"/>
        <circle cx="150" cy="100" r="22" fill="#34495e" fillOpacity="0.5"/>
        <circle cx="280" cy="60" r="15" fill="#34495e" fillOpacity="0.5"/>
        <circle cx="70" cy="25" r="20" fill="#e67e22"/>
        <rect x="52.5" y="55" width="35" height="85" rx="17.5" fill="#2980b9"/>
        <rect x="120" y="5" width="35" height="135" rx="17.5" fill="#2980b9"/>
        <rect x="90" y="45" width="95" height="28" rx="14" fill="#2980b9"/>
        <rect x="200" y="40" width="35" height="100" rx="17.5" fill="#2980b9" transform="rotate(-15 217.5 90)"/>
        <rect x="240" y="30" width="35" height="100" rx="17.5" fill="#2980b9" transform="rotate(15 257.5 80)"/>
        <text x="320" y="110" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="44">
          <tspan fill="#e67e22">red</tspan> <tspan fill="#2980b9">itevelesa</tspan>
        </text>
      </svg>
    </div>
  );

  const BackgroundDecorative = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-[#e67e22] opacity-[0.06]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[#e67e22] opacity-[0.04]"></div>
      <div className="absolute top-1/2 right-1/3 w-24 h-24 rounded-full bg-[#2980b9] opacity-[0.06]"></div>
      <div className="absolute top-1/3 right-[10%] w-10 h-64 rounded-full bg-[#2980b9] opacity-[0.03] transform rotate(15)"></div>
      <div className="absolute top-1/3 left-[15%] w-8 h-48 rounded-full bg-[#e67e22] opacity-[0.03] transform rotate(-15)"></div>
    </div>
  );

  const renderBotonesModo = (cat) => {
    let botones = ['bastidor', 'obd', 'bateria', 'r24db'];
    if (cat === 'L') botones = ['bastidor', 'bateria', 'r24db'];
    if (cat === 'O') botones = ['bastidor'];

    const act = { bastidor: 'bg-red-600 text-white', obd: 'bg-yellow-500 text-black', bateria: 'bg-blue-600 text-white', r24db: 'bg-green-600 text-white' };
    const inact = { bastidor: 'bg-red-900/20 text-red-500 border border-red-500/30', obd: 'bg-yellow-900/20 text-yellow-500 border border-yellow-500/30', bateria: 'bg-blue-900/20 text-blue-500 border border-blue-500/30', r24db: 'bg-green-900/20 text-green-500 border border-green-500/30' };

    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {botones.map(t => (
          <button key={t} onClick={() => {setModoMarcado(t); setDetallePopup({descripcion:'', fotoDetalle:null});}} className={`flex-1 min-w-[70px] py-4 rounded-xl text-[8px] font-black uppercase transition-all ${modoMarcado === t ? act[t] + ' scale-105 shadow-lg' : inact[t]}`}>
            {t === 'r24db' ? 'R-24/dB' : t}
          </button>
        ))}
      </div>
    );
  };

  const renderRuedaInput = (eje, clave, label) => {
    const resultado = comprobarEquivalenciaRueda(eje.ruedas[clave], eje.id);
    return (
      <div className="flex-1 min-w-[120px]">
        <label className="text-[9px] text-gray-500 font-black uppercase mb-1 block">{label}</label>
        <input 
          type="text" 
          placeholder="Ej: 205/55R16 o 165R13" 
          className="w-full bg-[#060c17] border border-gray-700 p-3 rounded-xl text-xs font-bold uppercase focus:border-[#2980b9] outline-none text-white text-center transition-all"
          value={eje.ruedas[clave]}
          onChange={(e) => {
            const nuevos = ejesNeumaticos.map(ej => ej.id === eje.id ? {...ej, ruedas: {...ej.ruedas, [clave]: e.target.value.toUpperCase()}} : ej);
            setEjesNeumaticos(nuevos);
          }}
        />
        {eje.ruedas[clave] && resultado && (
          <div className={`mt-1 text-[9px] font-black uppercase text-center p-1.5 rounded-md border ${resultado.apto ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-red-900/30 text-red-400 border-red-500/30'}`}>
            {resultado.apto ? 'Apta con: ' + resultado.msg : 'No Apta: ' + resultado.msg}
          </div>
        )}
      </div>
    );
  };
  const renderContenido = () => {
    if (paginaActual === 'buscar') return (
      <div className="space-y-6">
        {!vehiculoDetalle ? (
          <>
            <div className="bg-[#101c33] p-6 rounded-3xl border border-gray-800 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-black italic uppercase text-[#2980b9]">Buscador</h2>
                {esMaestro && (
                  <button onClick={() => { setFiltroCompletados(!filtroCompletados); setResultadosBusqueda([]); }} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-colors border ${filtroCompletados ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-900/30' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                    {filtroCompletados ? '★ Viendo Todos Completados' : 'Ver Todos Completados'}
                  </button>
                )}
              </div>
              
              {!filtroCompletados && (
                <>
                  <div className="flex gap-2 mb-4 animate-fadeIn">
                    <input type="text" placeholder="MARCA" className="flex-1 bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-sm font-bold uppercase" value={busqueda.marca} onChange={e => setBusqueda({...busqueda, marca: e.target.value})} />
                    <input type="text" placeholder="MODELO" className="flex-1 bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-sm font-bold uppercase" value={busqueda.modelo} onChange={e => setBusqueda({...busqueda, modelo: e.target.value})} />
                  </div>
                  <div className="flex gap-2 animate-fadeIn">
                    <button onClick={buscarVehiculo} className="flex-[4] bg-[#2980b9] py-4 rounded-2xl font-black text-sm uppercase shadow-lg shadow-blue-900/30">Buscar</button>
                    <button onClick={() => {setBusqueda({marca:'',modelo:''}); setResultadosBusqueda([]);}} className="flex-1 bg-gray-800 border border-gray-700 rounded-2xl font-black text-lg">✕</button>
                  </div>
                </>
              )}
            </div>
            
            <div className="space-y-4">
              {listadoFiltrado.length === 0 && (busqueda.marca !== '' || filtroCompletados) && (
                  <p className="text-center text-gray-500 text-xs font-black uppercase p-8">No hay resultados para mostrar.</p>
              )}
              {listadoFiltrado.map(v => {
                const completado = isCompletado(v);
                return (
                <div key={v.id} className={`bg-[#101c33] p-4 rounded-3xl border ${v.bloqueado ? 'border-green-500/50 shadow-green-900/20' : completado ? 'border-yellow-500/30 shadow-yellow-900/10' : 'border-gray-800'} flex gap-4 shadow-lg relative transition-all flex-col sm:flex-row`}>
                  
                  {v.bloqueado && <div className="absolute -top-2 -right-2 bg-green-600 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-lg z-10">🔒</div>}

                  <div className="flex gap-2 flex-shrink-0 cursor-pointer" onClick={() => setVehiculoDetalle(v)}>
                    <div className="w-24 h-24 bg-black rounded-2xl overflow-hidden border border-gray-700 flex items-center justify-center">
                        {v.fotos.frontal?.url ? <img src={v.fotos.frontal.url} className="w-full h-full object-contain" /> : <div className="text-[10px] text-gray-700 font-bold uppercase">Frontal</div>}
                    </div>
                    <div className="w-24 h-24 bg-black rounded-2xl overflow-hidden border border-gray-700 flex items-center justify-center">
                        {v.fotos.perfil?.url ? <img src={v.fotos.perfil.url} className="w-full h-full object-contain" /> : <div className="text-[10px] text-gray-700 font-bold uppercase">Perfil</div>}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center cursor-pointer mt-3 sm:mt-0" onClick={() => setVehiculoDetalle(v)}>
                    <h4 className="font-black text-lg uppercase leading-tight">{v.marca} {v.modelo}</h4>
                    <p className="text-[#2980b9] font-bold text-xs mb-1 italic">{v.anoInicio} - {v.anoFin} <span className="text-gray-400">| Cat: {v.categoria || 'M/N'}</span></p>
                    
                    {v.modificadoPor && (
                      <p className="text-[9px] text-[#e67e22] font-black mb-1 uppercase tracking-widest bg-[#e67e22]/10 inline-block px-2 py-0.5 rounded">
                        Est. {v.modificadoPor.estacion} - Insp. {v.modificadoPor.inspector}
                      </p>
                    )}

                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {['bastidor', 'obd', 'bateria', 'r24db'].map(tipo => {
                        const vista = v.fotos?.frontal?.puntos?.[tipo] ? 'frontal' : v.fotos?.perfil?.puntos?.[tipo] ? 'perfil' : null;
                        if (!vista) return null;
                        const colorClass = tipo === 'bastidor' ? 'border-red-500 text-red-500 bg-red-500/10' : tipo === 'obd' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : tipo === 'bateria' ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-green-500 text-green-500 bg-green-500/10';
                        return (
                          <button key={tipo} onClick={(e) => { e.stopPropagation(); verPuntoDirecto(v, vista, tipo); }} className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${colorClass}`}>● {tipo === 'r24db' ? 'R-24' : tipo}</button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex flex-col gap-2 items-start">
                      {completado && !v.bloqueado && (
                        <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 text-[9px] px-2 py-1.5 rounded-lg font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> Pendiente de verificar
                        </span>
                      )}
                      
                      {v.bloqueado && (
                        <span className="bg-green-600/10 text-green-500 border border-green-500/30 text-[9px] px-2 py-1.5 rounded-lg font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm">
                         <span className="text-[10px]">✔</span> Vehículo Verificado
                        </span>
                      )}

                      {esMaestro && !v.bloqueado && (
                        <button onClick={(e) => bloquearVehiculo(v.id, e)} className="bg-green-900/40 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg hover:bg-green-600 hover:text-white transition-colors w-full text-center">✔ Verificar y Bloquear</button>
                      )}
                      {esMaestro && v.bloqueado && (
                        <button onClick={(e) => desbloquearVehiculo(v.id, e)} className="bg-orange-900/40 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg hover:bg-orange-600 hover:text-white transition-colors w-full text-center">🔓 Desbloquear Edición</button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2 border-t sm:border-t-0 sm:border-l border-gray-800 pt-3 sm:pt-0 sm:pl-3 justify-center mt-3 sm:mt-0">
                    {(!v.bloqueado || esMaestro) ? (
                      <button onClick={(e) => { e.stopPropagation(); setVehiculoDetalle(v); setEditandoVehiculo(true); }} className="flex-1 sm:flex-none bg-[#2980b9]/20 text-[#2980b9] p-3 rounded-xl border border-[#2980b9]/30 hover:bg-[#2980b9] hover:text-white transition-colors text-center">✏️</button>
                    ) : (
                      <div className="p-3 text-gray-600 text-xl cursor-not-allowed text-center">🔒</div>
                    )}
                    {esMaestro && <button onClick={(e) => { e.stopPropagation(); eliminarVehiculo(v.id); }} className="flex-1 sm:flex-none bg-red-900/20 text-red-500 border border-red-500/20 p-3 rounded-xl hover:bg-red-600 hover:text-white transition-colors text-center">🗑️</button>}
                  </div>
                </div>
              )})}
            </div>
          </>
        ) : (
            <div className="bg-[#101c33] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
            <button onClick={() => {setVehiculoDetalle(null); setEditandoVehiculo(false);}} className="mb-6 text-[#2980b9] font-black text-xs uppercase bg-[#2980b9]/10 border border-[#2980b9]/20 px-4 py-2 rounded-xl">← Volver al listado</button>
            {editandoVehiculo ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl font-bold uppercase" value={vehiculoDetalle.marca} onChange={e => setVehiculoDetalle({...vehiculoDetalle, marca: e.target.value})} />
                  <input type="text" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl font-bold uppercase" value={vehiculoDetalle.modelo} onChange={e => setVehiculoDetalle({...vehiculoDetalle, modelo: e.target.value})} />
                  <select className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl font-bold uppercase text-xs col-span-2 text-[#2980b9]" value={vehiculoDetalle.categoria || 'M/N'} onChange={e => setVehiculoDetalle({...vehiculoDetalle, categoria: e.target.value})}>
                    <option value="M/N">Categoría M/N (Todos)</option>
                    <option value="L">Categoría L (Bastidor, Bat, R-24/dB)</option>
                    <option value="O">Categoría O (Solo Bastidor)</option>
                  </select>
                </div>
                {['frontal', 'perfil'].map(vista => (
                  <div key={vista} className="bg-[#060c17] p-4 rounded-3xl border border-gray-800">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black text-gray-500 uppercase">{vista}</span>
                      <input type="file" id={`edit-${vista}`} className="hidden" onChange={e => handleFotoVehiculo(vista, e, true)} />
                      <label htmlFor={`edit-${vista}`} className="text-[9px] bg-[#2980b9] px-3 py-1 rounded-lg font-black cursor-pointer uppercase text-white shadow-lg shadow-blue-900/30">Cambiar Foto</label>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-black cursor-crosshair aspect-video flex items-center justify-center" onClick={e => marcarPunto(vista, e, true)}>
                      {vehiculoDetalle.fotos[vista]?.url ? (
                        <>
                          <img src={vehiculoDetalle.fotos[vista].url} className="w-full h-full object-contain opacity-80 hover:opacity-100 transition-opacity" />
                          {Object.entries(vehiculoDetalle.fotos[vista].puntos).map(([tipo, p]) => (
                            <div key={tipo} className={`absolute w-6 h-6 rounded-full border-2 border-white shadow-xl ${tipo==='bastidor'?'bg-red-600':tipo==='obd'?'bg-yellow-500':tipo==='bateria'?'bg-blue-600':'bg-green-600'}`} style={{left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%, -50%)'}} />
                          ))}
                        </>
                      ) : <div className="p-8 text-center text-gray-600 uppercase font-black text-xs">Sin imagen</div>}
                    </div>
                  </div>
                ))}
                {renderBotonesModo(vehiculoDetalle.categoria || 'M/N')}
                <button onClick={guardarEdicion} className="w-full bg-green-600 py-5 rounded-3xl font-black uppercase shadow-lg shadow-green-900/40 text-white">Guardar Cambios</button>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-3xl font-black uppercase italic leading-tight">{vehiculoDetalle.marca}</h3>
                  {vehiculoDetalle.bloqueado && <span className="bg-green-600 text-white text-[10px] px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-lg">Verificado</span>}
                </div>
                <h4 className="text-xl font-bold text-[#2980b9] uppercase -mt-1">{vehiculoDetalle.modelo}</h4>
                <p className="text-xs text-gray-500 font-bold mb-4 uppercase mt-1">Categoría: {vehiculoDetalle.categoria || 'M/N'}</p>
                {['frontal', 'perfil'].map(vista => (
                  <div key={vista} className="mb-8">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-2 ml-1">{vista}</p>
                    <div className="relative rounded-3xl overflow-hidden border border-gray-700 bg-black shadow-2xl aspect-video flex items-center justify-center">
                      {vehiculoDetalle.fotos[vista]?.url ? (
                        <>
                          <img src={vehiculoDetalle.fotos[vista].url} className="w-full h-full object-contain" />
                          {Object.entries(vehiculoDetalle.fotos[vista].puntos).map(([tipo, p]) => (
                            <div key={tipo} className={`absolute w-8 h-8 rounded-full border-2 border-white flex items-center justify-center cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.8)] active:scale-125 transition-transform ${tipo==='bastidor'?'bg-red-600':tipo==='obd'?'bg-yellow-500':tipo==='bateria'?'bg-blue-600':'bg-green-600'}`} style={{left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%, -50%)'}} 
                                 onClick={() => {
                                   setVehiculoModal(vehiculoDetalle);
                                   setPuntoActual({vista, tipo, x:p.x, y:p.y}); 
                                   setDetallePopup({descripcion: p.descripcion, fotoDetalle: p.fotoDetalle}); setModalAbierto(true);
                                 }}>
                              <span className="text-[10px] font-black uppercase text-white shadow-sm">{tipo==='r24db'?'R':tipo[0]}</span>
                            </div>
                          ))}
                        </>
                      ) : <div className="p-8 text-center text-gray-800 uppercase font-black italic">Sin foto</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );

    if (paginaActual === 'añadir') return (
      <div className="space-y-6">
        <div className="bg-[#101c33] p-6 rounded-3xl border border-gray-800 shadow-xl">
          <h2 className="text-xl font-black mb-4 italic uppercase text-[#2980b9]">Alta Vehículo</h2>
          
          <select className="w-full mb-3 bg-[#060c17] border border-gray-700 p-4 rounded-2xl font-bold uppercase text-xs text-[#2980b9] focus:border-[#2980b9] outline-none" value={nuevoVehiculo.categoria} onChange={e => setNuevoVehiculo({...nuevoVehiculo, categoria: e.target.value})}>
            <option value="M/N">Categoría M/N (Requiere todos los puntos)</option>
            <option value="L">Categoría L (Requiere Bastidor, Batería, R-24/dB)</option>
            <option value="O">Categoría O (Requiere solo Bastidor)</option>
          </select>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <input type="text" placeholder="MARCA" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl font-bold uppercase text-sm focus:border-[#2980b9] outline-none" value={nuevoVehiculo.marca} onChange={e => setNuevoVehiculo({...nuevoVehiculo, marca: e.target.value.toUpperCase()})} />
            <input type="text" placeholder="MODELO" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl font-bold uppercase text-sm focus:border-[#2980b9] outline-none" value={nuevoVehiculo.modelo} onChange={e => setNuevoVehiculo({...nuevoVehiculo, modelo: e.target.value.toUpperCase()})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="AÑO INICIO" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl font-bold text-sm focus:border-[#2980b9] outline-none" value={nuevoVehiculo.anoInicio} onChange={e => setNuevoVehiculo({...nuevoVehiculo, anoInicio: e.target.value})} />
            <input type="text" placeholder="AÑO FIN" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl font-bold text-sm focus:border-[#2980b9] outline-none" value={nuevoVehiculo.anoFin} onChange={e => setNuevoVehiculo({...nuevoVehiculo, anoFin: e.target.value})} />
          </div>
        </div>
        {['frontal', 'perfil'].map(vista => (
          <div key={vista} className="bg-[#101c33] p-4 rounded-3xl border border-gray-800 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-black text-gray-500 uppercase">{vista}</span>
              <input type="file" id={`new-${vista}`} className="hidden" onChange={e => handleFotoVehiculo(vista, e)} />
              <label htmlFor={`new-${vista}`} className="bg-[#2980b9] px-5 py-2 rounded-xl text-[10px] font-black cursor-pointer uppercase text-white shadow-lg shadow-blue-900/30">1. Cargar Foto</label>
            </div>
            <div className="relative bg-[#060c17] rounded-2xl overflow-hidden border-2 border-dashed border-gray-700 aspect-video flex items-center justify-center cursor-crosshair" onClick={e => marcarPunto(vista, e)}>
              {fotos[vista].url ? (
                <>
                  <img src={fotos[vista].url} className="w-full h-full object-contain opacity-80" />
                  {Object.entries(fotos[vista].puntos).map(([tipo, p]) => (
                    <div key={tipo} className={`absolute w-6 h-6 rounded-full border-2 border-white shadow-xl ${tipo==='bastidor'?'bg-red-600':tipo==='obd'?'bg-yellow-500':tipo==='bateria'?'bg-blue-600':'bg-green-600'}`} style={{left:`${p.x}%`, top:`${p.y}%`, transform:'translate(-50%, -50%)'}} />
                  ))}
                </>
              ) : <span className="text-gray-700 font-black uppercase text-[10px]">Toque arriba para añadir imagen</span>}
            </div>
          </div>
        ))}
        <div className="bg-[#060c17] p-4 rounded-3xl border border-gray-800">
          <p className="text-[10px] font-black text-center text-gray-500 uppercase mb-3">2. Seleccione un elemento y marque en la foto</p>
          {renderBotonesModo(nuevoVehiculo.categoria)}
        </div>
        <button onClick={guardarVehiculo} className="w-full bg-green-600 py-6 rounded-3xl font-black text-xl uppercase shadow-green-900/40 shadow-2xl text-white">Guardar Vehículo</button>
      </div>
    );

    if (paginaActual === 'perfil') return (
      <div className="space-y-8">
        <div className="bg-[#101c33] p-8 rounded-[2.5rem] border border-gray-800 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#2980b9] opacity-[0.05]"></div>
          
          <div className="relative w-24 h-24 mx-auto mb-4 z-10 group">
            <input type="file" id="foto-perfil" className="hidden" accept="image/*" onChange={cambiarFotoPerfil} />
            <label htmlFor="foto-perfil" className="w-full h-full rounded-full cursor-pointer overflow-hidden flex items-center justify-center bg-[#2980b9] text-4xl font-black text-white shadow-lg shadow-blue-900/30 border-4 border-[#101c33] relative">
              {usuarioActual.fotoPerfil ? (
                <>
                  <img src={usuarioActual.fotoPerfil} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-[10px] uppercase font-bold tracking-widest transition-all">Cambiar</div>
                </>
              ) : (
                <>
                  <span>{usuarioActual.nombre[0]}</span>
                  <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-[10px] uppercase font-bold text-center leading-tight transition-all">Añadir<br/>Foto</div>
                </>
              )}
            </label>
          </div>

          <h2 className="text-2xl font-black uppercase italic">{usuarioActual.nombre}</h2>
          <p className="text-[#2980b9] font-bold text-xs mb-2">{usuarioActual.email}</p>
          <div className="mt-4">
            {!mostrarCambioPass ? (
              <button onClick={() => setMostrarCambioPass(true)} className="text-[10px] bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl font-black uppercase text-gray-300">Cambiar Mi Contraseña</button>
            ) : (
              <div className="bg-[#060c17] p-5 rounded-2xl border border-gray-700 mt-2 space-y-3 relative z-10 shadow-xl">
                <input type="password" placeholder="CONTRASEÑA ANTIGUA" className="w-full bg-[#101c33] border border-gray-600 p-3 rounded-xl text-xs font-bold focus:border-[#2980b9] outline-none" value={passAntigua} onChange={e => setPassAntigua(e.target.value)} />
                <div className="h-px bg-gray-800 w-full my-2"></div>
                <input type="password" placeholder="NUEVA CONTRASEÑA" className="w-full bg-[#101c33] border border-gray-600 p-3 rounded-xl text-xs font-bold focus:border-[#2980b9] outline-none" value={nuevaPass1} onChange={e => setNuevaPass1(e.target.value)} />
                <input type="password" placeholder="REPETIR CONTRASEÑA" className="w-full bg-[#101c33] border border-gray-600 p-3 rounded-xl text-xs font-bold focus:border-[#2980b9] outline-none" value={nuevaPass2} onChange={e => setNuevaPass2(e.target.value)} />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => {setMostrarCambioPass(false); setPassAntigua(''); setNuevaPass1(''); setNuevaPass2('');}} className="flex-1 bg-gray-800 py-3 rounded-xl text-[10px] font-black uppercase text-gray-300">Cancelar</button>
                  <button onClick={cambiarPasswordPropia} className="flex-1 bg-green-600 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg text-white">Confirmar</button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {(esMaestro || esJefe) && (
          <div className="space-y-6">
            <h3 className="text-xl font-black ml-2 uppercase italic text-[#2980b9]">Gestión de Personal</h3>
            <p className="text-xs text-gray-500 ml-2 mb-2 font-bold">
              {esMaestro ? "Cuentas Maestras ven todas las estaciones." : `Viendo solo cuentas de la Estación ${usuarioActual.estacion}.`}
            </p>
            <div className="space-y-3">
              {[...usuarios, ...usuariosPendientes].filter(u => u.email !== "danielcasgar89@gmail.com" && (esMaestro || u.estacion === usuarioActual.estacion)).map(u => (
                <div key={u.id} className="bg-[#101c33] rounded-3xl border border-gray-800 overflow-hidden shadow-lg">
                  <div className="p-5 flex justify-between items-center cursor-pointer" onClick={() => setUsuarioExpandido(usuarioExpandido === u.id ? null : u.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2980b9] flex-shrink-0 flex items-center justify-center text-white font-black overflow-hidden border-2 border-gray-800">
                        {u.fotoPerfil ? <img src={u.fotoPerfil} className="w-full h-full object-cover" /> : u.nombre[0]}
                      </div>
                      <div>
                        <p className="font-black uppercase text-sm flex items-center gap-2 relative z-10">
                          {u.nombre} {u.esJefe && <span className="text-[8px] bg-purple-500 text-white px-1.5 py-0.5 rounded">JEFE</span>}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold">Insp: {u.inspector} - Est: {u.estacion}</p>
                        {u.solicitaReset && <span className="text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-black mt-1 inline-block uppercase border border-red-500/30">Pide Reset</span>}
                        {!u.activo && <span className="text-[8px] bg-[#e67e22]/10 text-[#e67e22] px-2 py-0.5 rounded font-black mt-1 ml-1 inline-block uppercase border border-[#e67e22]/30">Pendiente</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 relative z-20">
                      {!u.activo ? (
                        <>
                          <button onClick={async (e) => { e.stopPropagation(); await updateDoc(doc(db, 'usuarios', u.id), { activo: true }); }} className="bg-green-600 text-white p-3 rounded-xl shadow-lg shadow-green-900/40">✓</button>
                          <button onClick={async (e) => { e.stopPropagation(); await deleteDoc(doc(db, 'usuarios', u.id)); }} className="bg-red-600 text-white p-3 rounded-xl shadow-lg shadow-red-900/40">✕</button>
                        </>
                      ) : (
                        <button onClick={async (e) => { e.stopPropagation(); if(window.confirm("¿Borrar usuario?")){ await deleteDoc(doc(db, 'usuarios', u.id)); } }} className="text-red-500 text-[10px] font-black uppercase px-3 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors">Borrar</button>
                      )}
                    </div>
                  </div>
                  {usuarioExpandido === u.id && u.activo && (
                    <div className="bg-[#060c17] p-5 border-t border-gray-800 text-xs space-y-3 relative z-10">
                      <p><span className="text-gray-500 font-black uppercase">Nombre:</span> <span className="font-bold text-white">{u.nombre}</span></p>
                      <p><span className="text-gray-500 font-black uppercase">Correo:</span> <span className="font-bold text-[#2980b9]">{u.email}</span></p>
                      {esMaestro && (
                        <div className="mt-3 pt-3 border-t border-gray-800">
                          {u.esJefe ? <button onClick={() => quitarJefe(u.id)} className="w-full bg-purple-900/20 text-purple-400 border border-purple-500/30 py-3 rounded-xl font-black uppercase text-[10px]">Quitar rol de Jefe</button> : <button onClick={() => ascenderAJefe(u.id)} className="w-full bg-purple-600 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg">Ascender a Jefe</button>}
                        </div>
                      )}
                      <button onClick={() => resetearPasswordResponsable(u.id)} className="w-full mt-2 bg-[#e67e22]/20 text-[#e67e22] border border-[#e67e22]/30 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg">Restablecer Contraseña Empleado</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={() => {setUsuarioActual(null); setPaginaActual('login'); setEsMaestro(false); setEsJefe(false);}} className="w-full bg-red-600/10 text-red-500 border border-red-500/20 py-5 rounded-3xl font-black uppercase active:scale-95 transition-all shadow-lg hover:bg-red-600 hover:text-white mt-6">Cerrar Sesión</button>
      </div>
    );

    if (paginaActual === 'neumaticos') return (
      <div className="space-y-6 animate-fadeIn pb-10">
        <div className="bg-[#101c33] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl relative overflow-hidden">
          <h2 className="text-2xl font-black italic uppercase text-[#e67e22] mb-1">Cálculo 4 Vías</h2>
          <h3 className="text-3xl font-black italic uppercase text-[#2980b9] tracking-tighter mb-4">Equivalencias</h3>
          
          <div className="bg-[#060c17] p-4 rounded-2xl border border-gray-700 mb-6">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-3">1. Datos Ficha Técnica (Tarjeta ITV)</p>
            
            <div className="flex gap-2 mb-4">
              <input type="file" id="ocr-upload" className="hidden" accept="image/*" onChange={ejecutarOCRGratuito} />
              <label htmlFor="ocr-upload" className={`flex-1 bg-[#2980b9] text-center py-3 rounded-xl text-[10px] font-black cursor-pointer uppercase text-white shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 ${procesandoOCR ? 'opacity-50 pointer-events-none' : ''}`}>
                {procesandoOCR ? '⏳ Escaneando...' : '📷 Escanear Tarjeta (Tesseract)'}
              </label>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-gray-500 w-16">Todas:</span>
                <input type="text" className="flex-1 bg-[#101c33] border border-gray-600 rounded-xl p-2.5 text-xs font-bold text-gray-300 outline-none uppercase" placeholder="Para todos los ejes..." value={medidasManuales.todas} onChange={(e) => actualizarMedidasManuales('todas', e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-gray-500 w-16">Eje 1:</span>
                <input type="text" className="flex-1 bg-[#101c33] border border-gray-600 rounded-xl p-2.5 text-xs font-bold text-gray-300 outline-none uppercase" placeholder="Solo eje 1..." value={medidasManuales.eje1} onChange={(e) => actualizarMedidasManuales('eje1', e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-gray-500 w-16">Eje 2:</span>
                <input type="text" className="flex-1 bg-[#101c33] border border-gray-600 rounded-xl p-2.5 text-xs font-bold text-gray-300 outline-none uppercase" placeholder="Solo eje 2..." value={medidasManuales.eje2} onChange={(e) => actualizarMedidasManuales('eje2', e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-gray-500 w-16">Eje 3:</span>
                <input type="text" className="flex-1 bg-[#101c33] border border-gray-600 rounded-xl p-2.5 text-xs font-bold text-gray-300 outline-none uppercase" placeholder="Solo eje 3..." value={medidasManuales.eje3} onChange={(e) => actualizarMedidasManuales('eje3', e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-gray-500 w-16">Eje 4:</span>
                <input type="text" className="flex-1 bg-[#101c33] border border-gray-600 rounded-xl p-2.5 text-xs font-bold text-gray-300 outline-none uppercase" placeholder="Solo eje 4..." value={medidasManuales.eje4} onChange={(e) => actualizarMedidasManuales('eje4', e.target.value)} />
               </div>
            </div>
          </div>

          {medidasFicha.length > 0 && (
            <div className="mb-6 bg-[#060c17] p-3 rounded-2xl border border-green-900/50">
              <p className="text-[10px] text-green-500 font-black uppercase mb-2">Medidas de Referencia (Filtradas):</p>
              <div className="flex flex-wrap gap-2">
                {medidasFicha.map(m => (
                  <span key={m.id} className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${m.isMS ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-[#2980b9] text-[#2980b9] bg-[#2980b9]/10'}`}>
                    {m.original} {m.isMS ? '(Ignorado M+S)' : `(Ejes: ${m.ejes.length === 4 ? 'Todos' : m.ejes.join(', ')})`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 mt-6">
            <p className="text-[10px] text-[#e67e22] font-bold uppercase">2. Configuración de Ejes a Comprobar</p>
            <select 
              className="bg-[#060c17] text-[#2980b9] text-xs font-black uppercase border border-gray-700 p-2 rounded-lg outline-none" 
              value={numEjesConfig} 
              onChange={(e) => setNumEjesConfig(Number(e.target.value))}
            >
              <option value={2}>2 Ejes</option>
              <option value={3}>3 Ejes</option>
              <option value={4}>4 Ejes</option>
            </select>
          </div>

          <div className="space-y-4">
            {ejesNeumaticos.slice(0, numEjesConfig).map((eje) => (
              <div key={eje.id} className="bg-[#060c17] p-4 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-black uppercase text-gray-200">EJE {eje.id}</h4>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={eje.gemela}
                      onChange={() => {
                        const nuevos = ejesNeumaticos.map(ej => ej.id === eje.id ? {...ej, gemela: !ej.gemela} : ej);
                        setEjesNeumaticos(nuevos);
                      }}
                    />
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${eje.gemela ? 'bg-[#e67e22]' : 'bg-gray-700'}`}>
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${eje.gemela ? 'left-6' : 'left-1'}`}></div>
                    </div>
                    <span className="text-[9px] font-black uppercase text-gray-400">Rueda Gemela</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!eje.gemela ? (
                    <>
                      {renderRuedaInput(eje, 'izq', 'Izquierda')}
                      {renderRuedaInput(eje, 'der', 'Derecha')}
                    </>
                  ) : (
                    <div className="w-full grid grid-cols-2 gap-x-3 gap-y-4">
                      {renderRuedaInput(eje, 'izqExt', 'Izq. Ext.')}
                      {renderRuedaInput(eje, 'derExt', 'Der. Ext.')}
                      {renderRuedaInput(eje, 'izqInt', 'Izq. Int.')}
                      {renderRuedaInput(eje, 'derInt', 'Der. Int.')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
    return null;
  };

  return (
    <div className="min-h-screen bg-[#081021] text-gray-100 font-sans flex flex-col relative z-0">
      <BackgroundDecorative />

      {paginaActual === 'login' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-20 overflow-y-auto">
          <LogoItevelesa />
          
          <div className="bg-[#101c33] p-8 rounded-[3rem] border border-gray-800 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#e67e22] rounded-t-full"></div>
            <h2 className="text-2xl font-black text-center mb-8 italic uppercase text-gray-300 tracking-widest">Portal<br/><span className="text-sm text-[#2980b9]">Inspectores</span></h2>
            <div className="space-y-4">
              <input type="text" placeholder="CORREO ELECTRÓNICO" className="w-full bg-[#060c17] border border-gray-700 p-5 rounded-2xl font-bold text-sm focus:border-[#2980b9] outline-none text-white" value={loginInput} onChange={e => setLoginInput(e.target.value)} />
              <input type="password" placeholder="CONTRASEÑA" className="w-full bg-[#060c17] border border-gray-700 p-5 rounded-2xl font-bold text-sm focus:border-[#2980b9] outline-none text-white" value={passwordLogin} onChange={e => setPasswordLogin(e.target.value)} />
              <button onClick={hacerLogin} className="w-full bg-[#2980b9] py-5 rounded-2xl font-black text-lg uppercase active:scale-95 transition-all shadow-xl shadow-blue-900/40 text-white">Acceder</button>
              <button onClick={solicitarResetContrasena} className="w-full text-gray-500 font-bold text-xs uppercase py-2 hover:text-gray-300 transition-colors">¿Olvidaste tu contraseña?</button>
            </div>
          </div>

          <div className="bg-[#101c33] p-8 rounded-[3rem] border border-gray-800 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] mt-6">
               <p className="text-center text-[10px] font-black uppercase text-[#e67e22] mb-6 italic tracking-widest">Nuevo Registro</p>
               <input type="text" placeholder="NOMBRE COMPLETO" className="w-full bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase mb-3 focus:border-[#2980b9] outline-none text-white" value={nombreRegistro} onChange={e => setNombreRegistro(e.target.value)} />
               <div className="grid grid-cols-2 gap-3 mb-3">
                 <input type="number" placeholder="Nº ESTACIÓN" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase focus:border-[#2980b9] outline-none text-white" value={estacionRegistro} onChange={e => setEstacionRegistro(e.target.value)} />
                 <input type="text" placeholder="Nº INSPECTOR" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase focus:border-[#2980b9] outline-none text-white" value={inspectorRegistro} onChange={e => setInspectorRegistro(e.target.value)} />
               </div>
               <input type="email" placeholder="CORREO ELECTRÓNICO" className="w-full bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase mb-3 focus:border-[#2980b9] outline-none text-white" value={emailRegistro} onChange={e => setEmailRegistro(e.target.value)} />
               <input type="password" placeholder="CONTRASEÑA" className="w-full bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase mb-5 focus:border-[#2980b9] outline-none text-white" value={passwordRegistro} onChange={e => setPasswordRegistro(e.target.value)} />
               <button onClick={registrarUsuario} className="w-full bg-gray-800 border border-gray-700 py-4 rounded-2xl font-black text-[10px] uppercase active:scale-95 hover:bg-gray-700 text-gray-300">Solicitar Acceso</button>
          </div>
        </div>
      )}

      {usuarioActual && (
        <>
          <header className="p-5 bg-[#101c33]/90 backdrop-blur-md border-b border-gray-800 flex justify-between items-center sticky top-0 z-40 shadow-lg">
            <h1 className="text-xl font-black italic uppercase text-gray-100 tracking-tighter">ITV <span className="text-[#2980b9]">EXPERT</span></h1>
            <div className="text-right flex items-center gap-3">
                <div>
                  <p className="text-[7px] font-black uppercase text-[#e67e22] tracking-widest bg-[#e67e22]/10 px-2 py-0.5 rounded inline-block mb-1">Est. {usuarioActual.estacion}</p>
                  <p className="text-xs font-bold text-[#2980b9] uppercase">Insp. {usuarioActual.inspector}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#2980b9] border border-[#2980b9] flex items-center justify-center overflow-hidden text-xs font-black shadow-md">
                   {usuarioActual.fotoPerfil ? <img src={usuarioActual.fotoPerfil} className="w-full h-full object-cover" /> : usuarioActual.nombre[0]}
                </div>
            </div>
          </header>
          <main className="flex-1 p-4 overflow-y-auto pb-24 z-10">{renderContenido()}</main>
          <nav className="fixed bottom-0 left-0 right-0 bg-[#101c33]/95 backdrop-blur-md border-t border-gray-800 p-4 flex justify-around items-center z-50 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            {[{id:'buscar', icon:'🔍', label:'BUSCAR'}, {id:'añadir', icon:'➕', label:'AÑADIR'}, {id:'neumaticos', icon:'🛞', label:'NEUMÁTICOS'}, {id:'perfil', icon:'👤', label:'PERFIL'}].map(item => (
              <div key={item.id} onClick={() => {setPaginaActual(item.id); setVehiculoDetalle(null);}} className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${paginaActual === item.id ? 'text-[#e67e22] scale-110' : 'text-gray-500 opacity-70 hover:opacity-100'}`}>
                <span className="text-2xl drop-shadow-md">{item.icon}</span><span className="text-[9px] font-black tracking-tighter">{item.label}</span>
              </div>
            ))}
          </nav>
          
          {modalAbierto && (
            <div className="fixed inset-0 bg-[#081021]/95 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
              <div className="bg-[#101c33] rounded-[2.5rem] p-8 w-full max-w-md border border-gray-800 flex flex-col max-h-[90vh] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)]">
                
                {!editandoVehiculo && paginaActual !== 'añadir' && vehiculoModal && (
                  <div className="flex justify-center gap-2 mb-6 bg-[#060c17] p-2 rounded-2xl border border-gray-800 overflow-x-auto custom-scrollbar-thin shadow-inner">
                    {['bastidor', 'obd', 'bateria', 'r24db'].map(t => {
                       const v = vehiculoModal;
                       const vistaPunto = v.fotos?.frontal?.puntos?.[t] ? 'frontal' : v.fotos?.perfil?.puntos?.[t] ? 'perfil' : null;
                       if (!vistaPunto) return null;
                       const colorClass = t === 'bastidor' ? 'bg-red-600 text-white border-red-400 shadow-red-900/40' : t === 'obd' ? 'bg-yellow-500 text-black border-yellow-300 shadow-yellow-900/40' : t === 'bateria' ? 'bg-blue-600 text-white border-blue-400 shadow-blue-900/40' : 'bg-green-600 text-white border-green-400 shadow-green-900/40';
                       const isCurrent = puntoActual.tipo === t;
                       
                       return (
                         <button key={t} onClick={() => { const p = v.fotos[vistaPunto].puntos[t]; setPuntoActual({ vista: vistaPunto, tipo: t, x: p.x, y: p.y, isEdit: false }); setDetallePopup({ descripcion: p.descripcion || '', fotoDetalle: p.fotoDetalle || null }); }}
                           className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all flex-1 text-center whitespace-nowrap active:scale-95 ${isCurrent ? colorClass + ' scale-105 shadow-xl border-2' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                           {t === 'r24db' ? 'R-24' : t}
                         </button>
                       )
                    })}
                  </div>
                )}

                <h3 className="font-black text-2xl mb-4 text-[#2980b9] uppercase italic drop-shadow-sm">Ubicación: {puntoActual.tipo === 'r24db' ? 'R-24/dB' : puntoActual.tipo.toUpperCase()}</h3>
                
                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 relative z-10">
                  <textarea placeholder="Descripción (opcional)..." className="w-full h-28 bg-[#060c17] border border-gray-800 rounded-3xl p-5 text-sm font-bold text-white outline-none resize-none focus:border-[#2980b9] shadow-inner" value={detallePopup.descripcion} onChange={e => setDetallePopup({ ...detallePopup, descripcion: e.target.value })} readOnly={!editandoVehiculo && paginaActual !== 'añadir'} />
                  
                  {(editandoVehiculo || paginaActual === 'añadir') && (
                     <div className="flex justify-center mt-2">
                       <input type="file" id="foto-detalle" className="hidden" accept="image/*" onChange={async (e) => {
                         const file = e.target.files[0];
                         if (file) setDetallePopup({...detallePopup, fotoDetalle: await compressImageBase64(file, 800, 0.6)});
                       }} />
                       <label htmlFor="foto-detalle" className="bg-gray-800 text-white px-4 py-3 rounded-xl text-[10px] font-black cursor-pointer uppercase border border-gray-700 shadow-lg hover:bg-gray-700 transition-colors">
                         {detallePopup.fotoDetalle ? "Cambiar Foto Detalle" : "Añadir Foto Detalle"}
                       </label>
                     </div>
                  )}

                  {detallePopup.fotoDetalle && (
                    <div className="rounded-3xl overflow-hidden bg-black flex justify-center mt-2 relative border border-gray-800 shadow-xl">
                      <img src={detallePopup.fotoDetalle} className="w-full h-auto max-h-48 object-contain" />
                      {(editandoVehiculo || paginaActual === 'añadir') && (
                        <button onClick={() => setDetallePopup({...detallePopup, fotoDetalle: null})} className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-black shadow-xl scale-90 hover:scale-100 transition-transform">X</button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-6 mt-auto z-20">
                  <button onClick={() => {setModalAbierto(false); setVehiculoModal(null);}} className="flex-1 py-4 bg-gray-800 rounded-2xl font-black text-[9px] uppercase border border-gray-700 active:scale-95 transition-transform tracking-widest text-gray-300 hover:text-white">Cerrar Info</button>
                  {(editandoVehiculo || paginaActual === 'añadir') && (<button onClick={guardarDetalle} className="flex-1 py-4 bg-[#2980b9] rounded-2xl font-black text-[9px] uppercase active:scale-95 transition-transform tracking-widest text-white shadow-xl shadow-blue-900/40">Guardar</button>)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      <style dangerouslySetInnerHTML={{ __html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        ::-webkit-scrollbar { width: 0px; height: 0px; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #060c17; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2980b9; border-radius: 10px; }
        .custom-scrollbar-thin::-webkit-scrollbar { height: 3px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #2980b9; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
}

export default App;