/**
 * X01 game mode specific logic functions
 */

/**
 * Checks if a checkout is possible with the given score and rules
 * @param score - Current score of the player
 * @param checkoutRule - Rule to use for checkout ('straight', 'double', 'triple')
 * @returns boolean indicating if checkout is possible
 */
export function isX01CheckoutPossible(score: number, checkoutRule: 'straight' | 'double' | 'triple'): boolean {
  // For straight checkout, any score can be checked out directly
  if (checkoutRule === 'straight') return true;
  
  // For double-out, score must be even and above 1
  if (checkoutRule === 'double') {
    return score > 1 && score % 2 === 0;
  }
  
  // For triple-out, score must be divisible by 3 or certain exceptions
  if (checkoutRule === 'triple') {
    return score >= 3 && (score % 3 === 0 || score % 3 === 2);
  }
  
  return false;
}

/**
 * Validates if the current score is valid with the checkout rule 
 * @param score - Current score of the player
 * @param checkoutRule - Rule to use for checkout ('straight', 'double', 'triple')
 * @returns boolean indicating if the score is valid with the checkout rule
 */
export function isX01CheckoutScoreValid(score: number, checkoutRule: 'straight' | 'double' | 'triple'): boolean {
  // Zero is always valid (game completed)
  if (score === 0) return true;
  
  // With straight checkout, any score above 0 is valid
  if (checkoutRule === 'straight') return score > 0;
  
  // With double checkout, score must be at least 2
  if (checkoutRule === 'double') return score >= 2;
  
  // With triple checkout, score must be at least 3
  if (checkoutRule === 'triple') return score >= 3;
  
  return false;
}

/**
 * Get all possible checkout combinations for a score
 * @param score - Current score of the player
 * @param checkoutRule - Rule to use for checkout ('straight', 'double', 'triple') 
 * @returns Array of checkout combinations
 */
export function getX01CheckoutPaths(score: number, checkoutRule: 'straight' | 'double' | 'triple'): string[] {
  // This would contain logic to calculate possible checkout paths
  // Implementation not needed for current fixes
  return [];
}