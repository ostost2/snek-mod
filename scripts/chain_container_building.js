"use strict";
/**
 * The extendable storage buildtype, extending building disallows connecting to core behavior (see https://github.com/Anuken/Mindustry/blob/2ad41a904753a47f6fb1a7b64dbea46204ce207e/core/src/mindustry/world/blocks/storage/CoreBlock.java#L788C1-L788C85 )
 * 
 */
let StorageGraph = require("storage_graph");
let chainContainerBuilding = () => extend(Building, {
    _storageGraph: null,
    getGraph() {
        return this._storageGraph;
    },
    setGraph(value) {
        this._storageGraph = value;
    },

    created() {

    },
    moduleBitmask() {
        return 1;
    },
    // TODO
    // pickedUp(){

    // },
    canPickup() {
        return false;
    },
    onProximityAdded() {
        this.updateStorageGraph();
    },
    onProximityRemoved() {
        if(this._storageGraph == null) return;
    
        this._storageGraph.remove(this);
    },

    canUnload() {
        // if(this._storageGraph == null){
        //     return this.super$canUnload();
        // }

        return this.super$canUnload();
    },
    acceptItem(source, item) {
        // if(this._storageGraph == null){
        //     return this.items.get(item) < this.getMaximumAccepted(item);
        // }

        return this.items.get(item) < this.getMaximumAccepted(item);
    },
    handleItem(source, item) {
        // if(this._storageGraph == null){
        //     this.super$handleItem(source, item);
        // }

        this.super$handleItem(source, item);
    },
    itemTaken(item) {
        // if(this._storageGraph == null){
        //     this.super$itemTaken(item);
        // }

        this.super$itemTaken(item);
    },
    removeStack(item, amount) {
        // if(this._storageGraph == null){
        //     return this.super$removeStack(item, amount);
        // }
        return this.super$removeStack(item, amount);
    },
    getMaximumAccepted(item) {
        if (this._storageGraph == null) {
            return this.block.itemCapacity;
        } else {
            return this._storageGraph.getCapacity();
        }
    },

    // explosionItemCap(){
    //     return this._storageGraph != null ? Math.min(this.itemCapacity/60, 6) : this.itemCapacity
    // },
    onDestroyed(){
        this.super$onDestroyed();

        if(this._storageGraph == null) return;

        let percent = this.block.itemCapacity / this._storageGraph.getCapacity();

        Vars.content.items().each(item => {
            if(this.items.has(item)){
                this.items.remove(item, this.items.get(item) * percent);
            }
        });
    },

    updateStorageGraph() {
        let con = this.getStorageConnections();

        con.each(other => {
            if (this._storageGraph == null) {
                let graph = new StorageGraph();
                graph.add(this);
            }
            if (other.getGraph() == null) {
                this._storageGraph.add(other);
            } else {
                this._storageGraph.addGraph(other.getGraph());
            }

        });
    },
    // TODO: do not create a new seq every time
    getStorageConnections() {
        return this.proximity.select(boolf(other => other != null && other.team == this.team && this.connectsStorageTo(other)));
    },
    connectsStorageTo(other) {
        return other.block.coreMerge && !(other.block instanceof CoreBlock);
    },

    // hack
    writeBase(write){
        let writeVisibility = Vars.state.rules.fog && this.visibleFlags != 0;

        write.f(this.health);
        write.b(this.rotation | 0b10000000);
        write.b(this.team.id);
        write.b(this.writeVisibility ? 4 : 3);
        write.b(this.enabled ? 1 : 0);

        write.b(this.moduleBitmask());

        // relevant code here
        let percent = this._storageGraph != null ? this.block.itemCapacity / this._storageGraph.getCapacity() : 1;
        let items = new ItemModule();
        Vars.content.items().each(item => {
            if(this.items.has(item)){
                items.add(item, this.items.get(item) * percent);
            }
        });
        items.write(write);

        // if(this.timeScale != 1){
        //     write.f(timeScale);
        //     write.f(timeScaleDuration);
        // }

        if(this.lastDisabler != null && this.lastDisabler.isValid()){
            write.i(this.lastDisabler.pos());
        }

        write.b(Mathf.clamp(this.efficiency) * 255);
        write.b(Mathf.clamp(this.optionalEfficiency) * 255);

        if(this.writeVisibility){
            write.l(this.visibleFlags);
        }
    },
});

module.exports = chainContainerBuilding;