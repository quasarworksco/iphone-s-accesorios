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
    import(`${sdk}/firebase-firestore-lite.js`)
  ]).then(([{ initializeApp }, firestore]) => {
    const app = initializeApp(firebaseConfig);
    const db = firestore.getFirestore(app);
    return { app, db, firestore, ref: firestore.doc(db, 'catalogo', 'publicado') };
  });
  return connection;
}

export async function publishedCatalog() {
  const { firestore, ref } = await openCatalog();
  const snapshot = await firestore.getDoc(ref);
  return snapshot.exists() ? snapshot.data() : null;
}
