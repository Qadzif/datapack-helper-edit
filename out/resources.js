"use strict";
/**
 * Handle resources
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const util_1 = require("./util");
const util_2 = require("util");
const timers_1 = require("timers");
const NAME_PATTERN = /^[a-z0-9-_.]+$/;
const OBJ_PATTERN = /^scoreboard objectives add (\S+) (\S+)/;
const TEAM_PATTERN = /^team add (\S+)/;
const BOSSBAR_PATTERN = /^bossbar create (\S+) (\S+)/;
const LINE_DELIMITER = /\r\n|\n|\r/g;
function initialize() {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length !== 1) {
        //Cannot handle multi-root folder right now, quit
        return;
    }
    let root = vscode.workspace.workspaceFolders[0].uri;
    fs.open(path.join(root.fsPath, 'pack.mcmeta'), "wx", (err, fd) => {
        if (err) {
            if (err.code !== 'EEXIST') {
                vscode.window.showErrorMessage("Error opening pack.mcmeta");
            }
            return;
        }
        vscode.window.showInputBox({
            prompt: "Description of your datapack"
        }).then(v => {
            fs.write(fd, `{"pack":{"pack_format":4,"description":${JSON.stringify(v)}}}`, err => {
                if (err)
                    vscode.window.showErrorMessage("Error opening pack.mcmeta");
            });
        });
    });
    fs.mkdir(path.join(root.fsPath, '.datapack'), (err) => {
        if (err) {
            vscode.window.showErrorMessage("Error creating .datapack folder");
            return;
        }
        fs.writeFile(path.join(root.fsPath, '.datapack', 'objectives.json'), "[]", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/objectives.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'functions.json'), "{}", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/functions.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'advancements.json'), "{}", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/advancements.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'entity_tags.json'), "[]", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/entity_tags.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'teams.json'), "[]", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/teams.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'sounds.json'), "{}", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/sounds.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'functionsTag.json'), "{}", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/functionsTag.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'blocksTag.json'), "{}", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/blocksTag.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'itemsTag.json'), "{}", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/itemsTag.json");
            }
        });
        fs.writeFile(path.join(root.fsPath, '.datapack', 'bossbars.json'), "{}", (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error creating .datapack/bossbars.json");
            }
        });
    });
}
exports.initialize = initialize;
function walker(p, extension, ignore_files = false) {
    return __awaiter(this, void 0, void 0, function* () {
        let names = (yield util_1.readdirAsync(p)).map(v => path.join(p, v));
        let fit = [];
        let dir = [];
        let stats = yield Promise.all(names.map(v => util_1.statAsync(v)));
        for (let i = 0; i < names.length; i++) {
            if (!ignore_files && stats[i].isFile() && names[i].endsWith(extension)) {
                fit.push(names[i]);
            }
            else if (stats[i].isDirectory()) {
                dir.push(walker(names[i], extension));
            }
        }
        for (let a of yield Promise.all(dir)) {
            for (let b of a) {
                fit.push(b);
            }
        }
        return fit;
    });
}
let resources = {
    advancements: {},
    functions: {},
    objectives: [],
    tags: [],
    sounds: {},
    teams: [],
    functionTags: {},
    blockTags: {},
    itemTags: {},
    bossbars: {}
};
function readFunctions() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length !== 1) {
            //Cannot handle multi-root folder right now, quit
            return;
        }
        resources.functions = {};
        resources.teams = [];
        resources.bossbars = {};
        let root = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'data');
        try {
            yield util_1.accessAsync(root);
        }
        catch (err) {
            //No such path, or can't access
            return;
        }
        let paths = (yield vscode.workspace.findFiles("data/*/functions/**/*.mcfunction")).map(v => v.fsPath);
        let v = yield Promise.all(paths.map(v => util_1.readFileAsync(v)));
        for (let i = 0; i < v.length; i++) {
            let file = v[i];
            let name = util_1.pathToName(root, paths[i]);
            let nodes = name.split(":");
            if (nodes[1].length === 0) {
                continue;
            }
            nodes.push(...nodes.pop().split("/"));
            let skip = false;
            for (let n of nodes) {
                if (!NAME_PATTERN.exec(n)) {
                    skip = true;
                    break;
                }
            }
            if (skip)
                continue;
            let temp = resources.functions;
            for (let i = 0; i < nodes.length - 1; i++) {
                if (!temp[nodes[i]])
                    temp[nodes[i]] = {};
                temp = temp[nodes[i]];
            }
            if (!temp["$func"])
                temp["$func"] = [];
            temp["$func"].push(nodes[nodes.length - 1].substring(0, nodes[nodes.length - 1].length - 11));
            for (let line of file.split(LINE_DELIMITER)) {
                let m = OBJ_PATTERN.exec(line);
                if (m) {
                    if (!resources.objectives.find(v => v[0] === m[1])) {
                        resources.objectives.push([m[1], m[2], name]);
                    }
                }
                m = TEAM_PATTERN.exec(line);
                if (m) {
                    if (!resources.teams.find(v => v[0] === m[1])) {
                        resources.teams.push([m[1], name]);
                    }
                }
                m = BOSSBAR_PATTERN.exec(line);
                if (m) {
                    let temp = resources.bossbars;
                    if (m[1].indexOf(':') === -1) {
                        if (!temp["minecraft"]) {
                            temp["minecraft"] = [];
                        }
                        if (!temp["minecraft"].find(v => v[0] === m[1])) {
                            temp["minecraft"].push([m[1], name]);
                        }
                    }
                    else {
                        let res = m[1].split(":");
                        if (res.length === 2) {
                            if (!temp[res[0]]) {
                                temp[res[0]] = [];
                            }
                            if (!temp[res[0]].find(v => v[0] === res[1])) {
                                temp[res[0]].push([res[1], name]);
                            }
                        }
                    }
                }
            }
        }
        fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'objectives.json'), JSON.stringify(resources.objectives), (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error writing .datapack/objectives.json");
            }
        });
        fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'functions.json'), JSON.stringify(resources.functions), (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error writing .datapack/functions.json");
            }
        });
        fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'teams.json'), JSON.stringify(resources.teams), (err) => {
            if (err) {
                vscode.window.showErrorMessage("Error writing .datapack/teams.json");
            }
        });
        fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'bossbars.json'), JSON.stringify(resources.bossbars), err => {
            if (err) {
                vscode.window.showErrorMessage("Error writing .datapack/bossbars.json");
            }
        });
    });
}
exports.readFunctions = readFunctions;
function readAdvancements() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length !== 1) {
            //Cannot handle multi-root folder right now, quit
            return;
        }
        let root = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'data');
        try {
            yield util_1.accessAsync(root);
        }
        catch (err) {
            //No such path, or can't access
            return;
        }
        resources.advancements = {};
        let paths = (yield vscode.workspace.findFiles("data/*/advancements/**/*.json")).map(v => v.fsPath);
        let v = yield Promise.all(paths.map(v => util_1.readFileAsync(v)));
        for (let i = 0; i < v.length; i++) {
            let file = v[i];
            let name = util_1.pathToName(root, paths[i]);
            let nodes = name.split(":");
            if (nodes[1].length === 0) {
                continue;
            }
            nodes.push(...nodes.pop().split("/"));
            let skip = false;
            for (let n of nodes) {
                if (!NAME_PATTERN.exec(n)) {
                    skip = true;
                    break;
                }
            }
            if (skip)
                continue;
            let temp = resources.advancements;
            for (let i = 0; i < nodes.length - 1; i++) {
                if (!temp[nodes[i]])
                    temp[nodes[i]] = {};
                temp = temp[nodes[i]];
            }
            if (!temp["$adv"])
                temp["$adv"] = {};
            let criteria = temp["$adv"][nodes[nodes.length - 1].substring(0, nodes[nodes.length - 1].length - 5)] = [];
            try {
                let adv = JSON.parse(file);
                if (adv["criteria"] && util_2.isObject(adv["criteria"])) {
                    criteria.push(...Object.keys(adv.criteria));
                }
            }
            catch (e) {
                //No processing is needed
            }
            fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'advancements.json'), JSON.stringify(resources.advancements), (err) => {
                if (err) {
                    vscode.window.showErrorMessage("Error writing .datapack/advancements.json");
                }
            });
        }
    });
}
exports.readAdvancements = readAdvancements;
function readTags(t) {
    return __awaiter(this, void 0, void 0, function* () {
        let base;
        switch (t) {
            case 'functions':
                resources.functionTags = {};
                base = resources.functionTags;
                break;
            case 'items':
                resources.itemTags = {};
                base = resources.itemTags;
                break;
            case 'blocks':
                resources.blockTags = {};
                base = resources.blockTags;
                break;
            default:
                throw new Error("WTf is type " + t);
        }
        let root = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'data');
        let paths = (yield vscode.workspace.findFiles(`data/*/tags/${t}/**/*.json`)).map(v => v.fsPath);
        for (let p of paths) {
            let name = util_1.pathToName(root, p);
            let nodes = name.split(":");
            nodes.push(...nodes.pop().split("/"));
            nodes.splice(1, 1);
            if (nodes.length <= 1) {
                continue;
            }
            let skip = false;
            for (let n of nodes) {
                if (!NAME_PATTERN.exec(n)) {
                    skip = true;
                    break;
                }
            }
            if (skip)
                continue;
            let temp = base;
            for (let i = 0; i < nodes.length - 1; i++) {
                if (!temp[nodes[i]])
                    temp[nodes[i]] = {};
                temp = temp[nodes[i]];
            }
            if (!temp["$tags"])
                temp["$tags"] = [];
            temp["$tags"].push(nodes[nodes.length - 1].substring(0, nodes[nodes.length - 1].length - 5));
        }
        fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', `${t}Tag.json`), JSON.stringify(base), (err) => {
            if (err) {
                vscode.window.showErrorMessage(`Error writing .datapack/${t}Tag.json`);
            }
        });
    });
}
exports.readTags = readTags;
function loadFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        function loadJson(path) {
            return __awaiter(this, void 0, void 0, function* () {
                let v = yield util_1.readFileAsync(path);
                return JSON.parse(v);
            });
        }
        let root = vscode.workspace.workspaceFolders[0].uri;
        try {
            let raw = yield loadJson(path.join(root.fsPath, '.datapack', 'entity_tags.json'));
            if (!util_2.isArray(raw) || raw.find(v => !util_2.isString(v))) {
                vscode.window.showErrorMessage("Invalid format: .datapack/entity_tags.json. Should be array with strings");
            }
            else {
                resources.tags = raw;
            }
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'entity_tags.json'), "[]", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/entity_tags.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/entity_tags.json");
        }
        try {
            let raw = yield loadJson(path.join(root.fsPath, '.datapack', 'advancements.json'));
            resources.advancements = raw;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'advancements.json'), "{}", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/advancements.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/advancements.json");
        }
        try {
            let raw = yield loadJson(path.join(root.fsPath, '.datapack', 'functions.json'));
            resources.functions = raw;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'functions.json'), "{}", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/functions.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/functions.json");
        }
        try {
            let raw = yield loadJson(path.join(root.fsPath, '.datapack', 'objectives.json'));
            resources.objectives = raw;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'objectives.json'), "{}", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/objectives.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/objectives.json");
        }
        try {
            let raw = yield loadJson(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'teams.json'));
            if (raw.length > 0 && !Array.isArray(raw[0])) {
                vscode.window.showErrorMessage("The format of teams.json is updated. Please use datapack.reload to update the refereces.");
                raw = [];
            }
            resources.teams = raw;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'teams.json'), "[]", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/teams.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/teams.json");
        }
        try {
            let raw = yield loadJson(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'functionsTag.json'));
            resources.functionTags = raw;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'functionsTag.json'), "{}", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/functionsTag.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/functionsTag.json");
        }
        try {
            let raw = yield loadJson(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'itemsTag.json'));
            resources.itemTags = raw;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'itemsTag.json'), "{}", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/itemsTag.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/itemsTag.json");
        }
        try {
            let raw = yield loadJson(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'blocksTag.json'));
            resources.blockTags = raw;
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'blocksTag.json'), "{}", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/blocksTag.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/blocksTag.json");
        }
        try {
            let raw = yield loadJson(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'bossbars.json'));
            resources.bossbars = raw;
        }
        catch (e) {
            if (e.code == 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'bossbars.json'), "{}", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/bossbars.json");
                    }
                });
            }
            vscode.window.showErrorMessage("Error loading .datapack/bossbars.json");
        }
        try {
            let raw = yield loadJson(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'sounds.json'));
            for (let n of Object.keys(raw)) {
                let parts = n.split(".");
                let temp = resources.sounds;
                for (let k of parts) {
                    if (!temp[k]) {
                        temp[k] = {};
                    }
                    temp = temp[k];
                }
            }
        }
        catch (e) {
            if (e.code === 'ENOENT') {
                fs.writeFile(path.join(root.fsPath, '.datapack', 'sounds.json'), "{}", (err) => {
                    if (err) {
                        vscode.window.showErrorMessage("Error creating .datapack/sounds.json");
                    }
                });
                return;
            }
            vscode.window.showErrorMessage("Error loading .datapack/sounds.json");
        }
    });
}
exports.loadFiles = loadFiles;
function getResources(key) {
    return resources[key];
}
exports.getResources = getResources;
function reloadAdvancement(p) {
    return __awaiter(this, void 0, void 0, function* () {
        let v = yield util_1.readFileAsync(p);
        let root = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'data');
        let name = util_1.pathToName(root, p);
        let nodes = name.split(":");
        if (nodes[1].length === 0) {
            return;
        }
        nodes.push(...nodes.pop().split("/"));
        for (let n of nodes) {
            if (!NAME_PATTERN.exec(n)) {
                return;
            }
        }
        let temp = resources.advancements;
        for (let i = 0; i < nodes.length - 1; i++) {
            if (!temp[nodes[i]])
                temp[nodes[i]] = {};
            temp = temp[nodes[i]];
        }
        if (!temp["$adv"])
            temp["$adv"] = {};
        let criteria = temp["$adv"][nodes[nodes.length - 1].substring(0, nodes[nodes.length - 1].length - 5)] = [];
        try {
            let adv = JSON.parse(v);
            if (adv["criteria"] && util_2.isObject(adv["criteria"])) {
                criteria.push(...Object.keys(adv.criteria));
            }
        }
        catch (e) {
            //No processing is needed
        }
        timers_1.setImmediate(() => {
            fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'advancements.json'), JSON.stringify(resources.advancements), (err) => {
                if (err) {
                    vscode.window.showErrorMessage("Error writing .datapack/advancements.json");
                }
            });
        });
    });
}
exports.reloadAdvancement = reloadAdvancement;
function reloadFunction(p) {
    return __awaiter(this, void 0, void 0, function* () {
        let root = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'data');
        let name = util_1.pathToName(root, p);
        let file = yield util_1.readFileAsync(p);
        let nodes = name.split(":");
        if (nodes[1].length === 0) {
            return;
        }
        nodes.push(...nodes.pop().split("/"));
        for (let n of nodes) {
            if (!NAME_PATTERN.exec(n)) {
                return;
            }
        }
        let temp = resources.functions;
        for (let i = 0; i < nodes.length - 1; i++) {
            if (!temp[nodes[i]])
                temp[nodes[i]] = {};
            temp = temp[nodes[i]];
        }
        if (!temp["$func"])
            temp["$func"] = [];
        if (temp["$func"].indexOf(nodes[nodes.length - 1].substring(0, nodes[nodes.length - 1].length - 11)) === -1)
            temp["$func"].push(nodes[nodes.length - 1].substring(0, nodes[nodes.length - 1].length - 11));
        //delete objectives
        resources.objectives = resources.objectives.filter(v => v[2] !== name);
        //Reset
        for (let key of Object.keys(resources.bossbars)) {
            resources.bossbars[key] = resources.bossbars[key].filter(v => v[1] !== name);
        }
        resources.teams = resources.teams.filter(v => v[1] !== name);
        for (let line of file.split(LINE_DELIMITER)) {
            let m = OBJ_PATTERN.exec(line);
            if (m) {
                if (!resources.objectives.find(v => v[0] === m[1])) {
                    resources.objectives.push([m[1], m[2], name]);
                }
            }
            m = TEAM_PATTERN.exec(line);
            if (m) {
                if (!resources.teams.find(v => v === m[1])) {
                    resources.teams.push([m[1], name]);
                }
            }
            m = BOSSBAR_PATTERN.exec(line);
            if (m) {
                let temp = resources.bossbars;
                if (m[1].indexOf(':') === -1) {
                    if (!temp["minecraft"]) {
                        temp["minecraft"] = [];
                    }
                    if (!temp["minecraft"].find(v => v[0] === m[1])) {
                        temp["minecraft"].push([m[1], name]);
                    }
                }
                else {
                    let res = m[1].split(":");
                    if (res.length === 2) {
                        if (!temp[res[0]]) {
                            temp[res[0]] = [];
                        }
                        if (!temp[res[0]].find(v => v[0] === res[1])) {
                            temp[res[0]].push([res[1], name]);
                        }
                    }
                }
            }
        }
        timers_1.setImmediate(() => {
            fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'objectives.json'), JSON.stringify(resources.objectives), (err) => {
                if (err) {
                    vscode.window.showErrorMessage("Error writing .datapack/objectives.json");
                }
            });
            fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'functions.json'), JSON.stringify(resources.functions), (err) => {
                if (err) {
                    vscode.window.showErrorMessage("Error writing .datapack/functions.json");
                }
            });
            fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'teams.json'), JSON.stringify(resources.teams), (err) => {
                if (err) {
                    vscode.window.showErrorMessage("Error writing .datapack/teams.json");
                }
            });
            fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', 'bossbars.json'), JSON.stringify(resources.bossbars), (err) => {
                if (err) {
                    vscode.window.showErrorMessage("Error writing .datapack/bossbars.json");
                }
            });
        });
    });
}
exports.reloadFunction = reloadFunction;
function reloadTags(p) {
    return __awaiter(this, void 0, void 0, function* () {
        let root = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'data');
        let name = util_1.pathToName(root, p);
        let nodes = name.split(":");
        nodes.push(...nodes.pop().split("/"));
        let [t] = nodes.splice(1, 1);
        if (nodes.length <= 1)
            return;
        let base;
        switch (t) {
            case 'functions':
                base = resources.functionTags;
                break;
            case 'items':
                base = resources.itemTags;
                break;
            case 'blocks':
                base = resources.blockTags;
                break;
            default:
                throw new Error("Wrong tag type " + t);
        }
        for (let n of nodes) {
            if (!NAME_PATTERN.exec(n)) {
                return;
            }
        }
        let temp = base;
        for (let i = 0; i < nodes.length - 1; i++) {
            if (!temp[nodes[i]])
                temp[nodes[i]] = {};
            temp = temp[nodes[i]];
        }
        if (!temp["$tags"])
            temp["$tags"] = [];
        if (temp["$tags"].indexOf(nodes[nodes.length - 1].substring(0, nodes[nodes.length - 1].length - 5)) === -1)
            temp["$tags"].push(nodes[nodes.length - 1].substring(0, nodes[nodes.length - 1].length - 5));
        timers_1.setImmediate(() => {
            fs.writeFile(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.datapack', `${t}Tag.json`), JSON.stringify(base), (err) => {
                if (err) {
                    vscode.window.showErrorMessage(`Error writing .datapack/${t}Tag.json`);
                }
            });
        });
    });
}
exports.reloadTags = reloadTags;
//Read resources.json
//blocking, as it is the initialization
let data = JSON.parse(fs.readFileSync(path.join(__dirname + "./../ref/resources.json"), "utf-8"));
for (let key of Object.keys(data)) {
    resources[key] = data[key];
}
//# sourceMappingURL=resources.js.map