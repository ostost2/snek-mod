"use strict";
/**
 * Basic implementation of storage sharing
 * Based on PowerGraph.java
 */

const MAX_CAPACITY = 100000;

let graphId = 0;
function StorageGraph() {
    this.queue = new Queue();
    this.closedSet = new IntSet();
    this.buildings = new Seq();
    this.items = new ItemModule();
    this.itemCapacity = 0;
    this.graphId = graphId++;

    this.hasCore = false;
    this.coreCapacity = 0; 
};
StorageGraph.prototype.getCapacity = function() {
    return Math.min(this.itemCapacity, MAX_CAPACITY);
};
StorageGraph.prototype.getTotalCapacity = function() {
    return Math.min(this.getCapacity() + this.coreCapacity, MAX_CAPACITY);
};
StorageGraph.prototype.add = function(entity) {
    if (entity.getGraph() != this) {
        this.buildings.add(entity);

        if (entity.getGraph() == null) {
            this.items.add(entity.items);
        }
        entity.setGraph(this);
        entity.items = this.items;

        if (entity instanceof CoreBlock.CoreBuild){
            if(!this.hasCore){ 
                this.hasCore = true;
                this.coreCapacity += entity.block.itemCapacity;
                
                Vars.state.teams.cores(entity.team).each(core => {
                    if(entity == core) return;

                    this.coreCapacity += core.block.itemCapacity;
                    
                    if (core.getGraph() != null) {
                        this.addGraph(core.getGraph());
                    } else {
                        this.reflow(core);
                    }
                });
            }
        } else {
            this.itemCapacity += entity.block.itemCapacity;
        }
        if(this.hasCore){
            Vars.state.teams.cores(entity.team).each(core => {
                core.storageCapacity = this.getTotalCapacity();
            });
        }
    }
};

StorageGraph.prototype.addGraph = function(graph) {
    if (graph == this) return;

    if (this.buildings.size < graph.buildings.size) {
        graph.addGraph(this);
        return;
    }

    this.items.add(graph.items);
    graph.buildings.each(b => {
        this.add(b);
    });
};

StorageGraph.prototype.reflow = function(entity) {
    this.queue.clear();
    this.queue.addLast(entity)
    this.closedSet.clear()
    while(this.queue.size > 0){
        var child = this.queue.removeFirst();
        this.add(child);
        child.getStorageConnections().each(next => {
            if(this.closedSet.add(next.pos())){
                this.queue.addLast(next);
            }
        });
    }
};

StorageGraph.prototype.remove = function(entity) {
    entity.getStorageConnections().each(other => {
        if(other.getGraph() != this) return;

        let graph = new StorageGraph();
        graph.add(other);

        this.queue.clear();
        this.queue.addLast(other);
        while(this.queue.size > 0){
            var child = this.queue.removeFirst();
            graph.add(child);
            child.getStorageConnections().each(next => {
                if(next != entity && next.getGraph() != graph){
                    graph.add(next)
                    this.queue.addLast(next);
                }
            });
        }
        
        let graphCap = graph.getTotalCapacity();
        let percent = graphCap / (this.getTotalCapacity() - entity.block.itemCapacity);
        Vars.content.items().each(item => {
            if(this.items.has(item)){
                graph.items.add(item, Math.min(this.items.get(item) * percent, graphCap))
            }
        });
    });
};

StorageGraph.prototype.handleItem = function(source, item) {
    if (this.items.get(item) < this.getTotalCapacity()) {
        this.items.add(item, 1);
    }
};
StorageGraph.prototype.acceptItem = function(source, item) {
    if (this.hasCore) return true;
    return this.items.get(item) < this.getTotalCapacity();
};
StorageGraph.prototype.acceptStack = function(item, amount, source) { 
    if(this.acceptItem(source, item)){
        return Math.min(this.getTotalCapacity() - this.items.get(item), amount);
    }else{
        return 0;
    }
};
StorageGraph.prototype.removeStack = function(item, amount) {
    let a = Math.min(amount, this.items.get(item));

    this.items.remove(item, a);
    return a;
};
StorageGraph.prototype.handleStack = function(item, amount, source) {
    let space = this.getTotalCapacity() - this.items.get(item);
    if (space > 0) {
        this.items.add(item, Math.min(amount, space));
    }
};
StorageGraph.prototype.getMaximumAccepted = function() { 
    return this.getTotalCapacity();
}

module.exports = StorageGraph;
