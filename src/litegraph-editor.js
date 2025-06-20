//Creates an interface to access extra features from a graph (like play, stop, live, etc)

import { LGraph, LGraphCanvas } from "@/litegraph.js";

export class Editor {
    constructor(container_id, options) {
        this.options = options || {};
        this.container_id = container_id;
    }

    async init() {
        //fill container
        let html =
            "<div class='header'><div class='tools tools-left'></div><div class='tools tools-right'></div></div>";
        html +=
            "<div class='content'><div class='editor-area'><canvas class='graphcanvas' width='1000' height='500' tabindex=10></canvas></div></div>";
        html +=
            "<div class='footer'><div class='tools tools-left'></div><div class='tools tools-right'></div></div>";

        const root = document.createElement("div");
        this.root = root;
        root.className = "litegraph litegraph-editor";
        root.innerHTML = html;

        this.tools = root.querySelector(".tools");
        this.content = root.querySelector(".content");
        this.footer = root.querySelector(".footer");

        const canvas = (this.canvas = root.querySelector(".graphcanvas"));
        this.canvas = canvas;
        //create graph
        this.graph = new LGraph();
        this.graphcanvas = new LGraphCanvas(canvas, this.graph, {
            useWebgl: false,
        });

        await this.graphcanvas._init(canvas);

        this.graphcanvas.links_render_mode = 0;
        this.graphcanvas.background_image = "/editor/imgs/grid.png";
        this.graph.onAfterExecute = () => {
            this.graphcanvas.draw(true);
        };

        this.graphcanvas.onDropItem = this.onDropItem.bind(this);

        //add stuff
        //this.addToolsButton("loadsession_button","Load","/editor/imgs/icon-load.png", this.onLoadButton.bind(this), ".tools-left" );
        //this.addToolsButton("savesession_button","Save","/editor/imgs/icon-save.png", this.onSaveButton.bind(this), ".tools-left" );
        this.addLoadCounter();
        this.addToolsButton(
            "playnode_button",
            "Play",
            "/editor/imgs/icon-play.png",
            this.onPlayButton.bind(this),
            ".tools-right"
        );
        this.addToolsButton(
            "playstepnode_button",
            "Step",
            "/editor/imgs/icon-playstep.png",
            this.onPlayStepButton.bind(this),
            ".tools-right"
        );

        if (!this.options.skip_livemode) {
            this.addToolsButton(
                "livemode_button",
                "Live",
                "/editor/imgs/icon-record.png",
                this.onLiveButton.bind(this),
                ".tools-right"
            );
        }
        if (!this.options.skip_maximize) {
            this.addToolsButton(
                "maximize_button",
                "",
                "/editor/imgs/icon-maximize.png",
                this.onFullscreenButton.bind(this),
                ".tools-right"
            );
        }
        if (this.options.miniwindow) {
            this.addMiniWindow(300, 200);
        }

        //append to DOM
        var parent = document.getElementById(this.container_id);
        if (parent) {
            parent.appendChild(root);
        }

        this.graphcanvas.resize();
        //graphcanvas.draw(true,true);
    }

    addLoadCounter() {
        let meter = document.createElement("div");
        meter.className = "headerpanel loadmeter toolbar-widget";

        let html =
            "<div class='cpuload'><strong>CPU</strong> <div class='bgload'><div class='fgload'></div></div></div>";
        html +=
            "<div class='gpuload'><strong>GFX</strong> <div class='bgload'><div class='fgload'></div></div></div>";

        meter.innerHTML = html;
        this.root.querySelector(".header .tools-left").appendChild(meter);

        const execution_time = this.graph.execution_time || 0;

        const self = this;
        setInterval(function () {
            meter.querySelector(".cpuload .fgload").style.width =
                2 * execution_time * 90 + "px";
            if (self.graph.status == LGraph.STATUS_RUNNING) {
                meter.querySelector(".gpuload .fgload").style.width =
                    self.graphcanvas.render_time * 10 * 90 + "px";
            } else {
                meter.querySelector(".gpuload .fgload").style.width = 4 + "px";
            }
        }, 200);
    }

    addToolsButton(id, name, icon_url, callback, container) {
        if (!container) {
            container = ".tools";
        }

        const button = this.createButton(name, icon_url, callback);
        button.id = id;
        this.root.querySelector(container).appendChild(button);
    }

    createButton(name, icon_url, callback) {
        const button = document.createElement("button");
        if (icon_url) {
            button.innerHTML = "<img src='" + icon_url + "'/> ";
        }
        button.classList.add("btn");
        button.innerHTML += name;
        if (callback) button.addEventListener("click", callback);
        return button;
    }

    onLoadButton() {
        const panel = this.graphcanvas.createPanel("Load session", {
            closable: true,
        });
        //TO DO

        this.root.appendChild(panel);
    }

    onSaveButton() {}

    onPlayButton() {
        const graph = this.graph;
        const button = this.root.querySelector("#playnode_button");

        if (graph.status == LGraph.STATUS_STOPPED) {
            button.innerHTML = "<img src='/editor/imgs/icon-stop.png'/> Stop";
            graph.start();
        } else {
            button.innerHTML = "<img src='/editor/imgs/icon-play.png'/> Play";
            graph.stop();
        }
    }

    onPlayStepButton() {
        const graph = this.graph;
        graph.runStep(1);
        this.graphcanvas.draw(true, true);
    }

    onLiveButton() {
        const is_live_mode = !this.graphcanvas.live_mode;
        this.graphcanvas.switchLiveMode(true);
        this.graphcanvas.draw();
        const url = this.graphcanvas.live_mode
            ? "/editor/imgs/gauss_bg_medium.jpg"
            : "/editor/imgs/gauss_bg.jpg";
        const button = this.root.querySelector("#livemode_button");
        button.innerHTML = !is_live_mode
            ? "<img src='/editor/imgs/icon-record.png'/> Live"
            : "<img src='/editor/imgs/icon-gear.png'/> Edit";
    }

    onDropItem(e) {
        const that = this;
        for (let i = 0; i < e.dataTransfer.files.length; ++i) {
            const file = e.dataTransfer.files[i];
            const ext = LGraphCanvas.getFileExtension(file.name);
            const reader = new FileReader();
            if (ext == "json") {
                reader.onload = function (event) {
                    const data = JSON.parse(event.target.result);
                    that.graph.configure(data);
                };
                reader.readAsText(file);
            }
        }
    }

    goFullscreen() {
        if (this.root.requestFullscreen) {
            this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (this.root.mozRequestFullscreen) {
            this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else if (this.root.webkitRequestFullscreen) {
            this.root.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        } else {
            throw "Fullscreen not supported";
        }

        const self = this;
        setTimeout(function () {
            self.graphcanvas.resize();
        }, 100);
    }

    onFullscreenButton() {
        this.goFullscreen();
    }

    addMiniWindow(w, h) {
        const miniwindow = document.createElement("div");
        miniwindow.className = "litegraph miniwindow";
        miniwindow.innerHTML =
            "<canvas class='graphcanvas' width='" +
            w +
            "' height='" +
            h +
            "' tabindex=10></canvas>";
        const canvas = miniwindow.querySelector("canvas");
        const that = this;

        const graphcanvas = new LGraphCanvas(canvas, this.graph);
        graphcanvas.show_info = false;
        graphcanvas.background_image = "/editor/imgs/grid.png";
        graphcanvas.scale = 0.25;
        graphcanvas.allow_dragnodes = false;
        graphcanvas.allow_interaction = false;
        graphcanvas.render_shadows = false;
        graphcanvas.max_zoom = 0.25;
        this.miniwindow_graphcanvas = graphcanvas;
        graphcanvas.onClear = function () {
            graphcanvas.scale = 0.25;
            graphcanvas.allow_dragnodes = false;
            graphcanvas.allow_interaction = false;
        };
        graphcanvas.onRenderBackground = function (canvas, ctx) {
            ctx.strokeStyle = "#567";
            let tl = that.graphcanvas.convertOffsetToCanvas([0, 0]);
            let br = that.graphcanvas.convertOffsetToCanvas([
                that.graphcanvas.canvas.width,
                that.graphcanvas.canvas.height,
            ]);
            tl = this.convertCanvasToOffset(tl);
            br = this.convertCanvasToOffset(br);
            ctx.lineWidth = 1;
            ctx.strokeRect(
                Math.floor(tl[0]) + 0.5,
                Math.floor(tl[1]) + 0.5,
                Math.floor(br[0] - tl[0]),
                Math.floor(br[1] - tl[1])
            );
        };

        miniwindow.style.position = "absolute";
        miniwindow.style.top = "4px";
        miniwindow.style.right = "4px";

        const close_button = document.createElement("div");
        close_button.className = "corner-button";
        close_button.innerHTML = "&#10060;";
        close_button.addEventListener("click", function (e) {
            graphcanvas.setGraph(null);
            miniwindow.parentNode.removeChild(miniwindow);
        });
        miniwindow.appendChild(close_button);

        this.root.querySelector(".content").appendChild(miniwindow);
    }

    async addMultiview() {
        const canvas = this.canvas;
        this.graphcanvas.background_image = "imgs/grid.png";
        this.graphcanvas.viewport = [
            0,
            0,
            canvas.width * 0.5 - 2,
            canvas.height,
        ];

        const graphcanvas = new LGraphCanvas(canvas, this.graph);
        await graphcanvas._init(canvas);
        graphcanvas.background_image = "imgs/grid.png";
        this.graphcanvas2 = graphcanvas;
        this.graphcanvas2.viewport = [
            canvas.width * 0.5,
            0,
            canvas.width * 0.5,
            canvas.height,
        ];

        this.graphcanvas.draw(true, true);
        this.graphcanvas2.draw(true, true);
    }

    subMultiview() {
        const canvas = this.canvas;
        this.graphcanvas.background_image = "imgs/grid.png";
        this.graphcanvas.viewport = [0, 0, canvas.width, canvas.height];
        this.graphcanvas2.viewport = [0, 0, 0, 0];
        this.graphcanvas.draw(true, true);
        this.graphcanvas2.draw(true, true);
    }
}
