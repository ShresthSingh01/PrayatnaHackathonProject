import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, MapPin, QrCode, Wifi, WifiOff, UploadCloud, CheckCircle } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useFirebase } from '../hooks/useFirebase';
import { useParams } from 'react-router-dom';

const WorkerPhotoCapture = () => {
    const { projectId: urlProjectId } = useParams();
    const [projectId, setProjectId] = useState<string | null>(urlProjectId || null);
    const [scanning, setScanning] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [location, setLocation] = useState<GeolocationCoordinates | null>(null);

    const { addToQueue, isOnline, syncStatus, pendingCount } = useOfflineQueue();
    const { addDocument } = useFirebase(); // Need direct DB access for metadata
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Sync state if URL param changes
    useEffect(() => {
        if (urlProjectId) {
            setProjectId(urlProjectId);
            setScanning(false); // Stop scanning if we navigated directly
        }
    }, [urlProjectId]);

    useEffect(() => {
        if (scanning && !scannerRef.current) {
            // Initialize scanner
            const scanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
            );

            scanner.render((decodedText) => {
                setProjectId(decodedText);
                setScanning(false);
                scanner.clear();
                scannerRef.current = null;
            }, (error) => {
                console.warn(error);
            });

            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
            }
        };
    }, [scanning]);

    const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !projectId) return;

        setStatus('Getting location...');

        // Get GPS
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    setLocation(position.coords);
                    await processFile(file, position.coords);
                },
                async (error) => {
                    console.warn('GPS Error:', error);
                    setStatus('GPS failed, saving without location...');
                    await processFile(file, null);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            await processFile(file, null);
        }
    };

    const processFile = async (file: File, coords: GeolocationCoordinates | null) => {
        setStatus('Processing...');

        // Construct path: projects/{projectId}/{timestamp}_{filename}
        // We assume projectId is valid folder name
        const path = `projects/${projectId}/${Date.now()}_${file.name}`;

        try {
            await addToQueue(file, path);
            setStatus('Saved!');
        } catch (error) {
            console.error(error);
            setStatus('Error saving.');
        }
    };

    return (
        <div className="min-h-screen bg-cream font-sans flex flex-col">
            {/* Header */}
            <div className="px-6 py-6 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10 border-b border-gray-100">
                <h1 className="text-2xl font-serif text-primary-black tracking-tight">Site Capture</h1>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {isOnline ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full">

                {/* Sync Status Banner */}
                {pendingCount > 0 && (
                    <div className="mb-8 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                                <UploadCloud className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-primary-black">{pendingCount} Pending</div>
                                <div className="text-xs text-gray-400">{syncStatus === 'syncing' ? 'Syncing...' : 'Waiting for connection'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center gap-8">
                    {!projectId ? (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div className="text-center space-y-4">
                                <h2 className="text-3xl font-serif text-primary-black">Welcome</h2>
                                <p className="text-gray-500 font-light">Scan a project QR code to begin capturing site progress.</p>
                            </div>

                            {scanning ? (
                                <div className="overflow-hidden rounded-3xl shadow-2xl border-4 border-white">
                                    <div id="reader"></div>
                                    <button
                                        onClick={() => setScanning(false)}
                                        className="w-full py-4 bg-white text-red-500 font-medium border-t border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setScanning(true)}
                                    className="w-full aspect-square rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-4 group hover:border-primary-black hover:bg-white transition-all bg-white shadow-sm"
                                >
                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <QrCode className="w-8 h-8 text-primary-black" />
                                    </div>
                                    <span className="font-medium text-gray-600 group-hover:text-primary-black">Scan Project QR</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                            {/* Project Card */}
                            <div className="bg-primary-black text-white p-6 rounded-3xl shadow-xl shadow-black/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                <div className="relative z-10">
                                    <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Current Project</div>
                                    <div className="text-2xl font-serif mb-4">{projectId}</div>
                                    <button
                                        onClick={() => setProjectId(null)}
                                        className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm"
                                    >
                                        Switch Project
                                    </button>
                                </div>
                            </div>

                            {/* Camera Trigger */}
                            <label className="block relative cursor-pointer group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleCapture}
                                />
                                <div className="w-full aspect-[4/5] bg-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 relative overflow-hidden transition-all hover:bg-gray-200">
                                    {/* Fake UI elements for aesthetic */}
                                    <div className="absolute top-8 w-full px-8 flex justify-between opacity-30">
                                        <div className="w-1/3 h-1 bg-black rounded-full"></div>
                                        <div className="w-1/3 h-1 bg-black rounded-full"></div>
                                    </div>

                                    <div className="w-24 h-24 rounded-full border-4 border-gray-300 flex items-center justify-center group-hover:border-primary-black transition-colors bg-white shadow-sm">
                                        <div className="w-20 h-20 rounded-full bg-primary-black group-active:scale-95 transition-transform"></div>
                                    </div>
                                    <span className="font-serif text-xl text-gray-500 group-hover:text-primary-black transition-colors">Tap to Capture</span>
                                </div>
                            </label>

                            {/* Location Pill */}
                            {location && (
                                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-white/50 py-2 rounded-full backdrop-blur-sm">
                                    <MapPin className="w-3 h-3" />
                                    <span>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Feedback Toast */}
            {status && (
                <div className="fixed bottom-8 left-6 right-6 z-50">
                    <div className={`p-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/20 text-center font-medium animate-in slide-in-from-bottom-4 fade-in ${status.includes('Error') ? 'bg-red-500/90 text-white' : 'bg-primary-black/90 text-white'
                        }`}>
                        {status.includes('Saved') ? (
                            <div className="flex items-center justify-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span>{status}</span>
                            </div>
                        ) : status}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkerPhotoCapture;
