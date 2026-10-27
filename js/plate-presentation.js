(function(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    else root.NomeraPlatePresentation=api;
})(typeof globalThis!=='undefined'?globalThis:this,()=>{
    'use strict';
    // One shared scene scale; never enlarge a shorter plate to fill the stage.
    const formats=Object.freeze({
        RUS:Object.freeze({width:520,height:112}),KZ:Object.freeze({width:520,height:112}),
        BY:Object.freeze({width:520,height:110}),
        USA:Object.freeze({width:304.8,height:152.4}),JPN:Object.freeze({width:330,height:165}),
        UAE:Object.freeze({width:520,height:110}) // depicted long, single-line format
    });
    function sceneScale(width,height){return Math.max(.05,Math.min(1.15,(width-28)/520,height/165));}
    return {formats,sceneScale};
});
