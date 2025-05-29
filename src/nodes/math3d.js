import { LGraphNode, LiteGraph, clamp } from "@/litegraph";
import { mat4, vec3, quat } from "gl-matrix/esm/index.js";

class Math3DMat4 extends LGraphNode {
    static temp_quat = new Float32Array([0, 0, 0, 1]);
    static temp_mat4 = new Float32Array(16);
    static temp_vec3 = new Float32Array(3);

    constructor() {
        super();

        this.title = "mat4";
        this.addInput("T", "vec3");
        this.addInput("R", "vec3");
        this.addInput("S", "vec3");
        this.addOutput("mat4", "mat4");
        this.properties = {
            T: [0, 0, 0],
            R: [0, 0, 0],
            S: [1, 1, 1],
            R_in_degrees: true,
        };
        this._result = mat4.create();
        this._must_update = true;
    }

    onPropertyChanged(name, value) {
        this._must_update = true;
    }

    onExecute() {
        var M = this._result;
        var Q = Math3DMat4.temp_quat;
        var temp_mat4 = Math3DMat4.temp_mat4;
        var temp_vec3 = Math3DMat4.temp_vec3;

        var T = this.getInputData(0);
        var R = this.getInputData(1);
        var S = this.getInputData(2);

        if (this._must_update || T || R || S) {
            T = T || this.properties.T;
            R = R || this.properties.R;
            S = S || this.properties.S;
            mat4.identity(M);
            mat4.translate(M, M, T);
            if (this.properties.R_in_degrees) {
                temp_vec3.set(R);
                vec3.scale(temp_vec3, temp_vec3, DEG2RAD);
                quat.fromEuler(Q, temp_vec3);
            } else quat.fromEuler(Q, R);
            mat4.fromQuat(temp_mat4, Q);
            mat4.multiply(M, M, temp_mat4);
            mat4.scale(M, M, S);
        }

        this.setOutputData(0, M);
    }
}

class Math3DOperation extends LGraphNode {
    static values = [
        "+",
        "-",
        "*",
        "/",
        "%",
        "^",
        "max",
        "min",
        "dot",
        "cross",
    ];

    static "@OP" = {
        type: "enum",
        title: "operation",
        values: Math3DOperation.values,
    };
    static size = [100, 60];

    constructor() {
        super();
        this.title = "Operation";
        this.desc = "Easy math 3D operators";

        this.addInput("A", "number,vec3");
        this.addInput("B", "number,vec3");
        this.addOutput("=", "number,vec3");
        this.addProperty("OP", "+", "enum", { values: Math3DOperation.values });
        this._result = vec3.create();
    }

    getTitle() {
        if (this.properties.OP == "max" || this.properties.OP == "min")
            return this.properties.OP + "(A,B)";
        return "A " + this.properties.OP + " B";
    }

    onExecute() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        if (A == null || B == null) return;
        if (A.constructor === Number) A = [A, A, A];
        if (B.constructor === Number) B = [B, B, B];

        var result = this._result;
        switch (this.properties.OP) {
            case "+":
                result = vec3.add(result, A, B);
                break;
            case "-":
                result = vec3.sub(result, A, B);
                break;
            case "x":
            case "X":
            case "*":
                result = vec3.mul(result, A, B);
                break;
            case "/":
                result = vec3.div(result, A, B);
                break;
            case "%":
                result[0] = A[0] % B[0];
                result[1] = A[1] % B[1];
                result[2] = A[2] % B[2];
                break;
            case "^":
                result[0] = Math.pow(A[0], B[0]);
                result[1] = Math.pow(A[1], B[1]);
                result[2] = Math.pow(A[2], B[2]);
                break;
            case "max":
                result[0] = Math.max(A[0], B[0]);
                result[1] = Math.max(A[1], B[1]);
                result[2] = Math.max(A[2], B[2]);
                break;
            case "min":
                result[0] = Math.min(A[0], B[0]);
                result[1] = Math.min(A[1], B[1]);
                result[2] = Math.min(A[2], B[2]);
                break;
            case "dot":
                result = vec3.dot(A, B);
                break;
            case "cross":
                vec3.cross(result, A, B);
                break;
            default:
                console.warn("Unknown operation: " + this.properties.OP);
        }
        this.setOutputData(0, result);
    }

    onDrawBackground(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        ctx.font = "40px Arial";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(
            this.properties.OP,
            this.size[0] * 0.5,
            (this.size[1] + LiteGraph.NODE_TITLE_HEIGHT) * 0.5
        );
        ctx.textAlign = "left";
    }
}

LiteGraph.registerSearchboxExtra("math3d/operation", "CROSS()", {
    properties: { OP: "cross" },
    title: "CROSS()",
});

LiteGraph.registerSearchboxExtra("math3d/operation", "DOT()", {
    properties: { OP: "dot" },
    title: "DOT()",
});

class Math3DVec3Scale extends LGraphNode {
    constructor() {
        super();

        this.addInput("in", "vec3");
        this.addInput("f", "number");
        this.addOutput("out", "vec3");
        this.properties = { f: 1 };
        this._data = new Float32Array(3);

        this.title = "vec3_scale";
        this.desc = "scales the components of a vec3";
    }

    onExecute() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        var f = this.getInputData(1);
        if (f == null) {
            f = this.properties.f;
        }

        var data = this._data;
        data[0] = v[0] * f;
        data[1] = v[1] * f;
        data[2] = v[2] * f;
        this.setOutputData(0, data);
    }
}

class Math3DVec3Length extends LGraphNode {
    constructor() {
        super();

        this.addInput("in", "vec3");
        this.addOutput("out", "number");

        this.title = "vec3_length";
        this.desc = "returns the module of a vector";
    }

    onExecute() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        var dist = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        this.setOutputData(0, dist);
    }
}

class Math3DVec3Normalize extends LGraphNode {
    constructor() {
        super();

        this.addInput("in", "vec3");
        this.addOutput("out", "vec3");
        this._data = new Float32Array(3);

        this.title = "vec3_normalize";
        this.desc = "returns the vector normalized";
    }

    onExecute() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        var dist = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        var data = this._data;
        data[0] = v[0] / dist;
        data[1] = v[1] / dist;
        data[2] = v[2] / dist;

        this.setOutputData(0, data);
    }
}

class Math3DVec3Lerp extends LGraphNode {
    constructor() {
        super();

        this.addInput("A", "vec3");
        this.addInput("B", "vec3");
        this.addInput("f", "vec3");
        this.addOutput("out", "vec3");
        this.properties = { f: 0.5 };
        this._data = new Float32Array(3);

        this.title = "vec3_lerp";
        this.desc = "returns the interpolated vector";
    }

    onExecute = function () {
        var A = this.getInputData(0);
        if (A == null) {
            return;
        }
        var B = this.getInputData(1);
        if (B == null) {
            return;
        }
        var f = this.getInputOrProperty("f");

        var data = this._data;
        data[0] = A[0] * (1 - f) + B[0] * f;
        data[1] = A[1] * (1 - f) + B[1] * f;
        data[2] = A[2] * (1 - f) + B[2] * f;

        this.setOutputData(0, data);
    };
}

class Math3DVec3Dot extends LGraphNode {
    constructor() {
        super();

        this.addInput("A", "vec3");
        this.addInput("B", "vec3");
        this.addOutput("out", "number");

        this.title = "vec3_dot";
        this.desc = "returns the dot product";
    }

    onExecute() {
        var A = this.getInputData(0);
        if (A == null) {
            return;
        }
        var B = this.getInputData(1);
        if (B == null) {
            return;
        }

        var dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
        this.setOutputData(0, dot);
    }
}

class Math3DQuaternion extends LGraphNode {
    constructor() {
        super();

        this.addOutput("quat", "quat");
        this.properties = { x: 0, y: 0, z: 0, w: 1, normalize: false };
        this._value = quat.create();

        this.title = "Quaternion";
        this.desc = "quaternion";
    }

    onExecute() {
        this._value[0] = this.getInputOrProperty("x");
        this._value[1] = this.getInputOrProperty("y");
        this._value[2] = this.getInputOrProperty("z");
        this._value[3] = this.getInputOrProperty("w");
        if (this.properties.normalize) {
            quat.normalize(this._value, this._value);
        }
        this.setOutputData(0, this._value);
    }

    onGetInputs() {
        return [
            ["x", "number"],
            ["y", "number"],
            ["z", "number"],
            ["w", "number"],
        ];
    }
}

class Math3DRotation extends LGraphNode {
    constructor() {
        super();

        this.addInputs([
            ["degrees", "number"],
            ["axis", "vec3"],
        ]);
        this.addOutput("quat", "quat");
        this.properties = { angle: 90.0, axis: vec3.fromValues(0, 1, 0) };

        this._value = quat.create();

        this.title = "Rotation";
        this.desc = "quaternion rotation";
    }

    onExecute() {
        var angle = this.getInputData(0);
        if (angle == null) {
            angle = this.properties.angle;
        }
        var axis = this.getInputData(1);
        if (axis == null) {
            axis = this.properties.axis;
        }

        var R = quat.setAxisAngle(this._value, axis, angle * 0.0174532925);
        this.setOutputData(0, R);
    }
}

class MathEulerToQuat extends LGraphNode {
    constructor() {
        super();

        this.addInput("euler", "vec3");
        this.addOutput("quat", "quat");
        this.properties = { euler: [0, 0, 0], use_yaw_pitch_roll: false };
        this._degs = vec3.create();
        this._value = quat.create();

        this.title = "Euler->Quat";
        this.desc = "Converts euler angles (in degrees) to quaternion";
    }

    onExecute() {
        var euler = this.getInputData(0);
        if (euler == null) {
            euler = this.properties.euler;
        }
        vec3.scale(this._degs, euler, DEG2RAD);
        if (this.properties.use_yaw_pitch_roll)
            this._degs = [this._degs[2], this._degs[0], this._degs[1]];
        var R = quat.fromEuler(this._value, this._degs);
        this.setOutputData(0, R);
    }
}

class MathQuatToEuler extends LGraphNode {
    constructor() {
        super();

        this.addInput(["quat", "quat"]);
        this.addOutput("euler", "vec3");
        this._value = vec3.create();

        this.title = "Euler->Quat";
        this.desc = "Converts rotX,rotY,rotZ in degrees to quat";
    }

    onExecute() {
        var q = this.getInputData(0);
        if (!q) return;
        var R = quat.toEuler(this._value, q);
        vec3.scale(this._value, this._value, DEG2RAD);
        this.setOutputData(0, this._value);
    }
}

class Math3DRotateVec3 extends LGraphNode {
    constructor() {
        super();

        this.addInputs([
            ["vec3", "vec3"],
            ["quat", "quat"],
        ]);
        this.addOutput("result", "vec3");
        this.properties = { vec: [0, 0, 1] };

        this.title = "Rot. Vec3";
        this.desc = "rotate a point";
    }

    onExecute() {
        var vec = this.getInputData(0);
        if (vec == null) {
            vec = this.properties.vec;
        }
        var quat = this.getInputData(1);
        if (quat == null) {
            this.setOutputData(vec);
        } else {
            this.setOutputData(0, vec3.transformQuat(vec3.create(), vec, quat));
        }
    }
}

class Math3DMultQuat extends LGraphNode {
    constructor() {
        super();

        this.addInputs([
            ["A", "quat"],
            ["B", "quat"],
        ]);
        this.addOutput("A*B", "quat");

        this._value = quat.create();

        this.title = "Mult. Quat";
        this.desc = "rotate quaternion";
    }

    onExecute() {
        var A = this.getInputData(0);
        if (A == null) {
            return;
        }
        var B = this.getInputData(1);
        if (B == null) {
            return;
        }

        var R = quat.multiply(this._value, A, B);
        this.setOutputData(0, R);
    }
}

class Math3DQuatSlerp extends LGraphNode {
    constructor() {
        super();

        this.addInputs([
            ["A", "quat"],
            ["B", "quat"],
            ["factor", "number"],
        ]);
        this.addOutput("slerp", "quat");
        this.addProperty("factor", 0.5);

        this._value = quat.create();

        this.title = "Quat Slerp";
        this.desc = "quaternion spherical interpolation";
    }

    onExecute() {
        var A = this.getInputData(0);
        if (A == null) {
            return;
        }
        var B = this.getInputData(1);
        if (B == null) {
            return;
        }
        var factor = this.properties.factor;
        if (this.getInputData(2) != null) {
            factor = this.getInputData(2);
        }

        var R = quat.slerp(this._value, A, B, factor);
        this.setOutputData(0, R);
    }
}

class Math3DRemapRange extends LGraphNode {
    constructor() {
        super();

        this.addInput("vec3", "vec3");
        this.addOutput("remap", "vec3");
        this.addOutput("clamped", "vec3");
        this.properties = {
            clamp: true,
            range_min: [-1, -1, 0],
            range_max: [1, 1, 0],
            target_min: [-1, -1, 0],
            target_max: [1, 1, 0],
        };
        this._value = vec3.create();
        this._clamped = vec3.create();

        this.title = "Remap Range";
        this.desc = "remap a 3D range";
    }

    onExecute() {
        var vec = this.getInputData(0);
        if (vec) this._value.set(vec);
        var range_min = this.properties.range_min;
        var range_max = this.properties.range_max;
        var target_min = this.properties.target_min;
        var target_max = this.properties.target_max;

        //swap to avoid errors
        /*
                if(range_min > range_max)
                {
                    range_min = range_max;
                    range_max = this.properties.range_min;
                }
    
                if(target_min > target_max)
                {
                    target_min = target_max;
                    target_max = this.properties.target_min;
                }
                */

        for (var i = 0; i < 3; ++i) {
            var r = range_max[i] - range_min[i];
            this._clamped[i] = clamp(
                this._value[i],
                range_min[i],
                range_max[i]
            );
            if (r == 0) {
                this._value[i] = (target_min[i] + target_max[i]) * 0.5;
                continue;
            }

            var n = (this._value[i] - range_min[i]) / r;
            if (this.properties.clamp) n = clamp(n, 0, 1);
            var t = target_max[i] - target_min[i];
            this._value[i] = target_min[i] + n * t;
        }

        this.setOutputData(0, this._value);
        this.setOutputData(1, this._clamped);
    }
}

LiteGraph.registerNodeType("math3d/remap_range", Math3DRemapRange);
LiteGraph.registerNodeType("math3d/mat4", Math3DMat4);
LiteGraph.registerNodeType("math3d/operation", Math3DOperation);
LiteGraph.registerNodeType("math3d/vec3-scale", Math3DVec3Scale);
LiteGraph.registerNodeType("math3d/vec3-length", Math3DVec3Length);
LiteGraph.registerNodeType("math3d/vec3-normalize", Math3DVec3Normalize);
LiteGraph.registerNodeType("math3d/vec3-lerp", Math3DVec3Lerp);
LiteGraph.registerNodeType("math3d/vec3-dot", Math3DVec3Dot);
LiteGraph.registerNodeType("math3d/quaternion", Math3DQuaternion);
LiteGraph.registerNodeType("math3d/rotation", Math3DRotation);
LiteGraph.registerNodeType("math3d/euler_to_quat", MathEulerToQuat);
LiteGraph.registerNodeType("math3d/quat_to_euler", MathQuatToEuler);
LiteGraph.registerNodeType("math3d/rotate_vec3", Math3DRotateVec3);
LiteGraph.registerNodeType("math3d/mult-quat", Math3DMultQuat);
LiteGraph.registerNodeType("math3d/quat-slerp", Math3DQuatSlerp);
