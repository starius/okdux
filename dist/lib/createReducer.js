"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var redux_1 = require("redux");
exports.reducerPathSymbol = Symbol();
var keys = [];
var action;
var changedMonitor = {
    setChanged: function (newAction, key) {
        if (action !== newAction) {
            keys = [key];
            action = newAction;
        }
        else {
            keys.push(key);
        }
    }
};
exports.getKeys = function () { return keys; };
function getProp(object, keys) {
    keys = Array.isArray(keys) ? keys : keys.split(".");
    object = object[keys[0]];
    if (object && keys.length > 1) {
        return getProp(object, keys.slice(1));
    }
    return object;
}
function isReducerBuilder(builder) {
    return builder && typeof builder === "object" && Reflect.has(builder, exports.reducerPathSymbol);
}
function traverseReducers(reducers, path) {
    for (var key in reducers) {
        var reducer = reducers[key];
        if (isReducerBuilder(reducer)) {
            reducer[exports.reducerPathSymbol] = (path ? path + "." : "") + key;
        }
    }
}
var atomReducer = function (defaultV, type) { return function (state, action) {
    if (state === void 0) { state = defaultV; }
    return action && action.type === type ? action.payload : state;
}; };
var identityWithDefault = function (d) { return function (s) {
    if (s === void 0) { s = d; }
    return s;
}; };
function pruneInitialState(initialState) {
    return Object.keys(initialState).reduce(function (acc, el) {
        if (isReducerBuilder(initialState[el])) {
            acc.reducers[el] = initialState[el].buildReducer();
        }
        else if (initialState[el] && initialState[el].getType) {
            var t = initialState[el].getType();
            acc.reducers[el] = atomReducer(initialState[el].defaultValue, t);
        }
        else {
            acc.defaultState[el] = initialState[el];
            acc.reducers[el] = identityWithDefault(initialState[el]);
        }
        return acc;
    }, { reducers: {}, defaultState: {} });
}
var identity = function (d) {
    var _ = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        _[_i - 1] = arguments[_i];
    }
    return d;
};
function getDefaultReducer(initialState, path) {
    var defaultState = initialState;
    var nestedReducer = identity;
    if (typeof initialState === "object") {
        traverseReducers(initialState, path);
        var res = pruneInitialState(initialState);
        if (Object.keys(res.reducers).length !== 0) {
            // @ts-ignore
            nestedReducer = redux_1.combineReducers(res.reducers);
        }
        defaultState = res.defaultState;
    }
    return { nestedReducer: nestedReducer, defaultState: defaultState };
}
var ReducerBuilder = /** @class */ (function () {
    function ReducerBuilder(initialState) {
        var _this = this;
        this.initialState = initialState;
        this.handlers = {};
        this[_a] = "";
        this.select = function (rs) {
            if (_this[exports.reducerPathSymbol]) {
                return getProp(rs, _this[exports.reducerPathSymbol]);
            }
            else {
                return rs;
            }
        };
        // @ts-ignore
        this.mapState = function (fn) {
            return function (state, props) { return fn(_this.select(state), props, state); };
        };
    }
    // @ts-ignore
    ReducerBuilder.prototype.on = function (action, handler) {
        if (action === undefined || action === null || !action.getType) {
            throw new Error("action should be an action, got " + action);
        }
        this.handlers[action.getType()] = handler;
        return this;
    };
    // @ts-ignore
    ReducerBuilder.prototype.handle = function (type, handler) {
        var _this = this;
        if (Array.isArray(type)) {
            type.forEach(function (t) { return _this.handle(t, handler); });
        }
        else {
            this.handlers[type] = handler;
        }
        return this;
    };
    Object.defineProperty(ReducerBuilder.prototype, "reducer", {
        get: function () {
            return this._reducer;
        },
        enumerable: true,
        configurable: true
    });
    ReducerBuilder.prototype.buildReducer = function (path) {
        var _this = this;
        if (path) {
            this[exports.reducerPathSymbol] = path;
        }
        var _a = getDefaultReducer(this.initialState, this[exports.reducerPathSymbol] || path), defaultState = _a.defaultState, nestedReducer = _a.nestedReducer;
        var reducer = function (state, action) {
            if (state === void 0) { state = defaultState; }
            state = nestedReducer(state, action);
            if (!action) {
                return state;
            }
            var type = action.type, payload = action.payload;
            if (_this.handlers[type]) {
                var handler = _this.handlers[type];
                var nextState = handler(state, payload, action);
                if (nextState !== state) {
                    changedMonitor.setChanged(action, _this[exports.reducerPathSymbol]);
                }
                state = nextState;
            }
            return state;
        };
        this._reducer = reducer;
        return reducer;
    };
    return ReducerBuilder;
}());
_a = exports.reducerPathSymbol;
exports.ReducerBuilder = ReducerBuilder;
var _a;
//# sourceMappingURL=createReducer.js.map