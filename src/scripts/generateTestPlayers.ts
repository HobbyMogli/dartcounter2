import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testPlayers = [
  {
    name: 'Alexander',
    nickname: 'Alex',
    gamesPlayed: 42,
    gamesWon: 18,
    averageScore: 43.5,
    highestScore: 180,
    checkoutPercentage: 32.5
  },
  {
    name: 'Bernd',
    nickname: 'Bernie',
    gamesPlayed: 35,
    gamesWon: 12,
    averageScore: 38.2,
    highestScore: 160,
    checkoutPercentage: 28.4
  },
  {
    name: 'Christina',
    nickname: 'Tina',
    gamesPlayed: 51,
    gamesWon: 25,
    averageScore: 45.8,
    highestScore: 180,
    checkoutPercentage: 35.7
  },
  {
    name: 'Daniel',
    nickname: 'Dan',
    gamesPlayed: 28,
    gamesWon: 9,
    averageScore: 35.4,
    highestScore: 140,
    checkoutPercentage: 25.8
  },
  {
    name: 'Eva',
    nickname: 'Evi',
    gamesPlayed: 38,
    gamesWon: 15,
    averageScore: 41.2,
    highestScore: 165,
    checkoutPercentage: 30.2
  }
];

async function generateTestPlayers() {
  console.log('Generating test players...');
  
  for (const player of testPlayers) {
    try {
      const createdPlayer = await prisma.player.create({
        data: {
          name: player.name,
          nickname: player.nickname,
          gamesPlayed: player.gamesPlayed,
          gamesWon: player.gamesWon,
          averageScore: player.averageScore,
          highestScore: player.highestScore,
          checkoutPercentage: player.checkoutPercentage
        }
      });
      console.log(`Created player: ${player.name}`);
    } catch (error) {
      console.error(`Error creating player ${player.name}:`, error);
    }
  }
  
  console.log('Finished generating test players');
  await prisma.$disconnect();
}

// Execute the function
generateTestPlayers()
  .catch((error) => {
    console.error('Error in script execution:', error);
    process.exit(1);
  });
