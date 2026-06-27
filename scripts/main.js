"use strict";
let {chainContainerBuilding, chainCoreBuilding} = require("chain_buildings");

Events.on(EventType.ClientLoadEvent, cons(e => {
    Vars.content.blocks().each(block => {
        if (block instanceof StorageBlock) {
            
            block.coreMerge = true;
            
            if (block instanceof CoreBlock) {
                block.buildType = chainCoreBuilding(block);
            } else {
                block.buildType = chainContainerBuilding(block);
            }
        }
    });
}));
