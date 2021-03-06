//@flow

const { test, beforeAll, afterAll } = require("./benchmark");

beforeAll(() => {
  const { Record, Repeat } = require("immutable");
  const { default: produce, setAutoFreeze, setUseProxies } = require("immer");
});

afterAll(results => {
  const { printResults } = require("./printResults");
  printResults(results);
});

// describe('performance', () => {
// beforeEach(() => {
//  draft = cloneDeep(baseState)
//  memoryBefore = process.memoryUsage()
// })
// afterEach(() => {
//  const memoryAfter = process.memoryUsage()
//  console.log(memoryBefore)
//  console.log(memoryAfter)
// })
const MAX = 100000;
const MODIFY_FACTOR = 0.1;

function getItem(any, i) {
  return {
    todo: `todo_${i}`,
    done: false,
    someThingCompletelyIrrelevant: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
  };
}
function generateDraft() {
  const draft = [];
  for (let i = 0; i < MAX; i++) {
    draft.push(getItem(undefined, i));
  }
  return draft;
}
module.exports.generateDraft = generateDraft;
// Produce the frozen bazeState
// frozenBazeState = deepFreeze(cloneDeep(baseState))

// generate immutalbeJS base state

test("immutableJS", prepared => {
  const { Record, Repeat } = require("immutable");
  const todoRecord = Record({
    todo: "",
    done: false,
    someThingCompletelyIrrelevant: []
  });
  const draft = Repeat(undefined, MAX)
    .map((_, i) => todoRecord(getItem(_, i)))
    .toList();
  prepared();
  const result = draft.withMutations(state => {
    for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
      state.setIn([i, "done"], true);
    }
  });
  return result;
});

//  test('just mutate, freeze', () => {
//   for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
//    draft[i].done = true
//   }
//   deepFreeze(draft)
//  })

// test('deepclone, then mutate', () => {
//  const draft = cloneDeep(baseState)
//  for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
//   draft[i].done = true
//  }
// })

// test('deepclone, then mutate, then freeze', () => {
//  const draft = cloneDeep(baseState)
//  for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
//   draft[i].done = true
//  }
//  deepFreeze(draft)
// })

// test('handcrafted reducer (no freeze)', () => {
//  const nextState = [
//   ...baseState.slice(0, MAX * MODIFY_FACTOR).map(todo => ({
//    ...todo,
//    done: true,
//   })),
//   ...baseState.slice(MAX * MODIFY_FACTOR),
//  ]
// })

// test('handcrafted reducer (with freeze)', () => {
//  const nextState = freeze([
//   ...baseState.slice(0, MAX * MODIFY_FACTOR).map(todo =>
//    freeze({
//     ...todo,
//     done: true,
//    }),
//   ),
//   ...baseState.slice(MAX * MODIFY_FACTOR),
//  ])
// })

// test('naive handcrafted reducer (without freeze)', () => {
//  const nextState = baseState.map((todo, index) => {
//   if (index < MAX * MODIFY_FACTOR)
//    return {
//     ...todo,
//     done: true,
//    }
//   else return todo
//  })
// })

// test('naive handcrafted reducer (with freeze)', () => {
//  const nextState = deepFreeze(
//   baseState.map((todo, index) => {
//    if (index < MAX * MODIFY_FACTOR)
//     return {
//      ...todo,
//      done: true,
//     }
//    else return todo
//   }),
//  )
// })

// test('immutableJS + toJS', () => {
//  const state = immutableJsBaseState
//   .withMutations(state => {
//    for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
//     state.setIn([i, 'done'], true)
//    }
//   })
//   .toJS()
// })

test("immer (proxy) - without autofreeze", prepared => {
  //$off
  const { default: produce, setAutoFreeze, setUseProxies } = require("immer");
  const draft = generateDraft();
  prepared();

  setUseProxies(true);
  setAutoFreeze(false);
  produce(draft, draft => {
    for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
      draft[i].done = true;
    }
  });
  return draft;
});

test("mobx", prepared => {
  //$off
  const { observable } = require("mobx");
  const data = observable(generateDraft());
  prepared();

  const mutate = draft => {
    for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
      draft[i].done = true;
    }
  };
  mutate(data);
  return data;
});

// test('effector (mutable inner update)', prepared => {
//  //$off
//  const {createEvent, createStore} = require('../npm/effector/effector.cjs.js')
//  const updateEvent = createEvent('update')
//  const effectorStore = createStore(generateDraft()).on(updateEvent, draft => {
//   const newDraft = draft.concat([])
//   for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
//    newDraft[i].done = true
//   }
//   return newDraft
//  })
//  prepared()
//  updateEvent()
//  return effectorStore.getState()
// })

test("restate x", prepared => {
  //$off
  const { createAction, createState, local } = require("../dist/lib/");

  const updateEvent = createAction("update");
  const effectorStore = createState(generateDraft()).on(updateEvent, draft => {
    const newDraft = draft.concat([]);
    for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
      newDraft[i] = Object.assign({}, newDraft[i], { done: true });
    }
    return newDraft;
  });

  effectorStore.map(el => el[0], true);

  effectorStore.subscribe(data => {});
  const store = effectorStore.use(local);
  prepared();

  updateEvent();
  return effectorStore.getState();
});

test("restate x (only redux helpers)", prepared => {
  //$off
  const { createState } = require("../dist/lib/createReducer");
  const { createAction } = require("../dist/lib/createAction");

  const updateEvent = createAction("update");
  const restateStore = createState(generateDraft()).on(updateEvent, draft => {
    const newDraft = draft.concat([]);
    for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
      newDraft[i] = Object.assign({}, newDraft[i], { done: true });
    }
    return newDraft;
  });

  const store = redux.createStore(restateStore.reducer);
  store.subscribe(() => {});
  prepared();

  prepared();

  store.dispatch(updateEvent.raw());

  return store.getState();
});

const { proxyState, proxyEqual, proxyShallow } = require("proxyequal");

// wrap the original state
const state = () => ({ a: generateDraft(), b: generateDraft(), c: generateDraft() });
test("proxy", () => {
  const trapped = proxyState(state());
});
const redux = require("redux");
test("redux", prepared => {
  const reducer = (draft = generateDraft()) => {
    const newDraft = draft.concat([]);
    for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
      newDraft[i] = Object.assign({}, newDraft[i], { done: true });
    }
    return newDraft;
  };
  const store = redux.createStore(reducer);
  store.subscribe(() => {});
  prepared();
  store.dispatch({ type: "init" });
});

// test('immer (es5) - without autofreeze', () => {
//  setUseProxies(false)
//  setAutoFreeze(false)
//  produce(baseState, draft => {
//   for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
//    draft[i].done = true
//   }
//  })
// })

// test('immer (es5) - with autofreeze', () => {
//  setUseProxies(false)
//  setAutoFreeze(true)
//  produce(frozenBazeState, draft => {
//   for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
//    draft[i].done = true
//   }
//  })
// })
// })

test("just mutate", prepared => {
  const draft = generateDraft();
  prepared();
  for (let i = 0; i < MAX * MODIFY_FACTOR; i++) {
    draft[i].done = true;
  }
  return draft;
});
