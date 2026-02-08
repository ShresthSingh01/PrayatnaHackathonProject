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
import { useEffect, useState, useRef } from "react";

// Initialize Firebase
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
    // FORCE MOCK FOR DEMO STABILITY
    // set to false if you really want to use firebase
    const FORCE_MOCK = true;

    if (FORCE_MOCK || !firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
        throw new Error("Using Mock Mode");
    }
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (e) {
    console.warn("Using persistent mock mode (LocalStorage).");
    db = { type: 'mock' };
    storage = { type: 'mock' };
}

// --- PERSISTENT MOCK STORE (localStorage) ---
const MOCK_STORAGE_KEY = 'constructrack_mock_db_v2';

const getMockDB = () => {
    try {
        const stored = localStorage.getItem(MOCK_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error("Failed to parse mock DB", e);
    }

    // Default / Initial Data
    return {
        projects: [{ id: 'demo', name: 'Demo Project', type: 'metro', startDate: new Date().toISOString() }],
        tasks: [
            { id: 't1', name: 'Site Preparation', status: 'completed', expectedDays: 5, projectId: 'demo', dependencies: [] },
            { id: 't2', name: 'Foundation', status: 'in-progress', expectedDays: 10, projectId: 'demo', dependencies: ['t1'] }
        ],
        photos: []
    };
};

const updateMockDB = (collectionName: string, newItem: any) => {
    const currentDB = getMockDB();
    if (!currentDB[collectionName]) currentDB[collectionName] = [];
    currentDB[collectionName].push(newItem);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(currentDB));
    return currentDB;
};

export const useFirebase = () => {

    const uploadImage = async (file: File, path: string): Promise<string> => {
        if (storage.type === 'mock') {
            console.log('Mock Upload:', file.name);
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
            console.log('Mock Add Doc:', collectionName);
            const newId = 'mock-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const newDoc = { id: newId, ...data };
            updateMockDB(collectionName, newDoc);
            return { id: newId, ...newDoc } as any;
        }
        return firestoreAddDoc(collection(db, collectionName), data);
    };

    const getDocuments = async (
        collectionName: string,
        constraints: QueryConstraint[] = []
    ) => {
        if (db.type === 'mock') {
            const mockDB = getMockDB();
            return mockDB[collectionName] || [];
        }
        const q = query(collection(db, collectionName), ...constraints);
        const querySnapshot = await firestoreGetDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    const useRealtime = <T = DocumentData>(
        collectionName: string,
        constraints: QueryConstraint[] = []
    ) => {
        const [data, setData] = useState<T[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            if (db.type === 'mock') {
                // Poll localStorage for changes
                const fetchData = () => {
                    const mockDB = getMockDB();
                    const allItems = mockDB[collectionName] || [];

                    // Filter Logic
                    const filtered = allItems.filter((item: any) => {
                        if (collectionName === 'projects') return true;

                        // Fail-safe filtering
                        try {
                            if (!constraints || constraints.length === 0) return true;
                            if (!item.projectId) return true; // Keep items meant for "all" if any

                            // Stringify constraints to check for ID presence
                            const cStr = JSON.stringify(constraints);
                            return cStr.includes(item.projectId);
                        } catch (e) {
                            return true;
                        }
                    });

                    // Only update if changed (deepish check via stringify for mock)
                    setData(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(filtered)) {
                            return filtered;
                        }
                        return prev;
                    });
                    setLoading(false);
                };

                fetchData(); // Initial
                const interval = setInterval(fetchData, 1000); // Poll every 1s
                return () => clearInterval(interval);
            }

            const q = query(collection(db, collectionName), ...constraints);
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
                setData(results);
                setLoading(false);
            });
            return () => unsubscribe();
        }, [collectionName]); // Removed constraints from dependency to prevent JSON.stringify crashes. We poll anyway.

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

export { db, storage, app };
