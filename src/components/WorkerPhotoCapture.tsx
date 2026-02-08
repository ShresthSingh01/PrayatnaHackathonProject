import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, MapPin, QrCode, Wifi, WifiOff, UploadCloud, CheckCircle } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
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
        };

        return (
            <div className="p-4 max-w-md mx-auto bg-white min-h-screen flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-xl font-bold text-gray-800">Site Capture</h1>
                    <div className="flex items-center gap-2 text-sm">
                        {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
                        <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* Sync Status */}
                {pendingCount > 0 && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
                        <UploadCloud className="w-5 h-5 text-yellow-600 animate-pulse" />
                        <div className="text-sm text-yellow-700">
                            {pendingCount} photos pending upload
                            {syncStatus === 'syncing' && ' (Syncing...)'}
                        </div>
                    </div>
                )}

                {/* Main Action Area */}
                <div className="flex-1 flex flex-col justify-center gap-6">

                    {!projectId ? (
                        <div className="text-center space-y-4">
                            {scanning ? (
                                <div id="reader" className="overflow-hidden rounded-lg shadow-lg"></div>
                            ) : (
                                <div
                                    onClick={() => setScanning(true)}
                                    className="p-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex flex-col items-center gap-4 cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <QrCode className="w-16 h-16 text-blue-500" />
                                    <span className="text-gray-600 font-medium">Scan Project QR</span>
                                </div>
                            )}
                            {scanning && (
                                <button
                                    onClick={() => setScanning(false)}
                                    className="text-red-500 font-medium hover:underline"
                                >
                                    Cancel Scan
                                </button>
                            )}
                            <div className="text-xs text-gray-400">
                                Or visit /worker/PROJECT_ID
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Project Info */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="text-xs text-blue-500 uppercase font-bold tracking-wider mb-1">Active Project</div>
                                <div className="text-lg font-semibold text-gray-900 break-all">{projectId}</div>
                                <button
                                    onClick={() => setProjectId(null)}
                                    className="text-xs text-blue-600 hover:underline mt-2"
                                >
                                    Change Project
                                </button>
                            </div>

                            {/* Camera Action */}
                            <label className="relative block group cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={handleCapture}
                                />
                                <div className="w-full aspect-square max-h-80 bg-gray-900 rounded-2xl flex flex-col items-center justify-center gap-4 text-white shadow-xl group-active:scale-95 transition-transform">
                                    <Camera className="w-20 h-20" />
                                    <span className="text-xl font-medium">Take Site Photo</span>
                                </div>
                            </label>

                            {/* GPS Indicator */}
                            {location && (
                                <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                                    <MapPin className="w-3 h-3" />
                                    <span>GPS: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Status Feedback */}
                {status && (
                    <div className={`fixed bottom-6 left-6 right-6 p-4 rounded-lg shadow-lg text-white font-medium text-center animate-in slide-in-from-bottom-2 fade-in ${status.includes('Error') ? 'bg-red-500' : 'bg-green-600'}`}>
                        {status.includes('Uploaded') || status.includes('Saved') ? (
                            <div className="flex items-center justify-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                {status}
                            </div>
                        ) : (
                            status
                        )}
                    </div>
                )}
            </div>
        );
    };

    export default WorkerPhotoCapture;
