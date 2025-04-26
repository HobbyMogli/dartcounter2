import { colors } from '../../styles/theme/colors';

// Define the special throw types
export type SpecialThrowType = 'breakfast' | 'shanghai' | 'hatTrick' | 'madhouse';

// Define animation types
export type AnimationType = 'popAndGlow' | 'bounceGlow' | 'pulseExpand';

// Define the special throw object structure
export interface SpecialThrow {
  type: SpecialThrowType;
  name: string;
  description: string;
  color: string;
  animation: AnimationType;
}

// Special throw detection function
export function detectSpecialThrow(
  throws: { score: number; multiplier: number }[] | null[], 
  currentScore: number
): SpecialThrow | undefined {
  // Filter out null entries
  const validThrows = throws.filter(t => t !== null) as { score: number; multiplier: number }[];
  
  // Special Case: Madhouse - when the player has exactly 2 points remaining
  if (currentScore === 2) {
    return {
      type: 'madhouse',
      name: 'MADHOUSE!',
      description: 'The dreaded double 1 checkout!',
      color: colors.neon.red,
      animation: 'pulseExpand'
    };
  }
  
  // If we don't have 3 valid throws, we can't have a special combination
  if (validThrows.length !== 3) {
    return undefined;
  }

  // Check for "Breakfast" - specifically S1, S5, S20 in any order
  const isBreakfast = validThrows.length === 3 && 
    validThrows.every(t => t.multiplier === 1) && // All throws must be singles
    [1, 5, 20].every(value => // Must contain S1, S5, and S20
      validThrows.some(t => t.score === value)
    );

  if (isBreakfast) {
    return {
      type: 'breakfast',
      name: 'BREAKFAST!',
      description: 'Single 1, Single 5, Single 20 - the "Breakfast" special!',
      color: colors.neon.mint,
      animation: 'popAndGlow'
    };
  }

  // Check for "Shanghai" - a single, double, and triple of the same number
  const uniqueTargets = new Set(validThrows.map(t => t.score / t.multiplier));
  const uniqueMultipliers = new Set(validThrows.map(t => t.multiplier));
  if (uniqueTargets.size === 1 && uniqueMultipliers.size === 3 && 
      uniqueMultipliers.has(1) && uniqueMultipliers.has(2) && uniqueMultipliers.has(3)) {
    return {
      type: 'shanghai',
      name: 'SHANGHAI!',
      description: 'Single, double, and triple of the same number!',
      color: colors.neon.blue,
      animation: 'bounceGlow'
    };
  }

  // Check for "Hat Trick" - three throws of the same multiplier (triple)
  const allTriple = validThrows.every(t => t.multiplier === 3);
  if (allTriple) {
    return {
      type: 'hatTrick',
      name: 'HAT TRICK!',
      description: 'Three triples in a row!',
      color: colors.neon.lime,
      animation: 'pulseExpand'
    };
  }

  // No special throw detected
  return undefined;
}