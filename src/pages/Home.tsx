import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        Willkommen bei DartCounter
      </h1>
      <div className="space-y-4">
        <p className="text-xl text-gray-600">
          Wählen Sie einen Spielmodus und starten Sie Ihr Dart-Abenteuer!
        </p>
        <Link
          to="/setup"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
        >
          Neues Spiel starten
        </Link>
      </div>
    </div>
  );
};

export default Home;