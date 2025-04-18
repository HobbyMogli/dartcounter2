import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../components/common';

const Home: React.FC = () => {
  return (
    <div className="text-center">
      <Card 
        className="max-w-2xl mx-auto" 
        glowEffect="blue"
      >
        <h1 className="text-4xl font-bold text-neon-blue mb-8">
          Willkommen bei DartCounter
        </h1>
        <div className="space-y-6">
          <p className="text-xl text-gray-300">
            Wählen Sie einen Spielmodus und starten Sie Ihr Dart-Abenteuer!
          </p>
          <div className="space-x-4">
            <Link to="/setup">
              <Button variant="priority" size="lg">
                Neues Spiel starten
              </Button>
            </Link>
            <Button variant="secondary" size="lg">
              Tutorial
            </Button>
            <Button variant="danger" size="lg">
              Zurücksetzen
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Home;