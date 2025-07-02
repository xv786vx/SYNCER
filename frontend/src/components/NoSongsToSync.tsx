import React from 'react';

const NoSongsToSync: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full w-full text-center p-6 bg-black/80 backdrop-blur-sm">
    <h2 className="text-xl font-bold mb-2">No Songs to Sync</h2>
    <p className="text-base text-brand-gray-1 mb-4">
      Sorry, but there are no new songs to sync!<br />
      All songs in your selected playlist already exist on the destination platform.
    </p>
  </div>
);

export default NoSongsToSync;
