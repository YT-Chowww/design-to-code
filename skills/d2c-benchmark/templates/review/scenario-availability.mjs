export function scenarioAvailability(availability, scenarioId) {
  const evidence = availability?.[scenarioId];
  if (!evidence || typeof evidence.available !== 'boolean' || typeof evidence.reason !== 'string') {
    return null;
  }
  return { available: evidence.available, reason: evidence.reason };
}
