import React from 'react';

const EurovisionVoting = ({ userProfile }) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold text-white text-center mb-8">
        🎵 AIVISION Voting
      </h1>
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 text-center">
        <p className="text-white text-xl mb-4">Welcome, {userProfile?.name}!</p>
        <p className="text-purple-200">
          Your Eurovision AI voting system is now ready! 
          This is a placeholder - add your voting interface here.
        </p>
      </div>
    </div>
  );
};

export default EurovisionVoting;