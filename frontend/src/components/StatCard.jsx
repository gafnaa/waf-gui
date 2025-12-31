import React from 'react';

const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:border-gray-600 transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <h3 className={`text-3xl font-bold ${color}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-lg bg-gray-700/50 ${color}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;