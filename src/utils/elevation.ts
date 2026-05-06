export interface ElevationPoint {
  latitude: number
  longitude: number
  elevation: number
}

export async function fetchElevation(points: [number, number][]): Promise<number[]> {
  // Use all points for perfect spatial alignment
  const sampled = points 
  
  const batchSize = 100
  const results: number[] = []

  for (let i = 0; i < sampled.length; i += batchSize) {
    const batch = sampled.slice(i, i + batchSize)
    const locations = batch.map(p => `${p[1]},${p[0]}`).join('|')
    const url = `https://api.opentopodata.org/v1/srtm30m?locations=${locations}`

    try {
      const response = await fetch(url)
      const data = await response.json()
      if (data.results) {
        // Sanitize: fallback to 0 if elevation is null/undefined/NaN
        results.push(...data.results.map((r: any) => (typeof r.elevation === 'number' && !isNaN(r.elevation)) ? r.elevation : 0))
      } else {
        throw new Error('No results in elevation data')
      }
      
      // Small delay to avoid hitting rate limits
      if (i + batchSize < sampled.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    } catch (error) {
      console.error(`Failed to fetch elevation batch ${i}:`, error)
      results.push(...batch.map(() => 0))
    }
  }

  return results
}
