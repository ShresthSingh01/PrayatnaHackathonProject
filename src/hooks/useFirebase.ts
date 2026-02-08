import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    addDoc as firestoreAddDoc,
    getDocs as firestoreGetDocs,
    onSnapshot,
    query,
    QueryConstraint,
    type DocumentData,
    type WithFieldValue
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useEffect, useState } from "react";

// Initialize Firebase only once
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: any;
let db: any;
let storage: any;

try {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
        throw new Error("Missing Firebase API Key");
    }
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (e) {
    console.warn("Firebase initialization failed (likely missing .env). Using mock mode.", e);
    // Mock DB/Storage to prevent immediate crashes in components
    db = { type: 'mock' };
    storage = { type: 'mock' };
}

export const useFirebase = () => {

    const uploadImage = async (file: File, path: string): Promise<string> => {
        if (storage.type === 'mock') {
            console.warn('Mock Upload:', file.name);
            return 'https://via.placeholder.com/300';
        }
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    const addDocument = async <T extends WithFieldValue<DocumentData>>(
        collectionName: string,
        data: T
    ) => {
        if (db.type === 'mock') {
            console.warn('Mock Add Doc:', collectionName, data);
            return { id: 'mock-id-' + Date.now() } as any; // Mock Ref
        }
        return firestoreAddDoc(collection(db, collectionName), data);
    };

    const getDocuments = async (
        collectionName: string,
        constraints: QueryConstraint[] = []
    ) => {
        if (db.type === 'mock') return [];
        const q = query(collection(db, collectionName), ...constraints);
        const querySnapshot = await firestoreGetDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    // Realtime listener hook helper
    // Usage: const { data, loading } = useRealtime('users', [where('age', '>', 20)])
    const useRealtime = <T = DocumentData>(
        collectionName: string,
        constraints: QueryConstraint[] = []
    ) => {
        const [data, setData] = useState<T[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            if (db.type === 'mock') {
                setLoading(false);
                // Return dummy data for engineers/tasks if needed for demo to not look empty
                if (collectionName === 'projects') {
                    setData([{ id: 'demo', name: 'Demo Project', type: 'metro', startDate: new Date().toISOString() }] as any);
                } else if (collectionName === 'tasks') {
                    setData([{ id: 't1', name: 'Demo Task', status: 'pending', expectedDays: 5 }] as any);
                }
                return;
            }

            const q = query(collection(db, collectionName), ...constraints);
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
                setData(results);
                setLoading(false);
            });
            return () => unsubscribe();
        }, [collectionName, JSON.stringify(constraints)]); // JSON.stringify for simple array dependency comparison

        return { data, loading };
    };

    return {
        db,
        storage,
        uploadImage,
        addDocument,
        getDocuments,
        useRealtime
    };
};

// Export singleton instances if needed directly
export { db, storage, app };
