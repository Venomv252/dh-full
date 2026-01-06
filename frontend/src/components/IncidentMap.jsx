import { useState, useEffect, useMemo } from 'react';
import GoogleMap from './GoogleMap';
import { 
  getIncidentTypeIcon, 
  getPriorityColor, 
  formatTimeAgo,
  calculateDistance 
} from '../utils/incidentUtils';

const IncidentMap = ({
  incidents = [],
  center = null,
  zoom = 13,
  height = '500px',
  width = '100%',
  onIncidentClick = null,
  showUserLocation = true,
  enableClustering = true,
  clusterRadius = 50, // pixels
  selectedIncidentId = null,
  className = ''
}) => {
  const [mapCenter, setMapCenter] = useState(center || { lat: 40.7128, lng: -74.0060 });
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Get user location and set as center if no center provided
  useEffect(() => {
    if (!center && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Error getting user location:', error);
        }
      );
    }
  }, [center]);

  // Create incident markers with clustering
  const markers = useMemo(() => {
    if (!incidents.length) return [];

    // Filter out incidents without valid coordinates
    const validIncidents = incidents.filter(incident => 
      incident.location?.coordinates && 
      incident.location.coordinates.length === 2 &&
      !isNaN(incident.location.coordinates[0]) &&
      !isNaN(incident.location.coordinates[1])
    );

    if (!enableClustering) {
      return validIncidents.map(incident => createIncidentMarker(incident));
    }

    // Simple clustering algorithm
    const clusters = [];
    const processed = new Set();

    validIncidents.forEach((incident, index) => {
      if (processed.has(index)) return;

      const cluster = {
        incidents: [incident],
        center: {
          lat: incident.location.coordinates[1],
          lng: incident.location.coordinates[0]
        }
      };

      // Find nearby incidents to cluster
      validIncidents.forEach((otherIncident, otherIndex) => {
        if (index === otherIndex || processed.has(otherIndex)) return;

        const distance = calculateDistance(
          incident.location.coordinates[1],
          incident.location.coordinates[0],
          otherIncident.location.coordinates[1],
          otherIncident.location.coordinates[0]
        );

        // If within cluster radius (approximate conversion from pixels to meters)
        if (distance <= clusterRadius * 10) {
          cluster.incidents.push(otherIncident);
          processed.add(otherIndex);
        }
      });

      processed.add(index);
      clusters.push(cluster);
    });

    // Convert clusters to markers
    return clusters.map(cluster => {
      if (cluster.incidents.length === 1) {
        return createIncidentMarker(cluster.incidents[0]);
      } else {
        return createClusterMarker(cluster);
      }
    });
  }, [incidents, enableClustering, clusterRadius]);

  const createIncidentMarker = (incident) => {
    const isSelected = selectedIncidentId === incident.id;
    const priorityColor = getPriorityColor(incident.priority);
    const typeIcon = getIncidentTypeIcon(incident.type);

    return {
      lat: incident.location.coordinates[1],
      lng: incident.location.coordinates[0],
      title: `${incident.type} - ${incident.priority} priority`,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="${getColorHex(priorityColor)}" stroke="${isSelected ? '#000' : '#fff'}" stroke-width="${isSelected ? '3' : '2'}"/>
            <text x="20" y="26" text-anchor="middle" font-size="16" fill="white">${typeIcon}</text>
          </svg>
        `)}`,
        scaledSize: { width: 40, height: 40 }
      },
      infoContent: createIncidentInfoWindow(incident),
      incidentData: incident
    };
  };

  const createClusterMarker = (cluster) => {
    const count = cluster.incidents.length;
    const highestPriority = getHighestPriority(cluster.incidents);
    const priorityColor = getPriorityColor(highestPriority);

    return {
      lat: cluster.center.lat,
      lng: cluster.center.lng,
      title: `${count} incidents in this area`,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="23" fill="${getColorHex(priorityColor)}" stroke="#fff" stroke-width="2"/>
            <text x="25" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="white">${count}</text>
          </svg>
        `)}`,
        scaledSize: { width: 50, height: 50 }
      },
      infoContent: createClusterInfoWindow(cluster.incidents),
      clusterData: cluster.incidents
    };
  };

  const createIncidentInfoWindow = (incident) => {
    const typeIcon = getIncidentTypeIcon(incident.type);
    const priorityColor = getPriorityColor(incident.priority);
    
    return `
      <div style="max-width: 300px; padding: 12px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 24px; margin-right: 8px;">${typeIcon}</span>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: bold; text-transform: capitalize;">
              ${incident.type} Emergency
            </h3>
            <span style="
              background-color: ${getColorHex(priorityColor)}; 
              color: white; 
              padding: 2px 8px; 
              border-radius: 12px; 
              font-size: 12px; 
              text-transform: capitalize;
            ">
              ${incident.priority} Priority
            </span>
          </div>
        </div>
        <p style="margin: 8px 0; font-size: 14px; color: #666;">
          ${incident.description.length > 100 ? incident.description.substring(0, 100) + '...' : incident.description}
        </p>
        <div style="font-size: 12px; color: #888; margin-top: 8px;">
          <div>Reported: ${formatTimeAgo(incident.createdAt)}</div>
          ${incident.upvotes ? `<div>Confirmations: ${incident.upvotes}</div>` : ''}
          ${incident.status ? `<div>Status: <span style="text-transform: capitalize;">${incident.status}</span></div>` : ''}
        </div>
        ${incident.location?.address ? `
          <div style="font-size: 12px; color: #666; margin-top: 4px; border-top: 1px solid #eee; padding-top: 4px;">
            📍 ${incident.location.address}
          </div>
        ` : ''}
      </div>
    `;
  };

  const createClusterInfoWindow = (incidents) => {
    const sortedIncidents = incidents.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });

    const incidentsList = sortedIncidents.slice(0, 5).map(incident => {
      const typeIcon = getIncidentTypeIcon(incident.type);
      const priorityColor = getPriorityColor(incident.priority);
      
      return `
        <div style="display: flex; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee;">
          <span style="font-size: 16px; margin-right: 8px;">${typeIcon}</span>
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 500; text-transform: capitalize;">
              ${incident.type}
            </div>
            <div style="font-size: 12px; color: #666;">
              ${formatTimeAgo(incident.createdAt)} • 
              <span style="color: ${getColorHex(priorityColor)}; text-transform: capitalize;">
                ${incident.priority}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="max-width: 320px; padding: 12px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">
          ${incidents.length} Incidents in this Area
        </h3>
        <div style="max-height: 200px; overflow-y: auto;">
          ${incidentsList}
        </div>
        ${incidents.length > 5 ? `
          <div style="text-align: center; margin-top: 8px; font-size: 12px; color: #666;">
            ... and ${incidents.length - 5} more incidents
          </div>
        ` : ''}
      </div>
    `;
  };

  const getHighestPriority = (incidents) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return incidents.reduce((highest, incident) => {
      return (priorityOrder[incident.priority] || 0) > (priorityOrder[highest] || 0) 
        ? incident.priority 
        : highest;
    }, 'low');
  };

  const getColorHex = (colorName) => {
    const colors = {
      red: '#EF4444',
      orange: '#F97316',
      yellow: '#EAB308',
      green: '#22C55E',
      blue: '#3B82F6',
      purple: '#8B5CF6',
      gray: '#6B7280'
    };
    return colors[colorName] || colors.gray;
  };

  const handleMarkerClick = (markerData, index) => {
    if (markerData.incidentData) {
      // Single incident marker clicked
      setSelectedIncident(markerData.incidentData);
      if (onIncidentClick) {
        onIncidentClick(markerData.incidentData);
      }
    } else if (markerData.clusterData) {
      // Cluster marker clicked - could implement zoom in or show list
      console.log('Cluster clicked:', markerData.clusterData);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <GoogleMap
        center={mapCenter}
        zoom={zoom}
        height={height}
        width={width}
        markers={markers}
        onMarkerClick={handleMarkerClick}
        showUserLocation={showUserLocation}
        className="border border-gray-200"
      />
      
      {/* Map Legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Map Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>Critical Priority</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
            <span>High Priority</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span>Medium Priority</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span>Low Priority</span>
          </div>
          {enableClustering && (
            <div className="flex items-center space-x-2 pt-1 border-t border-gray-200">
              <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                #
              </div>
              <span>Multiple Incidents</span>
            </div>
          )}
        </div>
      </div>

      {/* Incident Count */}
      {incidents.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2">
          <div className="text-sm font-medium text-gray-900">
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''} shown
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentMap;