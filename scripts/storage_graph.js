"use strict";
/**
 * Basic implementation of storage sharing
 * Based on PowerGraph.java
 */
let graphId = 0;
function StorageGraph(self) {
    this.queue = new Queue();
    this.closedSet = new IntSet();
    this.buildings = new Seq();
    // evil hack
    this.items = new ItemModule();
    this.graphId = graphId++;
};
StorageGraph.prototype.getCapacity = function () {
    return this.buildings.reduce(0, (b, t) => b.block.itemCapacity + t)
};
StorageGraph.prototype.add = function (entity) {
    if (entity.getGraph() != this) {
        if (entity.getGraph() == null) {
            this.items.add(entity.items)
        }

        entity.setGraph(this);
        entity.items = this.items;
        this.buildings.add(entity);
    }
};
StorageGraph.prototype.addGraph = function (graph) {
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
StorageGraph.prototype.reflow = function (entity) {
    this.queue.clear();
    this.queue.addLast(entity)
    this.closedSet.clear()
    while(this.queue.size > 0){
        var child = this.queue.removeFirst();
        this.add(child);
        for(let next in child.getStorageConnections()){
            if(this.closedSet.add(next.pos())){
                this.queue.addLast(next);
            }
        }
    }
};
StorageGraph.prototype.remove = function (entity) {
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

        let graphCap = graph.getCapacity();
        let percent = graphCap / (this.getCapacity() - entity.block.itemCapacity);
        Vars.content.items().each(item => {
            if(this.items.has(item)){
                graph.items.add(item, Math.min(this.items.get(item) * percent, graphCap))
            }
        })
    });
};

module.exports = StorageGraph;