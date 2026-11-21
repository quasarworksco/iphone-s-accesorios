const sdk = 'https://www.gstatic.com/firebasejs/11.10.0';
const firebaseConfig = {
  apiKey: 'AIzaSyBKgqIzD3MkVzgE10G6SQLr2pyz0W2nC5o',
  authDomain: 'eganaaccesorios.firebaseapp.com',
  projectId: 'eganaaccesorios',
  storageBucket: 'eganaaccesorios.firebasestorage.app',
  messagingSenderId: '654342708176',
  appId: '1:654342708176:web:28cfc8d784540a8020b7d5'
};

let connection;
export function openCatalog() {
  connection ??= Promise.all([
    import(`${sdk}/firebase-app.js`),
    import(`${sdk}/firebase-firestore.js`)
  ]).then(([{ initializeApp }, firestore]) => {
    const app = initializeApp(firebaseConfig);
    const db = firestore.getFirestore(app);
    return { app, db, firestore, ref: firestore.doc(db, 'catalogo', 'publicado') };
  });
  return connection;
}

function snapshotVersion(snapshot) {
  const time = snapshot.get('updatedAt');
  return { exists: snapshot.exists(), time: time ? [time.seconds, time.nanoseconds] : null };
}

export async function readCatalog() {
  const { firestore, ref } = await openCatalog();
  const snapshot = await firestore.getDocFromServer(ref);
  return { data: snapshot.exists() ? snapshot.data() : null, version: snapshotVersion(snapshot) };
}

export async function watchCatalog(onCatalog) {
  const { firestore, ref } = await openCatalog();
  return firestore.onSnapshot(ref, snapshot => {
    if (!snapshot.metadata.fromCache) onCatalog(snapshot.exists() ? snapshot.data() : null);
  }, () => {
    // La tienda mantiene el catálogo que pudo cargar.
  });
}

export async function editorIdentity() {
  const [{ app }, authSDK] = await Promise.all([
    openCatalog(),
    import(`${sdk}/firebase-auth.js`)
  ]);
  const auth = authSDK.getAuth(app);
  await auth.authStateReady();
  return (auth.currentUser ?? (await authSDK.signInAnonymously(auth)).user).uid;
}

export async function canEditCatalog(uid) {
  const { db, firestore } = await openCatalog();
  return (await firestore.getDocFromServer(firestore.doc(db, 'administradores', uid))).exists();
}

export async function saveCatalog(catalog, expectedVersion) {
  const { db, firestore, ref } = await openCatalog();
  await firestore.runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (JSON.stringify(snapshotVersion(snapshot)) !== JSON.stringify(expectedVersion)) {
      const conflict = new Error('Otra edición cambió el catálogo. Recarga la última versión antes de publicar.');
      conflict.code = 'catalog-conflict';
      throw conflict;
    }
    transaction.set(ref, { ...catalog, updatedAt: firestore.serverTimestamp() });
  });
}
