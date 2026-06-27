"use strict";
let StorageGraph = require("storage_graph");

let chainMethods = {
    _storageGraph: null,
    getGraph() {
        return this._storageGraph;
    },
    setGraph(value) {
        this._storageGraph = value;
    },

    handleItem(source, item){
        if(this._storageGraph == null) {
            this.super$handleItem(source, item);
            return;
        }
        
        this._storageGraph.handleItem(source, item);
    },
    acceptItem(source, item){
        if(this._storageGraph == null) {
            return this.super$acceptItem(source, item);
        }

        return this._storageGraph.acceptItem(source, item);
    },
    acceptStack(item, amount, source){
        if(this._storageGraph == null) {
            return this.super$acceptStack(item, amount, source);
        }

        return this._storageGraph.acceptStack(item, amount, source);
    },
    removeStack(item, amount){
        if(this._storageGraph == null) {
            return this.super$removeStack(item, amount);
        }

        this.noSleep();
        return this._storageGraph.removeStack(item, amount);
    },
    handleStack(item, amount, source){
        if(this._storageGraph == null) {
            return this.super$handleStack(item, amount, source);
        }

        return this._storageGraph.handleStack(item, amount, source);
    },

    onProximityAdded() {
        this.updateStorageGraph();
    },
    onProximityRemoved() {
        if(this._storageGraph == null) return;

        this._storageGraph.remove(this);
    },
    updateStorageGraph() {
        if (this._storageGraph == null) {
            let graph = new StorageGraph();
            graph.add(this);
        }

        let con = this.getStorageConnections();
        con.each(other => {
            if (other.getGraph() == null) {
                this._storageGraph.add(other);
            } else {
                this._storageGraph.addGraph(other.getGraph());
            }
        });
    },

    getStorageConnections() {
        return this.proximity.select(boolf(other => other != null && other.team === this.team && this.connectsStorageTo(other)));
    },
    connectsStorageTo(other) {
        return other != null && typeof other.getGraph === 'function';
    },
    
    writeBase(write){
        let writeVisibility = Vars.state.rules.fog && this.visibleFlags != 0;

        write.f(this.health);
        write.b(this.rotation | 0b10000000);
        write.b(this.team.id);
        write.b(this.writeVisibility ? 4 : 3);
        write.b(this.enabled ? 1 : 0);

        write.b(this.moduleBitmask());

        let percent = 1;
        if(this._storageGraph != null){
            let storageCapacity = this.block.itemCapacity; 
            percent = storageCapacity / this._storageGraph.getTotalCapacity();
        }
        let items = new ItemModule();
        Vars.content.items().each(item => {
            if(this.items.has(item)){
                items.add(item, this.items.get(item) * percent);
            }
        });
        items.write(write);

        if(this.lastDisabler != null && this.lastDisabler.isValid()){
            write.i(this.lastDisabler.pos());
        }

        write.b(Mathf.clamp(this.efficiency) * 255);
        write.b(Mathf.clamp(this.optionalEfficiency) * 255);

        if(this.writeVisibility){
            write.l(this.visibleFlags);
        }
    },
};

let chainContainerBuilding = (block) => () => extend(StorageBlock.StorageBuild, block, Object.assign({}, chainMethods, {
    moduleBitmask() {
        return 1;
    },
    canPickup() {
        return false;
    },
    onDestroyed(){
        this.super$onDestroyed();

        if(this._storageGraph == null) return;

        let percent = this.block.itemCapacity / this._storageGraph.getTotalCapacity();
        
        Vars.content.items().each(item => {
            if(this.items.has(item)){
                let amount = this.items.get(item) * percent;

                if(this.team === Vars.state.rules.defaultTeam && Vars.state.isCampaign()){
                    Vars.state.rules.sector.info.handleCoreItem(item, -amount);
                }
                this.items.remove(item, amount);
            }
        });
    },

    getMaximumAccepted() {
        if(this._storageGraph != null) return this._storageGraph.getMaximumAccepted();

        return this.itemCapacity;
    },
}));

let chainCoreBuilding = (block) => () => extend(CoreBlock.CoreBuild, block, Object.assign({}, chainMethods, {
    onProximityUpdate(){
        this.super$onProximityUpdate(); 

        if(this._storageGraph != null) {
            Vars.state.teams.cores(this.team).each(core => {
                core.storageCapacity = this._storageGraph.getTotalCapacity();
            });
            return;
        }

        let graphCore = Vars.state.teams.cores(this.team).find(c => c != this && c.getGraph() != null);
        if(graphCore != null){
            let graph = new StorageGraph();
            graph.add(this);
            
            graphCore.getGraph().addGraph(graph);
        }
    },

    getMaximumAccepted() { 
        if(this._storageGraph != null) return this._storageGraph.getMaximumAccepted();

        return this.storageCapacity;
    }
}));

module.exports = {
    chainContainerBuilding: chainContainerBuilding,
    chainCoreBuilding: chainCoreBuilding,
}
