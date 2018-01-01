import { runAll } from 'stack'

  // Automatically delete memory of missing creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  runAll()

	let miners = 0
	let upgraders = 0
	for (const name in Game.creeps) {
  	const crp = Game.creeps[name]
  	const stack = (crp.memory as any).stack
  	if (!stack && !stack.length) continue
  	if (stack[0].op === 3) {
    	miners++
   }
   if (stack[0].op === 4) {
     upgraders++
     }
 	}
  if (upgraders < 3) {
  Game.spawns['Spawn1'].spawnCreep([WORK, MOVE, CARRY], 'Upgrader' + Game.time, {memory: {stack: [{op: 4}]}})
    }
 	if (miners < 10) {
  Game.spawns['Spawn1'].spawnCreep([WORK, MOVE, CARRY], 'Miner' + Game.time, {memory: {stack: [{op: 3}]}})
  }
