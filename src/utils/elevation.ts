export interface ElevationPoint {
  latitude: number
  longitude: number
  elevation: number
}

export async function fetchElevation(points: [number, number][]): Promise<number[]> {
  // Sample 300 points as requested
  const sampled = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 300)) === 0)
  
  const locations = sampled.map(p => `${p[1]},${p[0]}`).join('|')
  const url = `https://api.opentopodata.org/v1/srtm90m?locations=${locations}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    return data.results.map((r: any) => r.elevation)
  } catch (error) {
    console.error('Failed to fetch elevation:', error)
    return sampled.map(() => 0) // Fallback
  }
}
