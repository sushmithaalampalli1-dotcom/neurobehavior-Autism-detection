import React from 'react';

export default function StatusBanner({ backendStatus }) {
  const isConnected = backendStatus?.status === 'ok';

  // In normal medical websites, do not display technical developer banners when online
  if (isConnected) {
    return null;
  }

  return (
    <div className="banner banner-danger" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className="badge badge-danger">Offline</span>
        <span>
          <strong>Clinical Server Offline:</strong> Unable to connect to clinical assessment services. Please verify your network connection.
        </span>
      </div>
    </div>
  );
}
