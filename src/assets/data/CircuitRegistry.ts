import monza from './circuits/monza.json'
import silverstone from './circuits/silverstone.json'
import spa from './circuits/spa.json'
import monaco from './circuits/monaco.json'
import suzuka from './circuits/suzuka.json'
import interlagos from './circuits/interlagos.json'
import austin from './circuits/austin.json'

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
