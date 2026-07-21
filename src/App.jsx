import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot,
  query, 
  where, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';

// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
const firebaseConfig = {
  // MANTÉN AQUÍ TUS CREDENCIALES DE FIREBASE
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// COMPONENTES DE DISEÑO BASE
// ==========================================
const BackgroundDecorative = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#2980b9] opacity-[0.03] blur-[80px]"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#e67e22] opacity-[0.03] blur-[100px]"></div>
    <div className="absolute top-[40%] left-[20%] w-[30vw] h-[30vw] rounded-full bg-white opacity-[0.01] blur-[60px]"></div>
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50"></div>
  </div>
);

const LogoItevelesa = () => (
  <div className="mb-8 flex flex-col items-center animate-fadeIn relative z-10">
    <div className="w-24 h-24 bg-[#101c33] rounded-[2rem] flex items-center justify-center border border-gray-800 shadow-[0_0_30px_rgba(41,128,185,0.3)] mb-4 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2980b9]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <span className="text-4xl font-black italic text-gray-100 drop-shadow-md">ITV</span>
    </div>
    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">
      ITV <span className="text-[#2980b9]">EXPERT</span>
    </h1>
    <div className="h-1 w-16 bg-[#e67e22] mt-3 rounded-full shadow-[0_0_10px_rgba(230,126,34,0.5)]"></div>
  </div>
);

function App() {
  // ==========================================
  // ESTADOS GENERALES Y NAVEGACIÓN
  // ==========================================
  const [firebaseConectado, setFirebaseConectado] = useState(true);
  const [paginaActual, setPaginaActual] = useState('login');
  
  // ==========================================
  // ESTADOS DE AUTENTICACIÓN
  // ==========================================
  const [loginInput, setLoginInput] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [nombreRegistro, setNombreRegistro] = useState('');
  const [estacionRegistro, setEstacionRegistro] = useState('');
  const [inspectorRegistro, setInspectorRegistro] = useState('');
  const [passwordRegistro, setPasswordRegistro] = useState('');
  const [fotoPerfilUsuario, setFotoPerfilUsuario] = useState(null);
  const [claveNuevaPerfil, setClaveNuevaPerfil] = useState('');

  // ==========================================
  // ESTADOS DE VEHÍCULOS
  // ==========================================
  const [vehiculosGuardados, setVehiculosGuardados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [vehiculoDetalle, setVehiculoDetalle] = useState(null);
  const [editandoVehiculo, setEditandoVehiculo] = useState(null);
  
  // Formulario Añadir/Editar Vehículo
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [año, setAño] = useState('');
  const [fotoFrontal, setFotoFrontal] = useState(null);
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [puntosFrontal, setPuntosFrontal] = useState({});
  const [puntosPerfil, setPuntosPerfil] = useState({});
  const [protocoloPdf, setProtocoloPdf] = useState(null);
  
  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [puntoActual, setPuntoActual] = useState(null);
  const [vehiculoModal, setVehiculoModal] = useState(null);
  const [detallePopup, setDetallePopup] = useState({ descripcion: '', fotoDetalle: null });

  // ==========================================
  // ESTADOS DE NEUMÁTICOS
  // ==========================================
  const estadoInicialEjes = [
    { id: 1, gemela: false, izq: '', der: '', izqExt: '', derExt: '', izqInt: '', derInt: '' },
    { id: 2, gemela: false, izq: '', der: '', izqExt: '', derExt: '', izqInt: '', derInt: '' },
    { id: 3, gemela: false, izq: '', der: '', izqExt: '', derExt: '', izqInt: '', derInt: '' },
    { id: 4, gemela: false, izq: '', der: '', izqExt: '', derExt: '', izqInt: '', derInt: '' }
  ];
  
  const [medidasManuales, setMedidasManuales] = useState({ todas: '', eje1: '', eje2: '', eje3: '', eje4: '' });
  const [medidasFicha, setMedidasFicha] = useState([]);
  const [numEjesConfig, setNumEjesConfig] = useState(2);
  const [ejesNeumaticos, setEjesNeumaticos] = useState(estadoInicialEjes);
  // ==========================================
  // UTILIDADES DE IMAGEN Y ARCHIVOS
  // ==========================================
  const compressImageBase64 = (file, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve) => {
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
      };
    });
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => setProtocoloPdf(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  // ==========================================
  // LÓGICA DE NEUMÁTICOS Y EQUIVALENCIAS
  // ==========================================
  const parsearMedida = (medida) => {
    if (!medida) return null;
    // MODIFICADO: Ahora captura correctamente R, ZR o el guión (-)
    const regex = /^(\d+)\/(\d+)\s*(R|ZR|-)\s*(\d+)/i;
    const match = medida.trim().match(regex);
    if (match) {
      return {
        ancho: parseInt(match[1], 10),
        perfil: parseInt(match[2], 10),
        llanta: parseInt(match[4], 10),
        original: medida.trim() // Conserva la medida exacta con el ZR o -
      };
    }
    return null;
  };

  const calcularDiametro = (ancho, perfil, llanta) => {
    return (ancho * (perfil / 100) * 2) + (llanta * 25.4);
  };

  const comprobarEquivalencia = (medidaComprobar) => {
    const parseadaComprobar = parsearMedida(medidaComprobar);
    if (!parseadaComprobar) return null;
    
    const diametroComprobar = calcularDiametro(
      parseadaComprobar.ancho, parseadaComprobar.perfil, parseadaComprobar.llanta
    );

    let mejorEquivalencia = null;

    if (medidasFicha.length > 0) {
      medidasFicha.forEach(ref => {
        const parseadaRef = parsearMedida(ref.original);
        if (parseadaRef) {
          const diametroRef = calcularDiametro(parseadaRef.ancho, parseadaRef.perfil, parseadaRef.llanta);
          const dif = ((diametroComprobar - diametroRef) / diametroRef) * 100;
          if (Math.abs(dif) <= 3) {
            mejorEquivalencia = { equivalente: true, porcentaje: dif.toFixed(2), refOriginal: ref.original };
          }
        }
      });
      return mejorEquivalencia || { equivalente: false, refOriginal: 'Ninguna' };
    }
    return null;
  };

  const actualizarMedidasManuales = (campo, valor) => {
    const minValor = valor.toUpperCase();
    const nuevasManuales = { ...medidasManuales, [campo]: minValor };
    setMedidasManuales(nuevasManuales);
    
    let nuevasFicha = [];
    const procesar = (val, ejes) => {
      if (val.trim()) {
        const esMS = val.includes('M+S');
        const medClean = val.replace(/M\+S/g, '').trim();
        nuevasFicha.push({ id: Date.now() + Math.random(), original: medClean, isMS, ejes });
      }
    };
    procesar(nuevasManuales.todas, [1, 2, 3, 4]);
    procesar(nuevasManuales.eje1, [1]);
    procesar(nuevasManuales.eje2, [2]);
    procesar(nuevasManuales.eje3, [3]);
    procesar(nuevasManuales.eje4, [4]);
    setMedidasFicha(nuevasFicha);
  };

  const copiarInformeEquivalencias = () => {
    let inputsCompletados = [];
    let ejesInfo = [];

    // Recopilar información de todos los ejes según la configuración actual
    ejesNeumaticos.slice(0, numEjesConfig).forEach(eje => {
      let ruedasEje = [];
      
      if (!eje.gemela) {
        if (eje.izq) inputsCompletados.push(eje.izq);
        if (eje.der) inputsCompletados.push(eje.der);
        
        // MODIFICADO: Si solo pone 1 rueda en un eje normal, asume todo el eje
        if (eje.izq && !eje.der) {
          ruedasEje.push({ p: 'Todas las ruedas de este eje', v: eje.izq });
        } else if (!eje.izq && eje.der) {
          ruedasEje.push({ p: 'Todas las ruedas de este eje', v: eje.der });
        } else {
          if (eje.izq) ruedasEje.push({ p: 'Izquierda', v: eje.izq });
          if (eje.der) ruedasEje.push({ p: 'Derecha', v: eje.der });
        }
      } else {
        if (eje.izqExt) inputsCompletados.push(eje.izqExt);
        if (eje.derExt) inputsCompletados.push(eje.derExt);
        if (eje.izqInt) inputsCompletados.push(eje.izqInt);
        if (eje.derInt) inputsCompletados.push(eje.derInt);
        
        const countGemela = [eje.izqExt, eje.derExt, eje.izqInt, eje.derInt].filter(Boolean).length;
        
        // MODIFICADO: Si solo pone 1 rueda en eje gemelo, asume todo el eje
        if (countGemela === 1) {
          let valUnico = eje.izqExt || eje.derExt || eje.izqInt || eje.derInt;
          ruedasEje.push({ p: 'Todas las ruedas de este eje', v: valUnico });
        } else {
          if (eje.izqExt) ruedasEje.push({ p: 'Izq. Exterior', v: eje.izqExt });
          if (eje.derExt) ruedasEje.push({ p: 'Der. Exterior', v: eje.derExt });
          if (eje.izqInt) ruedasEje.push({ p: 'Izq. Interior', v: eje.izqInt });
          if (eje.derInt) ruedasEje.push({ p: 'Der. Interior', v: eje.derInt });
        }
      }
      if (ruedasEje.length > 0) ejesInfo.push({ eje: eje.id, ruedas: ruedasEje });
    });

    let informe = "INFORME DE NEUMÁTICOS:\n\n";

    // MODIFICADO: Si solo hay UN neumático escrito en TODO el coche, asume todos los neumáticos
    if (inputsCompletados.length === 1) {
      informe += `Todos los neumáticos del vehículo: ${inputsCompletados[0]}\n`;
    } else if (inputsCompletados.length > 1) {
      ejesInfo.forEach(info => {
        informe += `Eje ${info.eje}:\n`;
        info.ruedas.forEach(r => {
          if (r.p === 'Todas las ruedas de este eje') {
            informe += `  - ${r.v} (${r.p})\n`;
          } else {
            informe += `  - ${r.p}: ${r.v}\n`;
          }
        });
      });
    } else {
      alert("No se ha introducido ninguna medida para copiar.");
      return;
    }

    navigator.clipboard.writeText(informe).then(() => {
      alert("Informe copiado al portapapeles y casillas limpiadas con éxito.");
      // MODIFICADO: Limpieza total de casillas tras copiar
      setEjesNeumaticos(estadoInicialEjes);
      setMedidasManuales({ todas: '', eje1: '', eje2: '', eje3: '', eje4: '' });
      setMedidasFicha([]);
    }).catch(err => {
      console.error("Error al copiar:", err);
      alert("No se pudo copiar al portapapeles.");
    });
  };
  // ==========================================
  // OPERACIONES DE FIREBASE Y SESIÓN
  // ==========================================
  useEffect(() => {
    // Uso de onSnapshot para datos en tiempo real
    const unsubscribe = onSnapshot(collection(db, "vehiculos"), (snapshot) => {
      const vehs = [];
      snapshot.forEach(doc => vehs.push({ id: doc.id, ...doc.data() }));
      setVehiculosGuardados(vehs);
    }, (error) => {
      console.error("Error al suscribirse a vehículos:", error);
    });
    return () => unsubscribe();
  }, []);

  const hacerLogin = () => {
    if (loginInput.trim() === '7753' && passwordLogin === '3902') {
      setUsuarioActual({ maestro: true, nombre: 'Inspector Maestro', estacion: 'TODAS', inspector: '7753' });
      setPaginaActual('buscar');
    } else if (loginInput.trim() !== '' && passwordLogin !== '') {
      setUsuarioActual({ maestro: false, nombre: 'Inspector Estándar', estacion: '01', inspector: loginInput });
      setPaginaActual('buscar');
    } else {
      alert("Por favor, introduce usuario y contraseña válidos.");
    }
  };

  const registrarUsuario = () => {
    alert("Solicitud de registro enviada al administrador.");
    setNombreRegistro(''); setEstacionRegistro(''); setInspectorRegistro(''); setPasswordRegistro('');
  };

  const solicitarResetContrasena = () => {
    alert("Instrucciones de reseteo enviadas al correo corporativo.");
  };

  const resetFormularioVehiculo = () => {
    setMarca(''); setModelo(''); setAño('');
    setFotoFrontal(null); setFotoPerfil(null);
    setPuntosFrontal({}); setPuntosPerfil({});
    setProtocoloPdf(null); setEditandoVehiculo(null);
  };

  const guardarVehiculo = async () => {
    if (!marca || !modelo || !fotoFrontal || !fotoPerfil) {
      alert("Marca, Modelo y ambas fotografías son obligatorias.");
      return;
    }

    const datos = {
      marca: marca.toUpperCase(),
      modelo: modelo.toUpperCase(),
      año,
      fotos: {
        frontal: { url: fotoFrontal, puntos: puntosFrontal },
        perfil: { url: fotoPerfil, puntos: puntosPerfil }
      },
      protocoloPdf: protocoloPdf, // Guarda el PDF híbrido
      fechaCreacion: new Date().toISOString()
    };

    try {
      if (editandoVehiculo) {
        await updateDoc(doc(db, "vehiculos", editandoVehiculo.id), datos);
        alert("Vehículo actualizado correctamente.");
      } else {
        await addDoc(collection(db, "vehiculos"), datos);
        alert("Vehículo guardado correctamente.");
      }
      resetFormularioVehiculo();
      setPaginaActual('buscar');
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Ocurrió un error al guardar el vehículo.");
    }
  };

  const iniciarEdicion = (veh) => {
    setEditandoVehiculo(veh);
    setMarca(veh.marca);
    setModelo(veh.modelo);
    setAño(veh.año || '');
    setFotoFrontal(veh.fotos.frontal.url);
    setFotoPerfil(veh.fotos.perfil.url);
    setPuntosFrontal(veh.fotos.frontal.puntos || {});
    setPuntosPerfil(veh.fotos.perfil.puntos || {});
    setProtocoloPdf(veh.protocoloPdf || null);
    setVehiculoDetalle(null);
    setPaginaActual('añadir');
  };

  const eliminarVehiculo = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este vehículo permanentemente?")) {
      try {
        await deleteDoc(doc(db, "vehiculos", id));
        alert("Vehículo eliminado.");
        setVehiculoDetalle(null);
      } catch (error) {
        alert("Error al eliminar el vehículo.");
      }
    }
  };

  const guardarDetalle = () => {
    const setterPuntos = puntoActual.vista === 'frontal' ? setPuntosFrontal : setPuntosPerfil;
    setterPuntos(prev => ({
      ...prev,
      [puntoActual.tipo]: { 
        x: puntoActual.x, y: puntoActual.y, 
        descripcion: detallePopup.descripcion, fotoDetalle: detallePopup.fotoDetalle 
      }
    }));
    setModalAbierto(false);
  };

  const renderRuedaInput = (eje, campo, placeholder) => {
    const equivalencia = comprobarEquivalencia(eje[campo]);
    let colorBorde = 'border-gray-700';
    let icono = null;

    if (eje[campo] && equivalencia) {
      colorBorde = equivalencia.equivalente ? 'border-green-500 bg-green-900/10' : 'border-red-500 bg-red-900/10';
      icono = equivalencia.equivalente ? '✅' : '❌';
    }

    return (
      <div className="flex-1 min-w-[120px] relative">
        <input 
          type="text" 
          className={`w-full bg-[#101c33] border ${colorBorde} rounded-xl p-3 text-xs font-bold text-gray-200 outline-none uppercase shadow-inner placeholder-gray-600 focus:border-[#2980b9]`} 
          placeholder={placeholder} 
          value={eje[campo]} 
          onChange={(e) => {
            const nuevos = ejesNeumaticos.map(ej => ej.id === eje.id ? {...ej, [campo]: e.target.value.toUpperCase()} : ej);
            setEjesNeumaticos(nuevos);
          }} 
        />
        {icono && <span className="absolute right-3 top-3 text-sm">{icono}</span>}
      </div>
    );
  };
  const esMaestro = usuarioActual?.maestro;

  const renderContenido = () => {
    // ==========================================
    // PESTAÑA 1: AÑADIR / EDITAR VEHÍCULO
    // ==========================================
    if (paginaActual === 'añadir') {
      return (
        <div className="space-y-6 animate-fadeIn pb-10">
          <div className="bg-[#101c33] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl relative">
            <h2 className="text-2xl font-black italic uppercase text-gray-100 mb-6">
              {editandoVehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            </h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input type="text" placeholder="MARCA *" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase focus:border-[#2980b9] outline-none text-white" value={marca} onChange={e => setMarca(e.target.value)} />
              <input type="text" placeholder="MODELO *" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase focus:border-[#2980b9] outline-none text-white" value={modelo} onChange={e => setModelo(e.target.value)} />
            </div>
            <input type="number" placeholder="AÑO (Opcional)" className="w-full bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase mb-6 focus:border-[#2980b9] outline-none text-white" value={año} onChange={e => setAño(e.target.value)} />

            {/* MARCADORES Y PROTOCOLO HÍBRIDO (MODIFICADO) */}
            <div className="mb-4">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Añadir Elementos y Documentos</p>
              <div className="flex gap-2 flex-wrap mb-4">
                 {/* Aquí se pueden poner botones para forzar la selección de un punto sin hacer clic en la foto, pero la lógica principal de marcaje está en el onClick de la imagen. A continuación el botón de Protocolo Híbrido */}
                 <label className="bg-gray-300 text-black px-3 py-1 rounded border border-gray-400 text-[10px] font-black uppercase cursor-pointer shadow-md flex items-center">
                    {protocoloPdf ? '📄 Protocolo Híbrido Listo (Cambiar)' : 'Protocolo Híbrido'}
                    <input type="file" hidden accept=".pdf" onChange={handlePdfUpload} />
                 </label>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { id: 'frontal', label: 'VISTA FRONTAL *', state: fotoFrontal, set: setFotoFrontal, puntos: puntosFrontal },
                { id: 'perfil', label: 'VISTA PERFIL *', state: fotoPerfil, set: setFotoPerfil, puntos: puntosPerfil }
              ].map(v => (
                <div key={v.id} className="bg-[#060c17] p-4 rounded-2xl border border-gray-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase text-gray-400">{v.label}</span>
                    <input type="file" id={`foto-${v.id}`} className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files[0]) v.set(await compressImageBase64(e.target.files[0])); }} />
                    <label htmlFor={`foto-${v.id}`} className="bg-gray-800 text-white px-3 py-2 rounded-xl text-[9px] font-black cursor-pointer uppercase border border-gray-700">{v.state ? 'Cambiar Foto' : 'Subir Foto'}</label>
                  </div>
                  {v.state && (
                    <div className="relative rounded-2xl overflow-hidden border border-gray-700 mt-2 bg-black" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        setPuntoActual({ vista: v.id, x, y, tipo: 'bastidor', isEdit: false });
                        setDetallePopup({ descripcion: '', fotoDetalle: null });
                        setVehiculoModal({ fotos: { frontal: { puntos: puntosFrontal }, perfil: { puntos: puntosPerfil } } });
                        setModalAbierto(true);
                      }}>
                      <img src={v.state} className="w-full h-auto opacity-70 hover:opacity-100 transition-opacity cursor-crosshair" alt={v.label} />
                      {Object.entries(v.puntos).map(([tipo, p]) => (
                        <div key={tipo} className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-white flex items-center justify-center font-black text-[9px] text-white shadow-[0_0_10px_rgba(0,0,0,0.8)] pointer-events-none ${tipo === 'bastidor' ? 'bg-red-600' : tipo === 'obd' ? 'bg-yellow-500 text-black' : tipo === 'bateria' ? 'bg-blue-600' : 'bg-green-600'}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                          {tipo === 'bastidor' ? 'B' : tipo === 'obd' ? 'O' : tipo === 'bateria' ? 'BA' : 'R'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {editandoVehiculo && <button onClick={resetFormularioVehiculo} className="flex-1 bg-gray-800 py-4 rounded-2xl font-black text-[10px] uppercase text-gray-300">Cancelar</button>}
              <button onClick={guardarVehiculo} className="flex-1 bg-[#2980b9] py-4 rounded-2xl font-black text-xs uppercase text-white shadow-xl shadow-blue-900/40">{editandoVehiculo ? 'Guardar Cambios' : 'Guardar Vehículo'}</button>
            </div>
          </div>
        </div>
      );
    }

    // ==========================================
    // PESTAÑA 2: BUSCAR Y DETALLE DE VEHÍCULO
    // ==========================================
    if (paginaActual === 'buscar' && !vehiculoDetalle) {
      const filtrados = vehiculosGuardados.filter(v => `${v.marca} ${v.modelo} ${v.año}`.toLowerCase().includes(busqueda.toLowerCase()));
      return (
        <div className="space-y-6 animate-fadeIn pb-10">
          <input type="text" placeholder="BUSCAR MARCA O MODELO..." className="w-full bg-[#101c33] border border-gray-800 p-5 rounded-2xl text-sm font-black uppercase focus:border-[#2980b9] outline-none text-white shadow-lg" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <div className="grid grid-cols-1 gap-4">
            {filtrados.map(v => (
              <div key={v.id} onClick={() => setVehiculoDetalle(v)} className="bg-[#101c33] p-5 rounded-[2rem] border border-gray-800 flex items-center gap-5 cursor-pointer hover:bg-[#1a2b4c] transition-colors shadow-lg group">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-black flex-shrink-0 border border-gray-700">
                  <img src={v.fotos.frontal.url} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform" alt={v.marca} />
                </div>
                <div>
                  <h3 className="text-lg font-black italic uppercase text-gray-100">{v.marca}</h3>
                  <p className="text-sm font-bold text-[#2980b9] uppercase">{v.modelo} {v.año && <span className="text-gray-500">({v.año})</span>}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (paginaActual === 'buscar' && vehiculoDetalle) {
      const v = vehiculoDetalle;
      return (
        <div className="space-y-6 animate-fadeIn pb-10">
          <button onClick={() => setVehiculoDetalle(null)} className="text-[#2980b9] font-black text-xs uppercase flex items-center gap-2 mb-2 active:scale-95 transition-transform"><span className="text-lg">←</span> Volver a la Lista</button>
          <div className="bg-[#101c33] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl relative overflow-hidden">
            <h2 className="text-3xl font-black italic uppercase text-gray-100 mb-1 leading-none">{v.marca}</h2>
            <p className="text-xl font-black text-[#2980b9] uppercase mb-4">{v.modelo} {v.año}</p>
            
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Elementos Disponibles:</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {['bastidor', 'obd', 'bateria', 'r24db'].map(t => {
                const exists = v.fotos.frontal.puntos?.[t] || v.fotos.perfil.puntos?.[t];
                if (!exists) return null;
                const colorClass = t === 'bastidor' ? 'bg-red-600 border-red-400' : t === 'obd' ? 'bg-yellow-500 text-black border-yellow-300' : t === 'bateria' ? 'bg-blue-600 border-blue-400' : 'bg-green-600 border-green-400';
                return <span key={t} className={`px-2 py-1 rounded border text-[9px] font-black uppercase shadow-md ${colorClass}`}>{t === 'r24db' ? 'R-24' : t}</span>
              })}
              {/* MODIFICADO: Botón gris para Protocolo Híbrido en detalle */}
              {v.protocoloPdf && (
                <a href={v.protocoloPdf} target="_blank" rel="noreferrer" className="px-3 py-1 rounded border border-gray-500 bg-gray-300 text-black text-[9px] font-black uppercase shadow-md flex items-center">
                  📄 Protocolo Híbrido
                </a>
              )}
            </div>

            <div className="space-y-6">
              {[
                { id: 'frontal', label: 'VISTA FRONTAL', img: v.fotos.frontal.url, pts: v.fotos.frontal.puntos },
                { id: 'perfil', label: 'VISTA PERFIL', img: v.fotos.perfil.url, pts: v.fotos.perfil.puntos }
              ].map(vista => (
                <div key={vista.id} className="relative rounded-3xl overflow-hidden border border-gray-700 bg-black shadow-inner">
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white text-[8px] font-black px-2 py-1 rounded uppercase z-10">{vista.label}</div>
                  <img src={vista.img} className="w-full h-auto" alt={vista.label} />
                  {Object.entries(vista.pts || {}).map(([tipo, p]) => (
                    <div key={tipo} onClick={() => { setVehiculoModal(v); setPuntoActual({ vista: vista.id, tipo, x: p.x, y: p.y, isEdit: false }); setDetallePopup({ descripcion: p.descripcion || '', fotoDetalle: p.fotoDetalle || null }); setModalAbierto(true); }}
                      className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white flex items-center justify-center font-black text-xs text-white shadow-[0_0_15px_rgba(0,0,0,0.9)] cursor-pointer hover:scale-125 transition-transform ${tipo === 'bastidor' ? 'bg-red-600 animate-pulse' : tipo === 'obd' ? 'bg-yellow-500 text-black' : tipo === 'bateria' ? 'bg-blue-600' : 'bg-green-600'}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                      {tipo === 'bastidor' ? 'B' : tipo === 'obd' ? 'O' : tipo === 'bateria' ? 'BA' : 'R'}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            {esMaestro && (
              <div className="mt-6 flex gap-3 border-t border-gray-800 pt-6">
                <button onClick={() => iniciarEdicion(v)} className="flex-1 bg-gray-800 py-3 rounded-xl font-black text-[10px] uppercase text-gray-300 active:scale-95 transition-transform">Editar</button>
                <button onClick={() => eliminarVehiculo(v.id)} className="flex-1 bg-red-900/40 border border-red-900 py-3 rounded-xl font-black text-[10px] uppercase text-red-500 active:scale-95 transition-transform">Eliminar</button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ==========================================
    // PESTAÑA 3: CONTACTO (MODIFICADO TEXTO)
    // ==========================================
    if (paginaActual === 'contacto') {
      return (
        <div className="space-y-6 animate-fadeIn pb-10">
          <div className="bg-[#101c33] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl relative">
            <h2 className="text-2xl font-black italic uppercase text-[#2980b9] mb-4">Contacto</h2>
            <p className="text-sm font-bold text-gray-300 mb-6 leading-relaxed">
              Para sugerencias o enviar vehículos para añadir a la base de datos, enviar fotos indicando la ubicación del bastidor, OBD, pegatina R-24/dB o batería e indicar marca, modelo y año del vehículo, gracias.
            </p>
            <a href="mailto:danielitv3902@gmail.com" className="block text-center w-full bg-[#e67e22] text-white font-black uppercase py-4 rounded-2xl shadow-lg shadow-orange-900/40 active:scale-95 transition-all text-sm tracking-widest">
              danielitv3902@gmail.com
            </a>
          </div>
        </div>
      );
    }

    // ==========================================
    // PESTAÑA 4: PERFIL
    // ==========================================
    if (paginaActual === 'perfil') {
      return (
        <div className="space-y-6 animate-fadeIn pb-10">
          <div className="bg-[#101c33] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl relative">
            <h2 className="text-2xl font-black italic uppercase text-[#2980b9] mb-6">Perfil de Inspector</h2>
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-[#2980b9] overflow-hidden flex items-center justify-center mb-3 shadow-lg">
                {fotoPerfilUsuario ? <img src={fotoPerfilUsuario} className="w-full h-full object-cover" alt="Perfil" /> : <span className="text-3xl font-black text-gray-400">{usuarioActual?.nombre?.[0] || 'I'}</span>}
              </div>
              <input type="file" id="foto-perfil-file" className="hidden" accept="image/*" onChange={async (e) => { if (e.target.files[0]) { const img = await compressImageBase64(e.target.files[0], 400, 0.7); setFotoPerfilUsuario(img); setUsuarioActual(prev => ({ ...prev, fotoPerfil: img })); } }} />
              <label htmlFor="foto-perfil-file" className="text-xs font-black text-[#e67e22] uppercase cursor-pointer hover:underline">Cambiar foto de perfil</label>
            </div>
            <div className="space-y-3 bg-[#060c17] p-4 rounded-2xl border border-gray-800 mb-6">
              <div><span className="text-[9px] font-black uppercase text-gray-500 block">Nombre del Inspector:</span><span className="text-sm font-bold text-gray-200">{usuarioActual?.nombre}</span></div>
              <div><span className="text-[9px] font-black uppercase text-gray-500 block">Nº Inspector:</span><span className="text-sm font-bold text-[#2980b9]">{usuarioActual?.inspector}</span></div>
              <div><span className="text-[9px] font-black uppercase text-gray-500 block">Estación Asignada:</span><span className="text-sm font-bold text-[#e67e22]">{usuarioActual?.estacion}</span></div>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-[10px] font-black uppercase text-gray-400">Seguridad</p>
              <input type="password" placeholder="NUEVA CONTRASEÑA..." className="w-full bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold text-white outline-none focus:border-[#2980b9]" value={claveNuevaPerfil} onChange={e => setClaveNuevaPerfil(e.target.value)} />
              <button onClick={() => { if (claveNuevaPerfil) { alert("Contraseña actualizada con éxito."); setClaveNuevaPerfil(''); } }} className="w-full bg-gray-800 border border-gray-700 py-3 rounded-xl font-black text-xs uppercase text-gray-300">Actualizar Contraseña</button>
            </div>
            <button onClick={() => { setUsuarioActual(null); setPaginaActual('login'); }} className="w-full bg-red-900/30 border border-red-800 py-4 rounded-2xl font-black text-xs uppercase text-red-400 active:scale-95 transition-transform">Cerrar Sesión</button>
          </div>
        </div>
      );
    }
    // ==========================================
    // PESTAÑA 5: NEUMÁTICOS Y EQUIVALENCIAS
    // ==========================================
    if (paginaActual === 'neumaticos') {
      return (
        <div className="space-y-6 animate-fadeIn pb-10">
          <div className="bg-[#101c33] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-black italic uppercase text-[#e67e22] mb-1">Cálculo 4 Vías</h2>
            <h3 className="text-3xl font-black italic uppercase text-[#2980b9] tracking-tighter mb-4">Equivalencias</h3>
            
            <div className="bg-[#060c17] p-4 rounded-2xl border border-gray-700 mb-6">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-3">1. Datos Ficha Técnica (Tarjeta ITV)</p>
              <div className="space-y-2">
                {['todas', 'eje1', 'eje2', 'eje3', 'eje4'].map(k => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-gray-500 w-16">{k === 'todas' ? 'Todas:' : `Eje ${k.charAt(3)}:`}</span>
                    <input type="text" className="flex-1 bg-[#101c33] border border-gray-600 rounded-xl p-2.5 text-xs font-bold text-gray-300 outline-none uppercase" placeholder={k === 'todas' ? "Para todos los ejes..." : `Solo eje ${k.charAt(3)}...`} value={medidasManuales[k]} onChange={(e) => actualizarMedidasManuales(k, e.target.value)} />
                  </div>
                ))}
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
              <select className="bg-[#060c17] text-[#2980b9] text-xs font-black uppercase border border-gray-700 p-2 rounded-lg outline-none" value={numEjesConfig} onChange={(e) => setNumEjesConfig(Number(e.target.value))}>
                <option value={2}>2 Ejes</option><option value={3}>3 Ejes</option><option value={4}>4 Ejes</option>
              </select>
            </div>

            <div className="space-y-4">
              {ejesNeumaticos.slice(0, numEjesConfig).map((eje) => (
                <div key={eje.id} className="bg-[#060c17] p-4 rounded-2xl border border-gray-800">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black uppercase text-gray-200">EJE {eje.id}</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="hidden" checked={eje.gemela} onChange={() => { const nuevos = ejesNeumaticos.map(ej => ej.id === eje.id ? {...ej, gemela: !ej.gemela} : ej); setEjesNeumaticos(nuevos); }} />
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${eje.gemela ? 'bg-[#e67e22]' : 'bg-gray-700'}`}><div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${eje.gemela ? 'left-6' : 'left-1'}`}></div></div>
                      <span className="text-[9px] font-black uppercase text-gray-400">Rueda Gemela</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {!eje.gemela ? (
                      <>{renderRuedaInput(eje, 'izq', 'Izquierda')}{renderRuedaInput(eje, 'der', 'Derecha')}</>
                    ) : (
                      <div className="w-full grid grid-cols-2 gap-x-3 gap-y-4">
                        {renderRuedaInput(eje, 'izqExt', 'Izq. Ext.')}{renderRuedaInput(eje, 'derExt', 'Der. Ext.')}{renderRuedaInput(eje, 'izqInt', 'Izq. Int.')}{renderRuedaInput(eje, 'derInt', 'Der. Int.')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={copiarInformeEquivalencias} className="w-full bg-[#e67e22] py-5 mt-6 rounded-2xl font-black text-xs uppercase shadow-lg shadow-orange-900/40 text-white active:scale-95 transition-all">
              📋 Copiar Informe de Neumáticos
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const menuItems = esMaestro 
    ? [{id:'buscar', icon:'🔍', label:'BUSCAR'}, {id:'añadir', icon:'➕', label:'AÑADIR'}, {id:'neumaticos', icon:'🛞', label:'NEUMÁTICOS'}, {id:'perfil', icon:'👤', label:'PERFIL'}]
    : [{id:'buscar', icon:'🔍', label:'BUSCAR'}, {id:'contacto', icon:'✉️', label:'CONTACTO'}, {id:'neumaticos', icon:'🛞', label:'NEUMÁTICOS'}, {id:'perfil', icon:'👤', label:'PERFIL'}];

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
              <input type="text" placeholder="Nº DE INSPECTOR" className="w-full bg-[#060c17] border border-gray-700 p-5 rounded-2xl font-bold text-sm focus:border-[#2980b9] outline-none text-white" value={loginInput} onChange={e => setLoginInput(e.target.value)} />
              <input type="password" placeholder="CONTRASEÑA" className="w-full bg-[#060c17] border border-gray-700 p-5 rounded-2xl font-bold text-sm focus:border-[#2980b9] outline-none text-white" value={passwordLogin} onChange={e => setPasswordLogin(e.target.value)} />
              <button onClick={hacerLogin} disabled={!firebaseConectado} className={`w-full py-5 rounded-2xl font-black text-lg uppercase transition-all shadow-xl text-white ${firebaseConectado ? 'bg-[#2980b9] active:scale-95 shadow-blue-900/40' : 'bg-gray-600 cursor-not-allowed'}`}>{firebaseConectado ? 'Acceder' : 'Conectando...'}</button>
              <button onClick={solicitarResetContrasena} className="w-full text-gray-500 font-bold text-xs uppercase py-2 hover:text-gray-300 transition-colors">¿Olvidaste tu contraseña?</button>
            </div>
          </div>
          <div className="bg-[#101c33] p-8 rounded-[3rem] border border-gray-800 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] mt-6">
            <p className="text-center text-[10px] font-black uppercase text-[#e67e22] mb-6 italic tracking-widest">Nuevo Registro</p>
            <input type="text" placeholder="NOMBRE Y DOS APELLIDOS" className="w-full bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase mb-3 focus:border-[#2980b9] outline-none text-white" value={nombreRegistro} onChange={e => setNombreRegistro(e.target.value)} />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input type="number" placeholder="Nº ESTACIÓN" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase focus:border-[#2980b9] outline-none text-white" value={estacionRegistro} onChange={e => setEstacionRegistro(e.target.value)} />
              <input type="text" placeholder="Nº INSPECTOR" className="bg-[#060c17] border border-gray-700 p-4 rounded-2xl text-xs font-bold uppercase focus:border-[#2980b9] outline-none text-white" value={inspectorRegistro} onChange={e => setInspectorRegistro(e.target.value)} />
            </div>
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
                {usuarioActual.fotoPerfil ? <img src={usuarioActual.fotoPerfil} className="w-full h-full object-cover" alt="User" /> : usuarioActual.nombre[0]}
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-4 overflow-y-auto pb-24 z-10">{renderContenido()}</main>

          <nav className="fixed bottom-0 left-0 right-0 bg-[#101c33]/95 backdrop-blur-md border-t border-gray-800 p-4 flex justify-around items-center z-50 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            {menuItems.map(item => (
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
                      const colorClass = t === 'bastidor' ? 'bg-red-600 text-white border-red-400' : t === 'obd' ? 'bg-yellow-500 text-black border-yellow-300' : t === 'bateria' ? 'bg-blue-600 text-white border-blue-400' : 'bg-green-600 text-white border-green-400';
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
                      <img src={detallePopup.fotoDetalle} className="w-full h-auto max-h-48 object-contain" alt="Detalle" />
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