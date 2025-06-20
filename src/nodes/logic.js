import { LiteGraph, LGraphNode } from "../litegraph.js";

class Selector extends LGraphNode {
    constructor() {
        super();

        this.addInput("sel", "number");
        this.addInput("A");
        this.addInput("B");
        this.addInput("C");
        this.addInput("D");
        this.addOutput("out");

        this.selected = 0;
        this.title = "Selector";
        this.desc = "selects an output";
    }

    onDrawBackground(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AFB";
        var y = (this.selected + 1) * LiteGraph.NODE_SLOT_HEIGHT + 6;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(50, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(34, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
    }

    onExecute() {
        var sel = this.getInputData(0);
        if (sel == null || sel.constructor !== Number) sel = 0;
        this.selected = sel = Math.round(sel) % (this.inputs.length - 1);
        var v = this.getInputData(sel + 1);
        if (v !== undefined) {
            this.setOutputData(0, v);
        }
    }

    onGetInputs() {
        return [
            ["E", 0],
            ["F", 0],
            ["G", 0],
            ["H", 0],
        ];
    }
}

class Sequence extends LGraphNode {
    constructor() {
        super();

        this.properties = {
            sequence: "A,B,C",
        };
        this.addInput("index", "number");
        this.addInput("seq");
        this.addOutput("out");

        this.index = 0;
        this.values = this.properties.sequence.split(",");

        this.title = "Sequence";
        this.desc = "select one element from a sequence from a string";
    }

    onPropertyChanged(name, value) {
        if (name == "sequence") {
            this.values = value.split(",");
        }
    }

    onExecute() {
        var seq = this.getInputData(1);
        if (seq && seq != this.current_sequence) {
            this.values = seq.split(",");
            this.current_sequence = seq;
        }
        var index = this.getInputData(0);
        if (index == null) {
            index = 0;
        }
        this.index = index = Math.round(index) % this.values.length;

        this.setOutputData(0, this.values[index]);
    }
}

class LogicAnd extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
        this.title = "AND";
        this.desc = "Return true if all inputs are true";
    }

    onExecute() {
        var ret = true;
        for (var inX in this.inputs) {
            if (!this.getInputData(inX)) {
                var ret = false;
                break;
            }
        }
        this.setOutputData(0, ret);
    }
    onGetInputs() {
        return [["and", "boolean"]];
    }
}

class LogicOr extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");

        this.title = "OR";
        this.desc = "Return true if at least one input is true";
    }

    onExecute() {
        var ret = false;
        for (var inX in this.inputs) {
            if (this.getInputData(inX)) {
                ret = true;
                break;
            }
        }
        this.setOutputData(0, ret);
    }
    onGetInputs() {
        return [["or", "boolean"]];
    }
}

class LogicNot extends LGraphNode {
    constructor() {
        super();

        this.properties = {};
        this.addInput("in", "boolean");
        this.addOutput("out", "boolean");

        this.title = "NOT";
        this.desc = "Return the logical negation";
    }

    onExecute() {
        var ret = !this.getInputData(0);
        this.setOutputData(0, ret);
    }
}

class LogicCompare extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");

        this.title = "bool == bool";
        this.desc = "Compare for logical equality";
    }

    onExecute() {
        var last = null;
        var ret = true;
        for (var inX in this.inputs) {
            if (last === null) last = this.getInputData(inX);
            else if (last != this.getInputData(inX)) {
                ret = false;
                break;
            }
        }
        this.setOutputData(0, ret);
    }
    onGetInputs() {
        return [["bool", "boolean"]];
    }
}

class LogicBranch extends LGraphNode {
    constructor() {
        super();
        this.properties = {};
        this.addInput("onTrigger", LiteGraph.ACTION);
        this.addInput("condition", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.mode = LiteGraph.ON_TRIGGER;

        this.title = "Branch";
        this.desc = "Branch execution on condition";
    }

    onExecute(param, options) {
        var condtition = this.getInputData(1);
        if (condtition) {
            this.triggerSlot(0);
        } else {
            this.triggerSlot(1);
        }
    }
}

LiteGraph.registerNodeType("logic/CompareBool", LogicCompare);
LiteGraph.registerNodeType("logic/NOT", LogicNot);
LiteGraph.registerNodeType("logic/OR", LogicOr);
LiteGraph.registerNodeType("logic/AND", LogicAnd);
LiteGraph.registerNodeType("logic/sequence", Sequence);
LiteGraph.registerNodeType("logic/selector", Selector);
LiteGraph.registerNodeType("logic/IF", LogicBranch);
