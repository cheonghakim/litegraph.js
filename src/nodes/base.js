import { LiteGraph, LGraphNode, LGraph } from "@/litegraph.js";

class Time extends LGraphNode {
    constructor() {
        super();

        this.addOutput("in ms", "number");
        this.addOutput("in sec", "number");

        this.title = "Time";
        this.desc = "Time";
    }

    onExecute() {
        this.setOutputData(0, this.graph.globaltime * 1000);
        this.setOutputData(1, this.graph.globaltime);
    }
}

class Subgraph extends LGraphNode {
    constructor() {
        super();

        var that = this;
        this.size = [140, 80];
        this.properties = { enabled: true };
        this.enabled = true;

        //create inner graph
        this.subgraph = new LGraph();
        this.subgraph._subgraph_node = this;
        this.subgraph._is_subgraph = true;

        this.subgraph.onTrigger = this.onSubgraphTrigger.bind(this);

        //nodes input node added inside
        this.subgraph.onInputAdded = this.onSubgraphNewInput.bind(this);
        this.subgraph.onInputRenamed = this.onSubgraphRenamedInput.bind(this);
        this.subgraph.onInputTypeChanged =
            this.onSubgraphTypeChangeInput.bind(this);
        this.subgraph.onInputRemoved = this.onSubgraphRemovedInput.bind(this);

        this.subgraph.onOutputAdded = this.onSubgraphNewOutput.bind(this);
        this.subgraph.onOutputRenamed = this.onSubgraphRenamedOutput.bind(this);
        this.subgraph.onOutputTypeChanged =
            this.onSubgraphTypeChangeOutput.bind(this);
        this.subgraph.onOutputRemoved = this.onSubgraphRemovedOutput.bind(this);

        this.title = "Subgraph";
        this.desc = "Graph inside a node";
        this.title_color = "#334";
    }

    reassignGraphUUIDs(graph) {
        const idMap = { nodeIDs: {}, linkIDs: {} };

        for (const node of graph.nodes) {
            const oldID = node.id;
            const newID = LiteGraph.uuidv4();
            node.id = newID;

            idMap.nodeIDs[oldID] = newID;
        }

        for (const link of graph.links) {
            const oldID = link[0];
            const newID = LiteGraph.uuidv4();
            link[0] = newID;

            idMap.linkIDs[oldID] = newID;

            // update node references
            link[1] = idMap.nodeIDs[link[1]] ?? link[1];
            link[3] = idMap.nodeIDs[link[3]] ?? link[3];
        }

        for (const node of graph.nodes) {
            if (node.inputs) {
                for (const input of node.inputs) {
                    if (input.link) {
                        input.link = idMap.linkIDs[input.link];
                    }
                }
            }
            if (node.outputs) {
                for (const output of node.outputs) {
                    if (output.links) {
                        output.links = output.links.map(
                            (l) => idMap.linkIDs[l]
                        );
                    }
                }
            }

            // recursive for nested subgraphs
            if (node.type === "graph/subgraph" && node.subgraph) {
                const nested = this.reassignGraphUUIDs(node.subgraph);
                Object.assign(idMap.nodeIDs, nested.nodeIDs);
                Object.assign(idMap.linkIDs, nested.linkIDs);
            }
        }

        return idMap;
    }

    onGetInputs() {
        return [["enabled", "boolean"]];
    }

    /*
    onDrawTitle (ctx) {
        if (this.flags.collapsed) {
            return;
        }

        ctx.fillStyle = "#555";
        var w = LiteGraph.NODE_TITLE_HEIGHT;
        var x = this.size[0] - w;
        ctx.fillRect(x, -w, w, w);
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, -w * 0.6);
        ctx.lineTo(x + w * 0.8, -w * 0.6);
        ctx.lineTo(x + w * 0.5, -w * 0.3);
        ctx.fill();
    };
	*/

    onDblClick(e, pos, graphcanvas) {
        var that = this;
        setTimeout(function () {
            graphcanvas.openSubgraph(that.subgraph);
        }, 10);
    }

    /*
    onMouseDown (e, pos, graphcanvas) {
        if (
            !this.flags.collapsed &&
            pos[0] > this.size[0] - LiteGraph.NODE_TITLE_HEIGHT &&
            pos[1] < 0
        ) {
            var that = this;
            setTimeout(function() {
                graphcanvas.openSubgraph(that.subgraph);
            }, 10);
        }
    };
	*/

    onAction(action, param) {
        this.subgraph.onAction(action, param);
    }

    onExecute() {
        this.enabled = this.getInputOrProperty("enabled");
        if (!this.enabled) {
            return;
        }

        //send inputs to subgraph global inputs
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var value = this.getInputData(i);
                this.subgraph.setInputData(input.name, value);
            }
        }

        //execute
        this.subgraph.runStep();

        //send subgraph global outputs to outputs
        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                var value = this.subgraph.getOutputData(output.name);
                this.setOutputData(i, value);
            }
        }
    }

    sendEventToAllNodes(eventname, param, mode) {
        if (this.enabled) {
            this.subgraph.sendEventToAllNodes(eventname, param, mode);
        }
    }

    onDrawBackground(ctx, graphcanvas, canvas, pos) {
        if (this.flags.collapsed) return;
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
        // button
        var over = LiteGraph.isInsideRectangle(
            pos[0],
            pos[1],
            this.pos[0],
            this.pos[1] + y,
            this.size[0],
            LiteGraph.NODE_TITLE_HEIGHT
        );
        let overleft = LiteGraph.isInsideRectangle(
            pos[0],
            pos[1],
            this.pos[0],
            this.pos[1] + y,
            this.size[0] / 2,
            LiteGraph.NODE_TITLE_HEIGHT
        );
        ctx.fillStyle = over ? "#555" : "#222";
        ctx.beginPath();
        if (this._shape == LiteGraph.BOX_SHAPE) {
            if (overleft) {
                ctx.rect(
                    0,
                    y,
                    this.size[0] / 2 + 1,
                    LiteGraph.NODE_TITLE_HEIGHT
                );
            } else {
                ctx.rect(
                    this.size[0] / 2,
                    y,
                    this.size[0] / 2 + 1,
                    LiteGraph.NODE_TITLE_HEIGHT
                );
            }
        } else {
            if (overleft) {
                ctx.roundRect(
                    0,
                    y,
                    this.size[0] / 2 + 1,
                    LiteGraph.NODE_TITLE_HEIGHT,
                    [0, 0, 8, 8]
                );
            } else {
                ctx.roundRect(
                    this.size[0] / 2,
                    y,
                    this.size[0] / 2 + 1,
                    LiteGraph.NODE_TITLE_HEIGHT,
                    [0, 0, 8, 8]
                );
            }
        }
        if (over) {
            ctx.fill();
        } else {
            ctx.fillRect(0, y, this.size[0] + 1, LiteGraph.NODE_TITLE_HEIGHT);
        }
        // button
        ctx.textAlign = "center";
        ctx.font = "24px Arial";
        ctx.fillStyle = over ? "#DDD" : "#999";
        ctx.fillText("+", this.size[0] * 0.25, y + 24);
        ctx.fillText("+", this.size[0] * 0.75, y + 24);
    }

    // onMouseDown (e, localpos, graphcanvas)
    // {
    // 	var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
    // 	if(localpos[1] > y)
    // 	{
    // 		graphcanvas.showSubgraphPropertiesDialog(this);
    // 	}
    // }
    onMouseDown(e, localpos, graphcanvas) {
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
        console.log(0);
        if (localpos[1] > y) {
            if (localpos[0] < this.size[0] / 2) {
                console.log(1);
                graphcanvas.showSubgraphPropertiesDialog(this);
            } else {
                console.log(2);
                graphcanvas.showSubgraphPropertiesDialogRight(this);
            }
        }
    }
    computeSize() {
        var num_inputs = this.inputs ? this.inputs.length : 0;
        var num_outputs = this.outputs ? this.outputs.length : 0;
        return [
            200,
            Math.max(num_inputs, num_outputs) * LiteGraph.NODE_SLOT_HEIGHT +
                LiteGraph.NODE_TITLE_HEIGHT,
        ];
    }

    //**** INPUTS ***********************************
    onSubgraphTrigger(event, param) {
        var slot = this.findOutputSlot(event);
        if (slot != -1) {
            this.triggerSlot(slot);
        }
    }

    onSubgraphNewInput(name, type) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            //add input to the node
            this.addInput(name, type);
        }
    }

    onSubgraphRenamedInput(oldname, name) {
        var slot = this.findInputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.name = name;
    }

    onSubgraphTypeChangeInput(name, type) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.type = type;
    }

    onSubgraphRemovedInput(name) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeInput(slot);
    }

    //**** OUTPUTS ***********************************
    onSubgraphNewOutput(name, type) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            this.addOutput(name, type);
        }
    }

    onSubgraphRenamedOutput(oldname, name) {
        var slot = this.findOutputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.name = name;
    }

    onSubgraphTypeChangeOutput(name, type) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.type = type;
    }

    onSubgraphRemovedOutput(name) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeOutput(slot);
    }
    // *****************************************************

    getExtraMenuOptions(graphcanvas) {
        var that = this;
        return [
            {
                content: "Open",
                callback: function () {
                    graphcanvas.openSubgraph(that.subgraph);
                },
            },
        ];
    }

    onResize(size) {
        size[1] += 20;
    }

    serialize() {
        var data = LGraphNode.prototype.serialize.call(this);
        data.subgraph = this.subgraph.serialize();
        return data;
    }
    //no need to define node.configure, the default method detects node.subgraph and passes the object to node.subgraph.configure()

    reassignSubgraphUUIDs(graph) {
        const idMap = { nodeIDs: {}, linkIDs: {} };

        for (const node of graph.nodes) {
            const oldID = node.id;
            const newID = LiteGraph.uuidv4();
            node.id = newID;

            if (idMap.nodeIDs[oldID] || idMap.nodeIDs[newID]) {
                throw new Error(
                    `New/old node UUID wasn't unique in changed map! ${oldID} ${newID}`
                );
            }

            idMap.nodeIDs[oldID] = newID;
            idMap.nodeIDs[newID] = oldID;
        }

        for (const link of graph.links) {
            const oldID = link[0];
            const newID = LiteGraph.uuidv4();
            link[0] = newID;

            if (idMap.linkIDs[oldID] || idMap.linkIDs[newID]) {
                throw new Error(
                    `New/old link UUID wasn't unique in changed map! ${oldID} ${newID}`
                );
            }

            idMap.linkIDs[oldID] = newID;
            idMap.linkIDs[newID] = oldID;

            const nodeFrom = link[1];
            const nodeTo = link[3];

            if (!idMap.nodeIDs[nodeFrom]) {
                throw new Error(
                    `Old node UUID not found in mapping! ${nodeFrom}`
                );
            }

            link[1] = idMap.nodeIDs[nodeFrom];

            if (!idMap.nodeIDs[nodeTo]) {
                throw new Error(
                    `Old node UUID not found in mapping! ${nodeTo}`
                );
            }

            link[3] = idMap.nodeIDs[nodeTo];
        }

        // Reconnect links
        for (const node of graph.nodes) {
            if (node.inputs) {
                for (const input of node.inputs) {
                    if (input.link) {
                        input.link = idMap.linkIDs[input.link];
                    }
                }
            }
            if (node.outputs) {
                for (const output of node.outputs) {
                    if (output.links) {
                        output.links = output.links.map(
                            (l) => idMap.linkIDs[l]
                        );
                    }
                }
            }
        }

        // Recurse!
        for (const node of graph.nodes) {
            if (node.type === "graph/subgraph") {
                const merge = this.reassignGraphUUIDs(node.subgraph);
                idMap.nodeIDs.assign(merge.nodeIDs);
                idMap.linkIDs.assign(merge.linkIDs);
            }
        }
    }

    clone() {
        var node = LiteGraph.createNode(this.type);
        var data = this.serialize();

        if (LiteGraph.use_uuids) {
            // LGraph.serialize() seems to reuse objects in the original graph. But we
            // need to change node IDs here, so clone it first.
            const subgraph = LiteGraph.cloneObject(data.subgraph);

            this.reassignSubgraphUUIDs(subgraph);

            data.subgraph = subgraph;
        }

        delete data["id"];
        delete data["inputs"];
        delete data["outputs"];
        node.configure(data);
        return node;
    }

    buildFromNodes(nodes) {
        //clear all?
        //TODO

        //nodes that connect data between parent graph and subgraph
        var subgraph_inputs = [];
        var subgraph_outputs = [];

        //mark inner nodes
        var ids = {};
        var min_x = 0;
        var max_x = 0;
        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            ids[node.id] = node;
            min_x = Math.min(node.pos[0], min_x);
            max_x = Math.max(node.pos[0], min_x);
        }

        var last_input_y = 0;
        var last_output_y = 0;

        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            //check inputs
            if (node.inputs)
                for (var j = 0; j < node.inputs.length; ++j) {
                    var input = node.inputs[j];
                    if (!input || !input.link) continue;
                    var link = node.graph.links[input.link];
                    if (!link) continue;
                    if (ids[link.origin_id]) continue;
                    //this.addInput(input.name,link.type);
                    this.subgraph.addInput(input.name, link.type);
                    /*
					var input_node = LiteGraph.createNode("graph/input");
					this.subgraph.add( input_node );
					input_node.pos = [min_x - 200, last_input_y ];
					last_input_y += 100;
					*/
                }

            //check outputs
            if (node.outputs)
                for (var j = 0; j < node.outputs.length; ++j) {
                    var output = node.outputs[j];
                    if (!output || !output.links || !output.links.length)
                        continue;
                    var is_external = false;
                    for (var k = 0; k < output.links.length; ++k) {
                        var link = node.graph.links[output.links[k]];
                        if (!link) continue;
                        if (ids[link.target_id]) continue;
                        is_external = true;
                        break;
                    }
                    if (!is_external) continue;
                    //this.addOutput(output.name,output.type);
                    /*
					var output_node = LiteGraph.createNode("graph/output");
					this.subgraph.add( output_node );
					output_node.pos = [max_x + 50, last_output_y ];
					last_output_y += 100;
					*/
                }
        }

        //detect inputs and outputs
        //split every connection in two data_connection nodes
        //keep track of internal connections
        //connect external connections

        //clone nodes inside subgraph and try to reconnect them

        //connect edge subgraph nodes to extarnal connections nodes
    }
}

class GraphInput extends LGraphNode {
    constructor() {
        super();

        this.title = "Input";
        this.desc = "Input of the graph";

        this.addOutput("", "number");

        this.name_in_graph = "";
        this.properties = {
            name: "",
            type: "number",
            value: 0,
        };

        var that = this;

        this.name_widget = this.addWidget(
            "text",
            "Name",
            this.properties.name,
            function (v) {
                if (!v) {
                    return;
                }
                that.setProperty("name", v);
            }
        );
        this.type_widget = this.addWidget(
            "text",
            "Type",
            this.properties.type,
            function (v) {
                that.setProperty("type", v);
            }
        );

        this.value_widget = this.addWidget(
            "number",
            "Value",
            this.properties.value,
            function (v) {
                that.setProperty("value", v);
            }
        );

        this.widgets_up = true;
        this.size = [180, 90];
    }

    onConfigure() {
        this.updateType();
    }

    //ensures the type in the node output and the type in the associated graph input are the same
    updateType() {
        var type = this.properties.type;
        this.type_widget.value = type;

        //update output
        if (this.outputs[0].type != type) {
            if (!LiteGraph.isValidConnection(this.outputs[0].type, type))
                this.disconnectOutput(0);
            this.outputs[0].type = type;
        }

        //update widget
        if (type == "number") {
            this.value_widget.type = "number";
            this.value_widget.value = 0;
        } else if (type == "boolean") {
            this.value_widget.type = "toggle";
            this.value_widget.value = true;
        } else if (type == "string") {
            this.value_widget.type = "text";
            this.value_widget.value = "";
        } else {
            this.value_widget.type = null;
            this.value_widget.value = null;
        }
        this.properties.value = this.value_widget.value;

        //update graph
        if (this.graph && this.name_in_graph) {
            this.graph.changeInputType(this.name_in_graph, type);
        }
    }

    //this is executed AFTER the property has changed
    onPropertyChanged(name, v) {
        if (name == "name") {
            if (v == "" || v == this.name_in_graph || v == "enabled") {
                return false;
            }
            if (this.graph) {
                if (this.name_in_graph) {
                    //already added
                    this.graph.renameInput(this.name_in_graph, v);
                } else {
                    this.graph.addInput(v, this.properties.type);
                }
            } //what if not?!
            this.name_widget.value = v;
            this.name_in_graph = v;
        } else if (name == "type") {
            this.updateType();
        } else if (name == "value") {
        }
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.properties.name;
        }
        return this.title;
    }

    onAction(action, param) {
        if (this.properties.type == LiteGraph.EVENT) {
            this.triggerSlot(0, param);
        }
    }

    onExecute() {
        var name = this.properties.name;
        //read from global input
        var data = this.graph.inputs[name];
        if (!data) {
            this.setOutputData(0, this.properties.value);
            return;
        }

        this.setOutputData(
            0,
            data.value !== undefined ? data.value : this.properties.value
        );
    }

    onRemoved() {
        if (this.name_in_graph) {
            this.graph.removeInput(this.name_in_graph);
        }
    }
}

class GraphOutput extends LGraphNode {
    constructor() {
        super();

        this.title = "Output";
        this.desc = "Output of the graph";

        this.addInput("", "");

        this.name_in_graph = "";
        this.properties = { name: "", type: "" };
        var that = this;

        // Object.defineProperty(this.properties, "name", {
        //     get: function() {
        //         return that.name_in_graph;
        //     },
        //     set: function(v) {
        //         if (v == "" || v == that.name_in_graph) {
        //             return;
        //         }
        //         if (that.name_in_graph) {
        //             //already added
        //             that.graph.renameOutput(that.name_in_graph, v);
        //         } else {
        //             that.graph.addOutput(v, that.properties.type);
        //         }
        //         that.name_widget.value = v;
        //         that.name_in_graph = v;
        //     },
        //     enumerable: true
        // });

        // Object.defineProperty(this.properties, "type", {
        //     get: function() {
        //         return that.inputs[0].type;
        //     },
        //     set: function(v) {
        //         if (v == "action" || v == "event") {
        //             v = LiteGraph.ACTION;
        //         }
        //         if (!LiteGraph.isValidConnection(that.inputs[0].type,v))
        // 			that.disconnectInput(0);
        //         that.inputs[0].type = v;
        //         if (that.name_in_graph) {
        //             //already added
        //             that.graph.changeOutputType(
        //                 that.name_in_graph,
        //                 that.inputs[0].type
        //             );
        //         }
        //         that.type_widget.value = v || "";
        //     },
        //     enumerable: true
        // });

        this.name_widget = this.addWidget(
            "text",
            "Name",
            this.properties.name,
            "name"
        );
        this.type_widget = this.addWidget(
            "text",
            "Type",
            this.properties.type,
            "type"
        );
        this.widgets_up = true;
        this.size = [180, 60];
    }

    onPropertyChanged(name, v) {
        if (name == "name") {
            if (v == "" || v == this.name_in_graph || v == "enabled") {
                return false;
            }
            if (this.graph) {
                if (this.name_in_graph) {
                    //already added
                    this.graph.renameOutput(this.name_in_graph, v);
                } else {
                    this.graph.addOutput(v, this.properties.type);
                }
            } //what if not?!
            this.name_widget.value = v;
            this.name_in_graph = v;
        } else if (name == "type") {
            this.updateType();
        } else if (name == "value") {
        }
    }

    updateType() {
        var type = this.properties.type;
        if (this.type_widget) this.type_widget.value = type;

        //update output
        if (this.inputs[0].type != type) {
            if (type == "action" || type == "event") type = LiteGraph.EVENT;
            if (!LiteGraph.isValidConnection(this.inputs[0].type, type))
                this.disconnectInput(0);
            this.inputs[0].type = type;
        }

        //update graph
        if (this.graph && this.name_in_graph) {
            this.graph.changeOutputType(this.name_in_graph, type);
        }
    }

    onExecute() {
        this._value = this.getInputData(0);
        this.graph.setOutputData(this.properties.name, this._value);
    }

    onAction(action, param) {
        if (this.properties.type == LiteGraph.ACTION) {
            this.graph.trigger(this.properties.name, param);
        }
    }

    onRemoved() {
        if (this.name_in_graph) {
            this.graph.removeOutput(this.name_in_graph);
        }
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.properties.name;
        }
        return this.title;
    }
}

class ConstantNumber extends LGraphNode {
    constructor() {
        super();

        this.addOutput("value", "number");
        this.addProperty("value", 1.0);
        this.widget = this.addWidget("number", "value", 1, "value");
        this.widgets_up = true;
        this.size = [180, 30];

        this.title = "Const Number";
        this.desc = "Constant number";
    }

    onExecute() {
        this.setOutputData(0, parseFloat(this.properties["value"]));
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.properties.value;
        }
        return this.title;
    }

    setValue(v) {
        this.setProperty("value", v);
    }

    onDrawBackground(ctx) {
        //show the current value
        this.outputs[0].label = this.properties["value"].toFixed(3);
    }
}

class ConstantBoolean extends LGraphNode {
    constructor() {
        super();

        this.addOutput("bool", "boolean");
        this.addProperty("value", true);
        this.widget = this.addWidget("toggle", "value", true, "value");
        this.serialize_widgets = true;
        this.widgets_up = true;
        this.size = [140, 30];

        this.title = "Const Boolean";
        this.desc = "Constant boolean";
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.properties.value;
        }
        return this.title;
    }

    setValue(v) {
        this.setProperty("value", v);
    }

    onExecute() {
        this.setOutputData(0, this.properties["value"]);
    }

    onGetInputs() {
        return [["toggle", LiteGraph.ACTION]];
    }

    onAction(action) {
        this.setValue(!this.properties.value);
    }
}

class ConstantString extends LGraphNode {
    constructor() {
        super();

        this.addOutput("string", "string");
        this.addProperty("value", "");
        this.widget = this.addWidget("text", "value", "", "value"); //link to property value
        this.widgets_up = true;
        this.size = [180, 30];

        this.title = "Const String";
        this.desc = "Constant string";
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.properties.value;
        }
        return this.title;
    }

    setValue(v) {
        this.setProperty("value", v);
    }

    onExecute() {
        this.setOutputData(0, this.properties["value"]);
    }

    onDropFile(file) {
        var that = this;
        var reader = new FileReader();
        reader.onload = function (e) {
            that.setProperty("value", e.target.result);
        };
        reader.readAsText(file);
    }
}

class ConstantObject extends LGraphNode {
    constructor() {
        super();

        this.addOutput("obj", "object");
        this.size = [120, 30];
        this._object = {};

        this.title = "Const Object";
        this.desc = "Constant Object";
    }

    onExecute() {
        this.setOutputData(0, this._object);
    }
}

class ConstantFile extends LGraphNode {
    static type = {
        type: "enum",
        values: ["text", "arraybuffer", "blob", "json"],
    };
    constructor() {
        super();

        this.addInput("url", "string");
        this.addOutput("file", "string");
        this.addProperty("url", "");
        this.addProperty("type", "text");
        this.widget = this.addWidget("text", "url", "", "url");
        this._data = null;

        ConstantFile.title = "Const File";
        ConstantFile.desc = "Fetches a file from an url";
    }

    setValue(v) {
        this.setProperty("value", v);
    }

    onPropertyChanged(name, value) {
        if (name == "url") {
            if (value == null || value == "") this._data = null;
            else {
                this.fetchFile(value);
            }
        }
    }

    onExecute() {
        var url = this.getInputData(0) || this.properties.url;
        if (url && (url != this._url || this._type != this.properties.type))
            this.fetchFile(url);
        this.setOutputData(0, this._data);
    }

    fetchFile(url) {
        var that = this;
        if (!url || url.constructor !== String) {
            that._data = null;
            that.boxcolor = null;
            return;
        }

        this._url = url;
        this._type = this.properties.type;
        if (url.substr(0, 4) == "http" && LiteGraph.proxy) {
            url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
        }
        fetch(url)
            .then(function (response) {
                if (!response.ok) throw new Error("File not found");

                if (that.properties.type == "arraybuffer")
                    return response.arrayBuffer();
                else if (that.properties.type == "text") return response.text();
                else if (that.properties.type == "json") return response.json();
                else if (that.properties.type == "blob") return response.blob();
            })
            .then(function (data) {
                that._data = data;
                that.boxcolor = "#AEA";
            })
            .catch(function (error) {
                that._data = null;
                that.boxcolor = "red";
                console.error("error fetching file:", url);
            });
    }

    onDropFile(file) {
        var that = this;
        this._url = file.name;
        this._type = this.properties.type;
        this.properties.url = file.name;
        var reader = new FileReader();
        reader.onload = function (e) {
            that.boxcolor = "#AEA";
            var v = e.target.result;
            if (that.properties.type == "json") v = JSON.parse(v);
            that._data = v;
        };
        if (that.properties.type == "arraybuffer")
            reader.readAsArrayBuffer(file);
        else if (
            that.properties.type == "text" ||
            that.properties.type == "json"
        )
            reader.readAsText(file);
        else if (that.properties.type == "blob")
            return reader.readAsBinaryString(file);
    }
}

class JSONParse extends LGraphNode {
    constructor() {
        super();

        this.addInput("parse", LiteGraph.ACTION);
        this.addInput("json", "string");
        this.addOutput("done", LiteGraph.EVENT);
        this.addOutput("object", "object");
        this.widget = this.addWidget(
            "button",
            "parse",
            "",
            this.parse.bind(this)
        );
        this._str = null;
        this._obj = null;

        this.title = "JSON Parse";
        this.desc = "Parses JSON String into object";
    }

    parse() {
        if (!this._str) return;

        try {
            this._str = this.getInputData(1);
            this._obj = JSON.parse(this._str);
            this.boxcolor = "#AEA";
            this.triggerSlot(0);
        } catch (err) {
            this.boxcolor = "red";
        }
    }

    onExecute() {
        this._str = this.getInputData(1);
        this.setOutputData(1, this._obj);
    }

    onAction(name) {
        if (name == "parse") this.parse();
    }
}

class ConstantData extends LGraphNode {
    constructor() {
        super();

        this.addOutput("data", "object");
        this.addProperty("value", "");
        this.widget = this.addWidget("text", "json", "", "value");
        this.widgets_up = true;
        this.size = [140, 30];
        this._value = null;

        this.title = "Const Data";
        this.desc = "Constant Data";
    }

    onPropertyChanged(name, value) {
        this.widget.value = value;
        if (value == null || value == "") {
            return;
        }

        try {
            this._value = JSON.parse(value);
            this.boxcolor = "#AEA";
        } catch (err) {
            this.boxcolor = "red";
        }
    }

    onExecute() {
        this.setOutputData(0, this._value);
    }

    setValue(v) {
        this.setProperty("value", v);
    }
}

class ConstantArray extends LGraphNode {
    constructor() {
        super();

        this._value = [];
        this.addInput("json", "");
        this.addOutput("arrayOut", "array");
        this.addOutput("length", "number");
        this.addProperty("value", "[]");
        this.widget = this.addWidget(
            "text",
            "array",
            this.properties.value,
            "value"
        );
        this.widgets_up = true;
        this.size = [140, 50];

        this.title = "Const Array";
        this.desc = "Constant Array";
    }

    onPropertyChanged(name, value) {
        this.widget.value = value;
        if (value == null || value == "") {
            return;
        }

        try {
            if (value[0] != "[") this._value = JSON.parse("[" + value + "]");
            else this._value = JSON.parse(value);
            this.boxcolor = "#AEA";
        } catch (err) {
            this.boxcolor = "red";
        }
    }

    onExecute() {
        var v = this.getInputData(0);
        if (v && v.length) {
            //clone
            if (!this._value) this._value = new Array();
            this._value.length = v.length;
            for (var i = 0; i < v.length; ++i) this._value[i] = v[i];
        }
        this.setOutputData(0, this._value);
        this.setOutputData(1, this._value ? this._value.length || 0 : 0);
    }

    setValue(v) {
        this.setProperty("value", v);
    }
}

class SetArray extends LGraphNode {
    constructor() {
        super();

        this.addInput("arr", "array");
        this.addInput("value", "");
        this.addOutput("arr", "array");
        this.properties = { index: 0 };
        this.widget = this.addWidget(
            "number",
            "i",
            this.properties.index,
            "index",
            { precision: 0, step: 10, min: 0 }
        );

        this.title = "Set Array";
        this.desc = "Sets index of array";
    }

    onExecute() {
        var arr = this.getInputData(0);
        if (!arr) return;
        var v = this.getInputData(1);
        if (v === undefined) return;
        if (this.properties.index) arr[Math.floor(this.properties.index)] = v;
        this.setOutputData(0, arr);
    }
}

class ArrayElement extends LGraphNode {
    constructor() {
        super();
        this.addInput("array", "array,table,string");
        this.addInput("index", "number");
        this.addOutput("value", "");
        this.addProperty("index", 0);

        this.title = "Array[i]";
        this.desc = "Returns an element from an array";
    }

    onExecute() {
        var array = this.getInputData(0);
        var index = this.getInputData(1);
        if (index == null) index = this.properties.index;
        if (array == null || index == null) return;
        this.setOutputData(0, array[Math.floor(Number(index))]);
    }
}

class TableElement extends LGraphNode {
    constructor() {
        super();

        this.addInput("table", "table");
        this.addInput("row", "number");
        this.addInput("col", "number");
        this.addOutput("value", "");
        this.addProperty("row", 0);
        this.addProperty("column", 0);

        this.title = "Table[row][col]";
        this.desc = "Returns an element from a table";
    }

    onExecute() {
        var table = this.getInputData(0);
        var row = this.getInputData(1);
        var col = this.getInputData(2);
        if (row == null) row = this.properties.row;
        if (col == null) col = this.properties.column;
        if (table == null || row == null || col == null) return;
        var row = table[Math.floor(Number(row))];
        if (row) this.setOutputData(0, row[Math.floor(Number(col))]);
        else this.setOutputData(0, null);
    }
}

class ObjectProperty extends LGraphNode {
    constructor() {
        super();
        this.addInput("obj", "object");
        this.addOutput("property", 0);
        this.addProperty("value", 0);
        this.widget = this.addWidget(
            "text",
            "prop.",
            "",
            this.setValue.bind(this)
        );
        this.widgets_up = true;
        this.size = [140, 30];
        this._value = null;

        this.title = "Object property";
        this.desc = "Outputs the property of an object";
    }

    setValue(v) {
        this.properties.value = v;
        this.widget.value = v;
    }

    getTitle() {
        if (this.flags.collapsed) {
            return "in." + this.properties.value;
        }
        return this.title;
    }

    onPropertyChanged(name, value) {
        this.widget.value = value;
    }

    onExecute() {
        var data = this.getInputData(0);
        if (data != null) {
            this.setOutputData(0, data[this.properties.value]);
        }
    }
}

class ObjectKeys extends LGraphNode {
    constructor() {
        super();

        this.addInput("obj", "");
        this.addOutput("keys", "array");
        this.size = [140, 30];

        this.title = "Object keys";
        this.desc = "Outputs an array with the keys of an object";
    }

    onExecute() {
        var data = this.getInputData(0);
        if (data != null) {
            this.setOutputData(0, Object.keys(data));
        }
    }
}

class SetObject extends LGraphNode {
    constructor() {
        super();

        this.addInput("obj", "");
        this.addInput("value", "");
        this.addOutput("obj", "");
        this.properties = { property: "" };
        this.name_widget = this.addWidget(
            "text",
            "prop.",
            this.properties.property,
            "property"
        );

        this.title = "Set Object";
        this.desc = "Adds propertiesrty to object";
    }

    onExecute() {
        var obj = this.getInputData(0);
        if (!obj) return;
        var v = this.getInputData(1);
        if (v === undefined) return;
        if (this.properties.property) obj[this.properties.property] = v;
        this.setOutputData(0, obj);
    }
}

class MergeObjects extends LGraphNode {
    constructor() {
        super();

        this.addInput("A", "object");
        this.addInput("B", "object");
        this.addOutput("out", "object");
        this._result = {};
        var that = this;
        this.addWidget("button", "clear", "", function () {
            that._result = {};
        });
        this.size = this.computeSize();

        this.title = "Merge Objects";
        this.desc = "Creates an object copying properties from others";
    }

    onExecute() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        var C = this._result;
        if (A) for (var i in A) C[i] = A[i];
        if (B) for (var i in B) C[i] = B[i];
        this.setOutputData(0, C);
    }
}

class Variable extends LGraphNode {
    staticLITEGRAPH = 0; //between all graphs
    staticGRAPH = 1; //only inside this graph
    staticGLOBALSCOPE = 2; //attached to Window

    static container = {
        type: "enum",
        values: {
            litegraph: Variable.LITEGRAPH,
            graph: Variable.GRAPH,
            global: Variable.GLOBALSCOPE,
        },
    };
    constructor() {
        super();

        this.size = [60, 30];
        this.addInput("in");
        this.addOutput("out");
        this.properties = { varname: "myname", container: Variable.LITEGRAPH };
        this.value = null;

        this.title = "Variable";
        this.desc = "store/read variable value";
    }

    onExecute() {
        var container = this.getContainer();

        if (this.isInputConnected(0)) {
            this.value = this.getInputData(0);
            container[this.properties.varname] = this.value;
            this.setOutputData(0, this.value);
            return;
        }

        this.setOutputData(0, container[this.properties.varname]);
    }

    getContainer() {
        switch (this.properties.container) {
            case Variable.GRAPH:
                if (this.graph) return this.graph.vars;
                return {};
                break;
            case Variable.GLOBALSCOPE:
                return global;
                break;
            case Variable.LITEGRAPH:
            default:
                return LiteGraph.Globals;
                break;
        }
    }

    getTitle() {
        return this.properties.varname;
    }
}

class DownloadData extends LGraphNode {
    constructor() {
        super();

        this.size = [60, 30];
        this.addInput("data", 0);
        this.addInput("download", LiteGraph.ACTION);
        this.properties = { filename: "data.json" };
        this.value = null;
        var that = this;
        this.addWidget("button", "Download", "", function (v) {
            if (!that.value) return;
            that.downloadAsFile();
        });

        this.title = "Download";
        this.desc = "Download some data";
    }

    downloadAsFile() {
        if (this.value == null) return;

        var str = null;
        if (this.value.constructor === String) str = this.value;
        else str = JSON.stringify(this.value);

        var file = new Blob([str]);
        var url = URL.createObjectURL(file);
        var element = document.createElement("a");
        element.setAttribute("href", url);
        element.setAttribute("download", this.properties.filename);
        element.style.display = "none";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        setTimeout(function () {
            URL.revokeObjectURL(url);
        }, 1000 * 60); //wait one minute to revoke url
    }

    onAction(action, param) {
        var that = this;
        setTimeout(function () {
            that.downloadAsFile();
        }, 100); //deferred to avoid blocking the renderer with the popup
    }

    onExecute() {
        if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.properties.filename;
        }
        return this.title;
    }
}

class Watch extends LGraphNode {
    constructor() {
        super();

        this.size = [60, 30];
        this.addInput("value", 0, { label: "" });
        this.value = 0;

        this.title = "Watch";
        this.desc = "Show value of input";
    }

    onExecute() {
        if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
    }

    getTitle() {
        if (this.flags.collapsed) {
            return this.inputs[0].label;
        }
        return this.title;
    }

    static toString(o) {
        if (o == null) {
            return "null";
        } else if (o.constructor === Number) {
            return o.toFixed(3);
        } else if (o.constructor === Array) {
            var str = "[";
            for (var i = 0; i < o.length; ++i) {
                str += Watch.toString(o[i]) + (i + 1 != o.length ? "," : "");
            }
            str += "]";
            return str;
        } else {
            return String(o);
        }
    }

    onDrawBackground(ctx) {
        //show the current value
        this.inputs[0].label = Watch.toString(this.value);
    }
}

class Cast extends LGraphNode {
    constructor() {
        super();

        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.size = [40, 30];

        this.title = "Cast";
        this.desc = "Allows to connect different types";
    }

    onExecute() {
        this.setOutputData(0, this.getInputData(0));
    }
}

class Console extends LGraphNode {
    constructor() {
        super();

        this.mode = LiteGraph.ON_EVENT;
        this.size = [80, 30];
        this.addProperty("msg", "");
        this.addInput("log", LiteGraph.EVENT);
        this.addInput("msg", 0);

        this.title = "Console";
        this.desc = "Show value inside the console";
    }

    onAction(action, param) {
        // param is the action
        var msg = this.getInputData(1); //getInputDataByName("msg");
        //if (msg == null || typeof msg == "undefined") return;
        if (!msg) msg = this.properties.msg;
        if (!msg) msg = "Event: " + param; // msg is undefined if the slot is lost?
        if (action == "log") {
            console.log(msg);
        } else if (action == "warn") {
            console.warn(msg);
        } else if (action == "error") {
            console.error(msg);
        }
    }

    onExecute() {
        var msg = this.getInputData(1); //getInputDataByName("msg");
        if (!msg) msg = this.properties.msg;
        if (msg != null && typeof msg != "undefined") {
            this.properties.msg = msg;
            console.log(msg);
        }
    }

    onGetInputs() {
        return [
            ["log", LiteGraph.ACTION],
            ["warn", LiteGraph.ACTION],
            ["error", LiteGraph.ACTION],
        ];
    }
}

class Alert extends LGraphNode {
    constructor() {
        super();

        this.mode = LiteGraph.ON_EVENT;
        this.addProperty("msg", "");
        this.addInput("", LiteGraph.EVENT);
        var that = this;
        this.widget = this.addWidget("text", "Text", "", "msg");
        this.widgets_up = true;
        this.size = [200, 30];

        this.title = "Alert";
        this.desc = "Show an alert window";
        this.color = "#510";
    }

    onConfigure(o) {
        this.widget.value = o.properties.msg;
    }

    onAction(action, param) {
        var msg = this.properties.msg;
        setTimeout(function () {
            alert(msg);
        }, 10);
    }
}

class NodeScript extends LGraphNode {
    constructor() {
        super();

        this.size = [60, 30];
        this.addProperty("onExecute", "return A;");
        this.addInput("A", 0);
        this.addInput("B", 0);
        this.addOutput("out", 0);

        this._func = null;
        this.data = {};

        this.title = "Script";
        this.desc = "executes a code (max 256 characters)";
        this.widgets_info = {
            onExecute: { type: "code" },
        };
    }

    onConfigure(o) {
        if (o.properties.onExecute && LiteGraph.allow_scripts)
            this.compileCode(o.properties.onExecute);
        else
            console.warn(
                "Script not compiled, LiteGraph.allow_scripts is false"
            );
    }

    onPropertyChanged(name, value) {
        if (name == "onExecute" && LiteGraph.allow_scripts)
            this.compileCode(value);
        else
            console.warn(
                "Script not compiled, LiteGraph.allow_scripts is false"
            );
    }

    compileCode(code) {
        this._func = null;
        if (code.length > 256) {
            console.warn("Script too long, max 256 chars");
        } else {
            var code_low = code.toLowerCase();
            var forbidden_words = [
                "script",
                "body",
                "document",
                "eval",
                "nodescript",
                "function",
            ]; //bad security solution
            for (var i = 0; i < forbidden_words.length; ++i) {
                if (code_low.indexOf(forbidden_words[i]) != -1) {
                    console.warn("invalid script");
                    return;
                }
            }
            try {
                this._func = new Function("A", "B", "C", "DATA", "node", code);
            } catch (err) {
                console.error("Error parsing script");
                console.error(err);
            }
        }
    }

    onExecute() {
        if (!this._func) {
            return;
        }

        try {
            var A = this.getInputData(0);
            var B = this.getInputData(1);
            var C = this.getInputData(2);
            this.setOutputData(0, this._func(A, B, C, this.data, this));
        } catch (err) {
            console.error("Error in script");
            console.error(err);
        }
    }

    onGetOutputs() {
        return [["C", ""]];
    }
}

class GenericCompare extends LGraphNode {
    static values = ["==", "!="]; //[">", "<", "==", "!=", "<=", ">=", "||", "&&" ];
    static OP = {
        type: "enum",
        title: "operation",
        values: GenericCompare.values,
    };
    constructor() {
        super();

        this.addInput("A", 0);
        this.addInput("B", 0);
        this.addOutput("true", "boolean");
        this.addOutput("false", "boolean");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", "==", "enum", { values: GenericCompare.values });
        this.addWidget("combo", "Op.", this.properties.OP, {
            property: "OP",
            values: GenericCompare.values,
        });

        this.size = [80, 60];

        this.title = "Compare *";
        this.desc = "evaluates condition between A and B";
    }

    getTitle() {
        return "*A " + this.properties.OP + " *B";
    }

    onExecute() {
        var A = this.getInputData(0);
        if (A === undefined) {
            A = this.properties.A;
        } else {
            this.properties.A = A;
        }

        var B = this.getInputData(1);
        if (B === undefined) {
            B = this.properties.B;
        } else {
            this.properties.B = B;
        }

        var result = false;
        if (typeof A == typeof B) {
            switch (this.properties.OP) {
                case "==":
                case "!=":
                    // traverse both objects.. consider that this is not a true deep check! consider underscore or other library for thath :: _isEqual()
                    result = true;
                    switch (typeof A) {
                        case "object":
                            var aProps = Object.getOwnPropertyNames(A);
                            var bProps = Object.getOwnPropertyNames(B);
                            if (aProps.length != bProps.length) {
                                result = false;
                                break;
                            }
                            for (var i = 0; i < aProps.length; i++) {
                                var propName = aProps[i];
                                if (A[propName] !== B[propName]) {
                                    result = false;
                                    break;
                                }
                            }
                            break;
                        default:
                            result = A == B;
                    }
                    if (this.properties.OP == "!=") result = !result;
                    break;
                /*case ">":
                    result = A > B;
                    break;
                case "<":
                    result = A < B;
                    break;
                case "<=":
                    result = A <= B;
                    break;
                case ">=":
                    result = A >= B;
                    break;
                case "||":
                    result = A || B;
                    break;
                case "&&":
                    result = A && B;
                    break;*/
            }
        }
        this.setOutputData(0, result);
        this.setOutputData(1, !result);
    }
}

// LiteGraph.wrapFunctionAsNode("basic/length", length, [""], "number");

// function length(v) {
//     if (v && v.length != null) return Number(v.length);
//     return 0;
// }

// LiteGraph.wrapFunctionAsNode(
//     "basic/not",
//     function (a) {
//         return !a;
//     },
//     [""],
//     "boolean"
// );

LiteGraph.registerNodeType("basic/time", Time);
LiteGraph.registerNodeType("graph/subgraph", Subgraph);
LiteGraph.registerNodeType("graph/input", GraphInput);
LiteGraph.registerNodeType("graph/output", GraphOutput);
LiteGraph.registerNodeType("basic/const", ConstantNumber);
LiteGraph.registerNodeType("basic/boolean", ConstantBoolean);
LiteGraph.registerNodeType("basic/string", ConstantString);
LiteGraph.registerNodeType("basic/object", ConstantObject);
LiteGraph.registerNodeType("basic/file", ConstantFile);
LiteGraph.registerNodeType("basic/jsonparse", JSONParse);
LiteGraph.registerNodeType("basic/data", ConstantData);
LiteGraph.registerNodeType("basic/array", ConstantArray);
LiteGraph.registerNodeType("basic/array[]", ArrayElement);
LiteGraph.registerNodeType("basic/set_array", SetArray);
LiteGraph.registerNodeType("basic/table[][]", TableElement);
LiteGraph.registerNodeType("basic/object_property", ObjectProperty);
LiteGraph.registerNodeType("basic/object_keys", ObjectKeys);
LiteGraph.registerNodeType("basic/set_object", SetObject);
LiteGraph.registerNodeType("basic/merge_objects", MergeObjects);
LiteGraph.registerNodeType("basic/variable", Variable);
LiteGraph.registerNodeType("basic/download", DownloadData);
LiteGraph.registerNodeType("basic/watch", Watch);
LiteGraph.registerNodeType("basic/cast", Cast);
LiteGraph.registerNodeType("basic/console", Console);
LiteGraph.registerNodeType("basic/alert", Alert);
LiteGraph.registerNodeType("basic/script", NodeScript);
LiteGraph.registerNodeType("basic/CompareValues", GenericCompare);
