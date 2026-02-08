import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Camera } from 'lucide-react';

// Fix for default marker icon in React Leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Photo {
    id: string;
    url: string;
    location?: { latitude: number; longitude: number };
    caption?: string;
    timestamp: number;
}

interface LiveMapProps {
    photos: Photo[];
}

const LiveMap = ({ photos }: LiveMapProps) => {
    // Filter photos with valid location
    const validPhotos = photos.filter(p => p.location && p.location.latitude && p.location.longitude);

    // Default center (San Francisco or first photo)
    const center: [number, number] = validPhotos.length > 0
        ? [validPhotos[0].location!.latitude, validPhotos[0].location!.longitude]
        : [37.7749, -122.4194];

    return (
        <div className="h-[400px] w-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden z-0">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    Live Site Map
                </h3>
                <span className="text-xs text-gray-500">{validPhotos.length} geo-tagged photos</span>
            </div>

            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {validPhotos.map(photo => (
                    <Marker
                        key={photo.id}
                        position={[photo.location!.latitude, photo.location!.longitude]}
                    >
                        <Popup>
                            <div className="w-40">
                                <img
                                    src={photo.url}
                                    alt="Site capture"
                                    className="w-full h-24 object-cover rounded-lg mb-2"
                                />
                                <p className="text-xs text-gray-600 mb-1">{photo.caption || 'No caption'}</p>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <Camera className="w-3 h-3" />
                                    {new Date(photo.timestamp).toLocaleString()}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default LiveMap;
