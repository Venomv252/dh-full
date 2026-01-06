import { useState } from 'react';
import GoogleMap from '../components/GoogleMap';
import IncidentMap from '../components/IncidentMap';
import LocationPicker from '../components/LocationPicker';

const MapsDemo = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  // Mock incident data for demonstration
  const mockIncidents = [
    {
      id: '1',
      type: 'medical',
      priority: 'critical',
      description: 'Heart attack reported at downtown office building',
      location: {
        coordinates: [-74.0060, 40.7128], // [lng, lat] format for GeoJSON
        address: '123 Main St, New York, NY'
      },
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
      upvotes: 3,
      status: 'responding'
    },
    {
      id: '2',
      type: 'fire',
      priority: 'high',
      description: 'Building fire with smoke visible from street',
      location: {
        coordinates: [-74.0070, 40.7138],
        address: '456 Oak Ave, New York, NY'
      },
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      upvotes: 7,
      status: 'active'
    },
    {
      id: '3',
      type: 'accident',
      priority: 'medium',
      description: 'Multi-vehicle accident blocking traffic',
      location: {
        coordinates: [-74.0050, 40.7118],
        address: '789 Broadway, New York, NY'
      },
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
      upvotes: 2,
      status: 'onScene'
    },
    {
      id: '4',
      type: 'crime',
      priority: 'high',
      description: 'Armed robbery in progress at convenience store',
      location: {
        coordinates: [-74.0080, 40.7148],
        address: '321 Park Blvd, New York, NY'
      },
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      upvotes: 1,
      status: 'responding'
    },
    {
      id: '5',
      type: 'utility',
      priority: 'low',
      description: 'Power outage affecting several blocks',
      location: {
        coordinates: [-74.0040, 40.7108],
        address: '654 Center St, New York, NY'
      },
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      upvotes: 5,
      status: 'active'
    }
  ];

  const tabs = [
    { id: 'basic', label: 'Basic Map', description: 'Simple Google Maps integration' },
    { id: 'incidents', label: 'Incident Map', description: 'Map with incident markers and clustering' },
    { id: 'picker', label: 'Location Picker', description: 'Interactive location selection' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Maps Integration Demo</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Demonstration of the maps integration components including basic maps, 
            incident visualization with clustering, and interactive location picking.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Google Map</h2>
                <p className="text-gray-600 mb-4">
                  A simple Google Maps implementation with user location and click handling.
                </p>
                <GoogleMap
                  center={{ lat: 40.7128, lng: -74.0060 }}
                  zoom={13}
                  height="500px"
                  showUserLocation={true}
                  onMapClick={(location) => {
                    console.log('Map clicked:', location);
                    setSelectedLocation(location);
                  }}
                />
                {selectedLocation && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Last clicked location:</p>
                    <p className="text-sm text-blue-700">
                      {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Incident Map with Clustering</h2>
                <p className="text-gray-600 mb-4">
                  Interactive map showing emergency incidents with priority-based markers and clustering. 
                  Click on markers to see incident details.
                </p>
                <IncidentMap
                  incidents={mockIncidents}
                  center={{ lat: 40.7128, lng: -74.0060 }}
                  zoom={14}
                  height="600px"
                  enableClustering={true}
                  onIncidentClick={(incident) => {
                    console.log('Incident clicked:', incident);
                  }}
                />
              </div>

              {/* Incident Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                      {mockIncidents.filter(i => i.priority === 'critical').length}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-900">Critical</p>
                      <p className="text-xs text-red-700">Life-threatening</p>
                    </div>
                  </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                      {mockIncidents.filter(i => i.priority === 'high').length}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-900">High</p>
                      <p className="text-xs text-orange-700">Urgent</p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                      {mockIncidents.filter(i => i.priority === 'medium').length}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Medium</p>
                      <p className="text-xs text-yellow-700">Attention needed</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                      {mockIncidents.filter(i => i.priority === 'low').length}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Low</p>
                      <p className="text-xs text-green-700">Non-urgent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'picker' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Interactive Location Picker</h2>
                <p className="text-gray-600 mb-4">
                  Click anywhere on the map to select a precise location, or use the "Use Current Location" 
                  button to automatically detect your position.
                </p>
                <LocationPicker
                  onLocationSelect={(location) => {
                    console.log('Location selected:', location);
                    setSelectedLocation(location);
                  }}
                  height="500px"
                  showCurrentLocation={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This demo uses mock Google Maps implementation for development. 
            In production, integrate with the actual Google Maps JavaScript API.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapsDemo;