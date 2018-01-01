
export enum Operation {
  MineEnergy = 1,
  DeliverEnergy = 2,
  FeedSpawn = 3,
  UpgradeController = 4,
  BuildLoop = 5,
}


export type Frame<S> = S&{
  op: Operation;
  done?: true;
  call?: Frame<S>;
}

export type StateWithTarget = {
  target?: string
}

export interface CreepFunc<S> {
  run(crp: Creep, s: S): Frame<S>;
  op: Operation;
  invoke?: (crp: Creep) => Frame<S>,
}

export function runMineEnergy(crp: Creep, s: Frame<StateWithTarget>): Frame<StateWithTarget> {
      let src = Game.getObjectById(s.target) as Source
      if (!src) {
        src = crp.room.find(FIND_SOURCES)[0] as Source
      }
      if (crp.harvest(src) === ERR_NOT_IN_RANGE) {
        crp.moveTo(src)
      }
      if (crp.carry.energy === crp.carryCapacity) {
        s.done = true
        return s
      }
      return s
    }

export const mineEnergy  = {
  op: Operation.MineEnergy,
  run: runMineEnergy,
  invoke: (crp: Creep) => ({op: Operation.MineEnergy}),
}

  export function runDeliverEnergy(crp: Creep, s: Frame<StateWithTarget>): Frame<StateWithTarget> {
    let dest = Game.getObjectById(s.target) as Structure
    if (!dest) {
      // target disappeared
      dest = crp.room.find(FIND_MY_STRUCTURES, {filter: s => s instanceof StructureSpawn})[0] as StructureSpawn
    }
    let err : ScreepsReturnCode = OK
    if (dest instanceof StructureSpawn) {
      err = crp.transfer(dest, RESOURCE_ENERGY)
    }
    if (dest instanceof StructureController) {
      err = crp.upgradeController(dest)
    }

    if (err === ERR_NOT_IN_RANGE) {
      crp.moveTo(dest)
    }
    if (crp.carry.energy === 0) {
      s.done = true;
      return s;
    }
    return s

  }

export const deliverEnergy  = {
  op: Operation.DeliverEnergy,
  run: runDeliverEnergy,
  invoke: (crp: Creep, target?: string) => {
    return {op: Operation.DeliverEnergy, target}
  },
}


export const feedSpawn=  {
  op: Operation.FeedSpawn,
  run: (crp: Creep) => {
    if (crp.carry.energy === 0) {
      return {op: Operation.FeedSpawn, call: mineEnergy.invoke(crp)}
    }
    return {op: Operation.FeedSpawn, call: deliverEnergy.invoke(crp)}
  },
  
}

export const upgradeController = {
  op: Operation.UpgradeController,
  run: (crp: Creep) => {
    if (crp.carry.energy === 0) {
      return {op: Operation.UpgradeController, call: mineEnergy.invoke(crp)}
    }
    let ctrl = crp.room.find(FIND_STRUCTURES, {filter: s => s instanceof StructureController})[0] as StructureController
    return {op: Operation.UpgradeController, call: deliverEnergy.invoke(crp, ctrl.id)}
  },
}

export const buildLoop = {
  op: Operation.BuildLoop,
  run: (crp: Creep, s: Frame<StateWithTarget>) => {
    if (crp.carry.energy === 0) {
      s.call = mineEnergy.invoke(crp)
      return s
    }
    let dest = Game.getObjectById(s.target)
    if (dest instanceof ConstructionSite) {
      if (crp.build(dest) === ERR_NOT_IN_RANGE) {
        crp.moveTo(dest)
      }
      return s
    }
    let sites = crp.room.find(FIND_MY_CONSTRUCTION_SITES)
    if (!sites || !sites.length) {
      s.call = mineEnergy.invoke(crp)
      return s
    }
    s.target = sites[0].id
    return s
  },
}


const functab: {[key: number]: CreepFunc<{}>} = {}  // keyed on Operation

export function registerFunc<S>(f: CreepFunc<S>) {
  functab[f.op] = f
}

registerFunc(mineEnergy)
registerFunc(deliverEnergy)
registerFunc(feedSpawn)
registerFunc(upgradeController)
registerFunc(buildLoop)

export interface CreepMem {
  stack: Frame<any>[]
}

export function runAll() {
  for (let cname in Game.creeps) {
    const crp = Game.creeps[cname];
    const stack = (crp.memory as CreepMem).stack
    if (!stack || !stack.length) {
      continue
    }
    let tip = stack.pop()
    const func = functab[tip.op]
    const ret = func.run(crp, tip)
    if (!ret.done) {
      stack.push(ret)
    }
    if (ret.call) {
      stack.push(ret.call)
      delete ret.call
    }
  }
}
