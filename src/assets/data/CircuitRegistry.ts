import monza from '../assets/data/circuits/monza.json'
import silverstone from '../assets/data/circuits/silverstone.json'
import spa from '../assets/data/circuits/spa.json'
import monaco from '../assets/data/circuits/monaco.json'
import suzuka from '../assets/data/circuits/suzuka.json'
import interlagos from '../assets/data/circuits/interlagos.json'
import austin from '../assets/data/circuits/austin.json'

export const circuits = {
  Monza: monza,
  Silverstone: silverstone,
  Spa: spa,
  Monaco: monaco,
  Suzuka: suzuka,
  Interlagos: interlagos,
  Austin: austin
}

export type CircuitName = keyof typeof circuits
